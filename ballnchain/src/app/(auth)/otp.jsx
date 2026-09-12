import { useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

export default function OTP() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleOtpChange = (text) => {
    const digitsOnly = text.replace(/\D/g, "").slice(0, 6);
    setOtp(digitsOnly);
    if (error) setError("");
  };

  const handleOTP = () => {
    setError("");
    if (otp.length !== 6) {
      setError("OTP must be exactly 6 digits.");
      return;
    }
    const { error } = supabase.auth.verifyOtp({
      type: "sms",
      token: otp,
    });
    if (error) {
      console.log("Error verifying OTP:", error.message);
      setError("Invalid OTP. Please try again.");
    } else {
      console.log("OTP verified successfully");
      router.push("/(tabs)/home");
    }
  };

  const isComplete = otp.length === 6;

  return (
    <Pressable style={styles.flexFill} onPress={Keyboard.dismiss}>
      <View style={styles.otpPage}>
        <View style={styles.header}>
          <Text style={styles.otpTitle}>Enter your One Time Password</Text>
          <Text style={styles.otpSubtitle}>Please enter your 6-digit code</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputCSS}
            placeholder="Enter the code"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={otp}
            onChangeText={handleOtpChange}
            maxLength={6}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <Pressable
          style={[styles.otpButton, !isComplete && styles.otpButtonDisabled]}
          onPress={handleOTP}
          disabled={!isComplete}
        >
          <Text style={styles.otpButtonText}>Continue</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flexFill: {
    flex: 1,
  },
  otpPage: {
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
  otpTitle: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 28,
    color: "#111827",
    textAlign: "center",
  },
  otpSubtitle: {
    fontFamily: "System",
    fontWeight: "500",
    fontSize: 15,
    color: "#6B7280",
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
    letterSpacing: 4,
    width: "100%",
    textAlign: "center",
  },
  errorText: {
    fontFamily: "System",
    color: "#DC2626",
    fontSize: 13,
    marginTop: 6,
  },
  otpButton: {
    width: "100%",
    height: 52,
    backgroundColor: "#111827",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  otpButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  otpButtonText: {
    fontFamily: "System",
    fontWeight: "600",
    color: "#FFFFFF",
    fontSize: 16,
  },
});
