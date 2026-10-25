import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";

// loading     -> first launch, still resolving the stored session / profile
// signedOut   -> no session (or a session whose profile is still being fetched)
// needsProfile-> signed in, but no name saved yet (onboarding)
// ready       -> signed in and onboarded
// error       -> signed in, but the profile lookup failed (network / bad token)
export type AuthStatus =
  | "loading"
  | "signedOut"
  | "needsProfile"
  | "ready"
  | "error";

type AuthContextValue = {
  status: AuthStatus;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

type Profile = { id: string; hasName: boolean; failed: boolean };

async function fetchProfile(id: string): Promise<Profile> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", id)
      .maybeSingle();
    if (error) console.log("Error loading profile:", error.message);
    return { id, hasName: !!data?.name?.trim(), failed: !!error };
  } catch (e: any) {
    console.log("Error loading profile:", e?.message);
    return { id, hasName: false, failed: true };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = not yet read from storage, null = signed out
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Result of the last profile lookup. Only ever set from async callbacks.
  const [profile, setProfile] = useState<Profile | null>(null);
  // Becomes true once the first lookup finishes, so later session changes
  // (e.g. just verified an OTP) don't flash the splash screen.
  const [booted, setBooted] = useState(false);

  const userId = session?.user.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setBooted(true);
    });
    // Callback must stay synchronous: awaiting supabase calls inside it can deadlock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setBooted(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Native apps must pause/resume token refresh with the app lifecycle.
  useEffect(() => {
    supabase.auth.startAutoRefresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      sub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchProfile(userId).then((next) => {
      if (cancelled) return;
      setProfile(next);
      setBooted(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    setProfile(await fetchProfile(userId));
    setBooted(true);
  }, [userId]);

  let status: AuthStatus;
  if (session === undefined) status = "loading";
  else if (session === null) status = "signedOut";
  else if (profile && profile.id === userId) {
    status = profile.failed ? "error" : profile.hasName ? "ready" : "needsProfile";
  }
  // Signed in but profile not fetched yet: splash before first boot, otherwise
  // stay on the current auth screen.
  else status = booted ? "signedOut" : "loading";

  return (
    <AuthContext.Provider value={{ status, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
