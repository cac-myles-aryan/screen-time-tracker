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
import { Phone } from "phosphor-react-native";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

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
          <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
            <Phone
              size={20}
              color={focused ? "#0891B2" : "#94A3B8"}
              weight="bold"
            />
            <TextInput
              style={styles.inputCSS}
              placeholder="Enter your phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={phoneNumber}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChangeText={(e) => {
                setPhoneNumber(formatPhone(e));
                if (error) setError("");
              }}
            />
          </View>
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
  loginTitle: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1.5,
    textAlign: "center",
  },
  loginSubtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    gap: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  inputWrapperFocused: {
    borderColor: "#0891B2",
  },
  inputCSS: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#0E7490",
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
  loginButton: {
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
  loginButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.35)",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0891B2",
    letterSpacing: 0.2,
  },
});