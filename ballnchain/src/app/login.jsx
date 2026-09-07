import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");

  function isValidPhoneNumber(number) {
    return /^\d{10}$/.test(number.replace(/\D/g, ""));
  }

  async function handleLogin() {
    if (!isValidPhoneNumber(phoneNumber)) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setError("");

    const { error } = await supabase.auth.signInWithOtp({ phone: phoneNumber });

    if (error) {
      console.log("Error sending OTP:", error.message);
      setError("Something went wrong. Please try again.");
    } else {
      console.log("OTP sent successfully");
      router.push("/verify");
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.loginPage}>
        <View style={styles.header}>
          <Text style={styles.loginTitle}>Ball and Chain</Text>
          <Text style={styles.loginSubtitle}>Proceed with Phone Number</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputCSS}
            placeholder="Enter your phone number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              if (error) setError("");
            }}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <Pressable style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Continue</Text>
        </Pressable>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  loginPage: {
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
  loginTitle: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 32,
    color: "#111827",
    textAlign: "center",
  },
  loginSubtitle: {
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
  errorText: {
    fontFamily: "System",
    color: "#DC2626",
    fontSize: 13,
    marginTop: 6,
  },
  loginButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#111827",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    fontFamily: "System",
    fontWeight: "600",
    color: "#FFFFFF",
    fontSize: 16,
  },
});
