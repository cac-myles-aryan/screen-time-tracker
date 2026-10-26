// Texts the accountability contact a one-time code (Twilio Verify). The
// session only ends when the caller enters it via confirm-end. Calling again
// while pending sends a fresh code.
//
// Deploy: supabase functions deploy request-end
import { createClient } from "npm:@supabase/supabase-js@2";
import { startVerify } from "../_shared/verify.ts";

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
  const { error: markError } = await admin
    .from("focus_sessions")
    .update({ end_request_status: "pending", end_requested_at: new Date().toISOString() })
    .eq("owner_id", session.owner_id)
    .eq("expiry_at", session.expiry_at);
  if (markError) return json({ error: markError.message }, 500);

  try {
    await startVerify(session.contact_phone);
  } catch (e) {
    await admin
      .from("focus_sessions")
      .update({ end_request_status: null, end_requested_at: null })
      .eq("owner_id", session.owner_id)
      .eq("expiry_at", session.expiry_at);
    return json({ error: `Couldn't text your contact: ${(e as Error).message}` }, 502);
  }
  return json({ requested: true });
});
