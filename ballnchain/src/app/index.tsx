import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../lib/auth";

// The root layout already shows the splash/error states; this just routes by status.
export default function Index() {
  const { status } = useAuth();

  if (status === "ready") return <Redirect href="/home" />;
  if (status === "needsProfile") return <Redirect href="/onboarding" />;
  if (status === "signedOut") return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1, backgroundColor: "#22D3EE", justifyContent: "center" }}>
      <ActivityIndicator color="#FFFFFF" size="large" />
    </View>
  );
}
