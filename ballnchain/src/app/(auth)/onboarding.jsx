import { useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { refreshProfile } = useAuth();

  const handleNameChange = (text) => {
    setName(text);
    if (error) setError("");
  };

  const handleOnboarding = async () => {
    if (loading) return;
    if (name.trim().length === 0) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Session error. Please log in again.");
        return;
      }

      const phone = user.phone
        ? user.phone.startsWith("+")
          ? user.phone
          : `+${user.phone}`
        : null;

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, name: name.trim(), phone_number: phone });
      if (updateError) {
        console.log("Error updating profile:", updateError.message);
        setError(`Couldn't save profile: ${updateError.message}`);
        return;
      }

      // Flips the auth status to "ready"; the route guards then move us to home.
      await refreshProfile();
    } catch (e) {
      console.log("Error updating profile:", e?.message);
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.onboardingCSS} onPress={Keyboard.dismiss}>
      <View style={styles.header}>
        <Text style={styles.onboardingTitle}>Let&apos;s Get Started</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.onboardingSubtitle}>
          Enter your first name and last initial
        </Text>
        <TextInput
          style={styles.inputCSS}
          placeholder="John D."
          placeholderTextColor="#9CA3AF"
          value={name}
          autoCapitalize="words"
          maxLength={40}
          onChangeText={handleNameChange}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <Pressable
        style={[styles.onboardingButton, loading && { opacity: 0.6 }]}
        onPress={handleOnboarding}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0891B2" />
        ) : (
          <Text style={styles.onboardingButtonText}>Continue</Text>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  onboardingCSS: {
    flex: 1,
    backgroundColor: "#22D3EE",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 32,
  },
  header: {
    alignItems: "center",
    gap: 6,
  },
  onboardingTitle: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1.5,
    textAlign: "center",
  },
  onboardingSubtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    gap: 10,
  },
  inputCSS: {
    height: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 18,
    fontSize: 18,
    fontWeight: "600",
    color: "#0E7490",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  onboardingButton: {
    width: "100%",
    height: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  onboardingButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0891B2",
    letterSpacing: 0.2,
  },
  errorText: {
    fontSize: 13,
    color: "#FFF",
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: "center",
    overflow: "hidden",
  },
});