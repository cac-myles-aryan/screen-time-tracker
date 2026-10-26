// Twilio Verify helpers. Verify texts a one-time code from Twilio's own sender,
// so no TWILIO_FROM number is needed.
const base = () =>
  `https://verify.twilio.com/v2/Services/${Deno.env.get("TWILIO_VERIFY_SERVICE_SID")!}`;

const auth = () =>
  "Basic " + btoa(`${Deno.env.get("TWILIO_ACCOUNT_SID")!}:${Deno.env.get("TWILIO_AUTH_TOKEN")!}`);

async function call(path: string, params: Record<string, string>) {
  const res = await fetch(`${base()}/${path}`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const j = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: j as { status?: string; message?: string } };
}

// Throws on failure.
export async function startVerify(to: string) {
  const r = await call("Verifications", { To: to, Channel: "sms" });
  if (!r.ok) throw new Error(`SMS failed (${r.status})${r.body.message ? `: ${r.body.message}` : ""}`);
}

// true when the code is right; false when wrong; throws if the code expired
// or too many tries were made.
export async function checkVerify(to: string, code: string) {
  const r = await call("VerificationCheck", { To: to, Code: code });
  if (r.status === 404) throw new Error("That code expired. Request a new one.");
  if (r.status === 429) throw new Error("Too many tries. Request a new code.");
  if (!r.ok) throw new Error(`Couldn't check the code (${r.status})`);
  return r.body.status === "approved";
}
