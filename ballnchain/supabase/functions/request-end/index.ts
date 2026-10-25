// Texts the accountability contact a link to approve or deny ending the
// caller's focus session early. The session only ends when they approve.
//
// Deploy: supabase functions deploy request-end
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendSms } from "../_shared/sms.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: session, error } = await admin
    .from("focus_sessions")
    .select("owner_id, expiry_at, contact_name, contact_phone, end_request_status")
    .eq("owner_id", userData.user.id)
    .gt("expiry_at", new Date().toISOString())
    .order("expiry_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!session) return json({ error: "No active session" }, 400);
  if (session.end_request_status === "pending") {
    return json({ error: "A request is already waiting for an answer." }, 409);
  }

  const token = crypto.randomUUID() + crypto.randomUUID();
  const { data: claimed, error: claimError } = await admin
    .from("focus_sessions")
    .update({
      end_request_status: "pending",
      end_request_token_hash: await sha256Hex(token),
      end_requested_at: new Date().toISOString(),
    })
    .eq("owner_id", session.owner_id)
    .eq("expiry_at", session.expiry_at)
    .or("end_request_status.is.null,end_request_status.neq.pending")
    .select("owner_id");
  if (claimError) return json({ error: claimError.message }, 500);
  if (!claimed?.length) return json({ error: "A request is already waiting for an answer." }, 409);

  const { data: profile } = await admin
    .from("profiles")
    .select("name")
    .eq("id", session.owner_id)
    .maybeSingle();
  const who = profile?.name?.trim() || "Your friend";
  const hi = session.contact_name ? `Hi ${session.contact_name}, ` : "";
  const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/respond-end?token=${token}`;
  const body =
    `${hi}${who} is in a focus session on Ball and Chain and asked to end it early. ` +
    `You're their accountability contact.\n\nApprove: ${base}&action=approve\nDeny: ${base}&action=deny`;

  try {
    await sendSms(session.contact_phone, body);
  } catch (e) {
    await admin
      .from("focus_sessions")
      .update({ end_request_status: null, end_request_token_hash: null, end_requested_at: null })
      .eq("owner_id", session.owner_id)
      .eq("expiry_at", session.expiry_at);
    return json({ error: `Couldn't text your contact: ${(e as Error).message}` }, 502);
  }
  return json({ requested: true });
});
