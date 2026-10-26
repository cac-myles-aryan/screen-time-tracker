import { Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AuthProvider, useAuth } from "../lib/auth";
import LoadingScreen from "../lib/LoadingScreen";
import { supabase } from "../lib/supabase";

function RootNavigator() {
  const { status, refreshProfile } = useAuth();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "error") {
    return (
      <View style={[styles.page, { gap: 16, paddingHorizontal: 24 }]}>
        <Text style={styles.message}>Couldn&apos;t load your account.</Text>
        <Pressable style={styles.button} onPress={refreshProfile}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
        <Pressable onPress={() => supabase.auth.signOut({ scope: "local" })}>
          <Text style={styles.link}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={status !== "ready"}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={status === "ready"}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#22D3EE",
    justifyContent: "center",
    alignItems: "center",
  },
  message: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
  button: {
    paddingHorizontal: 32,
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "800", color: "#0891B2" },
  link: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
});
