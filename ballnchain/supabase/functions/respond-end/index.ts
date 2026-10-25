// Opened from the link texted to the accountability contact. Approving ends
// the session now; denying keeps it going. Links are single-use.
//
// Deploy: supabase functions deploy respond-end --no-verify-jwt
// (the contact isn't signed in, so the gateway must not require a JWT).
import { createClient } from "npm:@supabase/supabase-js@2";

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

async function sha256Hex(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const action = url.searchParams.get("action");
  if (!token || (action !== "approve" && action !== "deny")) return text("Invalid link.", 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date().toISOString();
  const patch = action === "approve"
    ? { end_request_status: "approved", expiry_at: now, status: "finished", ended_early_at: now }
    : { end_request_status: "denied" };

  const { data, error } = await admin
    .from("focus_sessions")
    .update(patch)
    .eq("end_request_token_hash", await sha256Hex(token))
    .eq("end_request_status", "pending")
    .gt("expiry_at", now)
    .select("owner_id");
  if (error) return text("Something went wrong. Try the link again.", 500);
  if (!data?.length) return text("This request was already answered or has expired.", 410);

  return text(
    action === "approve"
      ? "Approved. Their focus session has ended."
      : "Denied. They're staying focused.",
  );
});
