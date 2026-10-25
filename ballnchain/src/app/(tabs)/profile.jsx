import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return setLoading(false);
        const { data } = await supabase
          .from("profiles")
          .select("name, phone_number")
          .eq("id", user.id)
          .maybeSingle();
        setProfile({ name: data?.name, phone: data?.phone_number ?? user.phone });
        setLoading(false);
      })();
    }, []),
  );

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // On success the auth provider sees the session end and routes to login.
    if (error) Alert.alert("Couldn't sign out", error.message);
  };

  return (
    <View style={[styles.page, { paddingBottom: 24 }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Profile</Text>
      </View>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.name || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.name || "Unnamed"}</Text>
          <Text style={styles.phone}>{profile?.phone ? `${profile.phone.startsWith("+") ? "" : "+"}${profile.phone}` : ""}</Text>
        </View>
      )}
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#22D3EE", paddingHorizontal: 24, gap: 24 },
  header: { paddingTop: 64 },
  title: { fontWeight: "900", fontSize: 52, color: "#FFFFFF", letterSpacing: -1.5 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 6,
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ECFEFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: { color: "#0891B2", fontWeight: "800", fontSize: 28 },
  name: { fontWeight: "800", fontSize: 20, color: "#0F172A" },
  phone: { fontSize: 14, color: "#94A3B8" },
  button: {
    height: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 17, fontWeight: "800", color: "#0891B2" },
});
