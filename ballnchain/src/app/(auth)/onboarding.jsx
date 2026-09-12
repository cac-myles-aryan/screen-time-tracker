import Filter from "bad-words";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const filter = new Filter();

  const handleNameChange = (text) => {
    setName(text);
    if (error) setError("");
  };

  const handleOnboarding = () => {
    if (name.trim().length === 0) {
      setError("Please enter your name.");
      return;
    }
    if (filter.isProfane(name)) {
      setError("That name isn't allowed. Please enter a different one.");
      return;
    }
    setError("");
    console.log("Name submitted:", name);
  };

  return (
    <View style={styles.onboardingCSS}>
      <View style={styles.header}>
        <Text style={styles.onboardingTitle}>Let's Get it Started</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.onboardingSubtitle}>
          Enter your name and first intitial
        </Text>
        <TextInput
          style={styles.inputCSS}
          placeholder="John D."
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={handleNameChange}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <Pressable style={styles.onboardingButton} onPress={handleOnboarding}>
        <Text style={styles.onboardingButtonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  onboardingCSS: {
    flex: 1,
    backgroundColor: "cyan",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  onboardingTitle: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 32,
    color: "#111827",
    textAlign: "center",
  },
  onboardingSubtitle: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 16,
    color: "#1F2937",
    marginTop: 8,
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    marginBottom: 20,
  },
  inputCSS: {
    fontFamily: "System",
    color: "#111827",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 15,
    width: "100%",
  },
  onboardingButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#111827",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  onboardingButtonText: {
    fontFamily: "System",
    fontWeight: "600",
    color: "#FFFFFF",
    fontSize: 16,
  },
  errorText: {
    fontFamily: "System",
    color: "#DC2626",
    fontSize: 13,
    marginTop: 6,
  },
});
