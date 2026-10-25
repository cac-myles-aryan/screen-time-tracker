// Texts the contact of every running session whose heartbeat has gone quiet
// (app killed or deleted). Schedule it every few minutes with pg_cron or the
// Supabase dashboard; call it with the service-role key as the bearer token.
//
// STALE_MINUTES must exceed the longest stretch a user can legitimately leave
// the app closed (a phone in a drawer sends no heartbeat), or you will text
// contacts about people who did nothing wrong. There is no default on purpose.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendSms } from "../_shared/sms.ts";

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return new Response("Forbidden", { status: 403 });
  }
  const staleMinutes = Number(Deno.env.get("STALE_MINUTES"));
  if (!(staleMinutes > 0)) {
    return new Response("STALE_MINUTES is not set", { status: 500 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const cutoff = new Date(Date.now() - staleMinutes * 60000).toISOString();
  const { data: sessions, error } = await admin
    .from("focus_sessions")
    .select("owner_id, expiry_at, contact_name, contact_phone")
    .gt("expiry_at", new Date().toISOString())
    .lt("heartbeat_at", cutoff)
    .is("tamper_notified_at", null);
  if (error) return new Response(error.message, { status: 500 });

  let notified = 0;
  for (const s of sessions ?? []) {
    const { data: claimed } = await admin
      .from("focus_sessions")
      .update({ tamper_notified_at: new Date().toISOString(), tamper_reason: "heartbeat_lost" })
      .eq("owner_id", s.owner_id)
      .eq("expiry_at", s.expiry_at)
      .is("tamper_notified_at", null)
      .select("owner_id");
    if (!claimed?.length) continue;

    const { data: profile } = await admin
      .from("profiles").select("name").eq("id", s.owner_id).maybeSingle();
    const who = profile?.name?.trim() || "Your friend";
    const hi = s.contact_name ? `Hi ${s.contact_name}, ` : "";
    try {
      await sendSms(
        s.contact_phone,
        `${hi}${who} is in a Ball and Chain focus session and their app has gone silent, which may mean they removed it. You're their accountability contact.`,
      );
      notified++;
    } catch {
      await admin
        .from("focus_sessions")
        .update({ tamper_notified_at: null, tamper_reason: null })
        .eq("owner_id", s.owner_id)
        .eq("expiry_at", s.expiry_at);
    }
  }
  return Response.json({ checked: sessions?.length ?? 0, notified });
});
