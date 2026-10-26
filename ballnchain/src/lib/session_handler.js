import { supabase } from "./supabase";

// The signed-in user's unexpired session, or null.
export async function getMyActiveSession() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("focus_sessions")
    .select("expiry_at, focus_content, contact_name, contact_phone, end_request_status")
    .eq("owner_id", user.id)
    .gt("expiry_at", new Date().toISOString())
    .order("expiry_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Locks the signed-in user in until `endsAt`. `contactPhone` must already be
// E.164. Throws on failure so callers never silently "succeed".
export async function startSelfSession({ endsAt, focusContent, contactName, contactPhone }) {
  const minutes = (endsAt.getTime() - Date.now()) / 60000;
  if (!(minutes > 0 && minutes <= 1440)) {
    throw new Error("Duration must be between 1 and 1440 minutes.");
  }
  if (!contactPhone) throw new Error("Choose a contact to hold you accountable.");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("focus_sessions")
    .insert({
      owner_id: user.id,
      starter_id: user.id,
      expiry_at: endsAt.toISOString(),
      focus_content: focusContent?.trim() || null,
      contact_name: contactName?.trim() || null,
      contact_phone: contactPhone,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Asks the server to text the session's accountability contact that the user
// broke out early. Safe to call repeatedly: the server notifies once.
export async function reportTamper(reason) {
  const { data, error } = await supabase.functions.invoke("notify-contact", {
    body: { reason },
  });
  if (error) throw error;
  return data;
}

// Tells the server the app is still alive during a session.
export async function sendHeartbeat() {
  const { error } = await supabase.rpc("session_heartbeat");
  if (error) throw error;
}

// Texts the accountability contact a one-time code. The session only ends
// once confirmEndEarly() gets that code; calling this again sends a new one.
export async function requestEndEarly() {
  const { data, error } = await supabase.functions.invoke("request-end");
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    throw new Error(body?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// Ends the session if `code` matches the one texted to the contact by
// requestEndEarly().
export async function confirmEndEarly(code) {
  const { data, error } = await supabase.functions.invoke("confirm-end", { body: { code } });
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    throw new Error(body?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
