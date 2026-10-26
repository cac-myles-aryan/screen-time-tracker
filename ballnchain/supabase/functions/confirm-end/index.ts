// Ends the caller's focus session early when they enter the code their
// accountability contact received from request-end.
//
// Deploy: supabase functions deploy confirm-end
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkVerify } from "../_shared/verify.ts";

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

  const code = String((await req.json().catch(() => ({}))).code ?? "").trim();
  if (!/^\d{4,10}$/.test(code)) return json({ error: "Enter the code your contact received." }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: session, error } = await admin
    .from("focus_sessions")
    .select("owner_id, expiry_at, contact_phone, end_request_status")
    .eq("owner_id", userData.user.id)
    .gt("expiry_at", new Date().toISOString())
    .order("expiry_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!session) return json({ error: "No active session" }, 400);
  if (session.end_request_status !== "pending") {
    return json({ error: "Request a code from your contact first." }, 409);
  }

  let ok: boolean;
  try {
    ok = await checkVerify(session.contact_phone, code);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
  if (!ok) return json({ error: "That code is wrong." }, 400);

  const now = new Date().toISOString();
  const { error: endError } = await admin
    .from("focus_sessions")
    .update({ end_request_status: "approved", expiry_at: now, status: "finished", ended_early_at: now })
    .eq("owner_id", session.owner_id)
    .eq("expiry_at", session.expiry_at);
  if (endError) return json({ error: endError.message }, 500);
  return json({ ended: true });
});
