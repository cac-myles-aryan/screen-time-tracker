import { Stack } from "expo-router";
import { useAuth } from "../../lib/auth";

export default function AuthLayout() {
  const { status } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="login" />
        <Stack.Screen name="otp" />
      </Stack.Protected>
      <Stack.Protected guard={status === "needsProfile"}>
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}
