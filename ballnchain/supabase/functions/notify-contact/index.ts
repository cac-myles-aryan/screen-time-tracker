// Texts a user's accountability contact when they break their own focus
// session (Screen Time access revoked / shield dropped before expiry).
//
// Deploy:  supabase functions deploy notify-contact
// Secrets: supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM=+1...
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendSms } from "../_shared/sms.ts";

const REASONS = new Set(["authorization_revoked", "shield_dropped"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Not signed in" }, 401);

  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) return json({ error: "Not signed in" }, 401);

  const { reason } = await req.json().catch(() => ({}));
  if (!REASONS.has(reason)) {
    return json({ error: "Bad request" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: session, error } = await admin
    .from("focus_sessions")
    .select("owner_id, expiry_at, contact_name, contact_phone, tamper_notified_at")
    .eq("owner_id", userData.user.id)
    .gt("expiry_at", new Date().toISOString())
    .order("expiry_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!session) return json({ skipped: "no active session" });

  // Claim the notification first so concurrent calls can't double-text.
  const { data: claimed, error: claimError } = await admin
    .from("focus_sessions")
    .update({ tamper_notified_at: new Date().toISOString(), tamper_reason: reason })
    .eq("owner_id", session.owner_id)
    .eq("expiry_at", session.expiry_at)
    .is("tamper_notified_at", null)
    .select("owner_id");
  if (claimError) return json({ error: claimError.message }, 500);
  if (!claimed?.length) return json({ skipped: "already notified" });

  const { data: profile } = await admin
    .from("profiles")
    .select("name")
    .eq("id", session.owner_id)
    .maybeSingle();
  const who = profile?.name?.trim() || "Your friend";
  const hi = session.contact_name ? `Hi ${session.contact_name}, ` : "";
  const body = `${hi}${who} locked themselves in a focus session on Ball and Chain and just broke out of it early. You're their accountability contact.`;

  try {
    await sendSms(session.contact_phone, body);
  } catch (e) {
    // Release the claim so a later report can retry.
    await admin
      .from("focus_sessions")
      .update({ tamper_notified_at: null, tamper_reason: null })
      .eq("owner_id", session.owner_id)
      .eq("expiry_at", session.expiry_at);
    return json({ error: (e as Error).message }, 502);
  }
  return json({ notified: true });
});
