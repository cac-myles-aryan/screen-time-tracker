import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth";
import LoadingScreen from "../lib/LoadingScreen";

// The root layout already shows the splash/error states; this just routes by status.
export default function Index() {
  const { status } = useAuth();

  if (status === "ready") return <Redirect href="/home" />;
  if (status === "needsProfile") return <Redirect href="/onboarding" />;
  if (status === "signedOut") return <Redirect href="/login" />;

  return <LoadingScreen />;
}
