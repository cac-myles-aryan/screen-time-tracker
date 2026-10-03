import supabase from "@supabase/supabase-js";

const { data: { user }, error } = await supabase.auth.getUser();

function addMinutesToDate(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}



export async function newFocusSession(owner_id, duration, focus_content) {
    const { data, error } = await supabase.from("focus_sessions").insert({ owner_id: owner_id, starter_id: user.id, expiry_at: addMinutesToDate(date.now(), duration), focus_content: focus_content });
}
