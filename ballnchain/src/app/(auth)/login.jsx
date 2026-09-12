import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");

  function formatPhone(number) {
    const numbers = number.replace(/\D/g, "");

    const formattedNumber = numbers.replace(
      /(\d{3})(\d{3})(\d{4})/,
      "($1) $2-$3",
    );
    return formattedNumber;
  }

  const isValidPhone = /^\(\d{3}\) \d{3}-\d{4}$/.test(phoneNumber);

  async function handleLogin() {
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber.replace(/^\((\d{3})\)\s*(\d{3})-(\d{4})$/, "+1$1$2$3"),
    });

    if (error) {
      console.log("Error sending OTP:", error.message);
      setError("Something went wrong. Please try again.");
    } else {
      console.log("OTP sent successfully");
      router.push("/otp");
    }
  }

  return (
    <Pressable onPress={Keyboard.dismiss} style={styles.flexFill}>
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
            onChangeText={(e) => {
              setPhoneNumber(formatPhone(e));
              if (error) setError("");
            }}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <Pressable
          style={[
            styles.loginButton,
            !isValidPhone && styles.loginButtonDisabled,
          ]}
          onPress={handleLogin}
          disabled={!isValidPhone}
        >
          <Text style={styles.loginButtonText}>Continue</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flexFill: {
    flex: 1,
  },
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
    fontSize: 28,
    color: "#111827",
    textAlign: "center",
  },
  loginSubtitle: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 15,
    color: "#1F2937",
    marginTop: 8,
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    marginBottom: 24,
  },
  inputCSS: {
    fontFamily: "System",
    color: "#111827",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    width: "100%",
    textAlign: "center",
  },
  errorText: {
    fontFamily: "System",
    color: "#DC2626",
    fontSize: 13,
    marginTop: 6,
  },
  loginButton: {
    width: "100%",
    height: 52,
    backgroundColor: "#111827",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonDisabled: {
    backgroundColor: "#6B7280",
  },
  loginButtonText: {
    fontFamily: "System",
    fontWeight: "600",
    color: "#FFFFFF",
    fontSize: 16,
  },
});
