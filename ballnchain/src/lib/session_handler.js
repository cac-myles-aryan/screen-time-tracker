import supabase from "@supabase/supabase-js";

export function createFocusSessionHandler(owner_id) {}
const { data, error } = await supabase.from("focus_sessions").insert({});
