import { useState } from "react";
import { getPendingPhone } from "../../lib/authState";
import { supabase } from "../../lib/supabase";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";


export default function OTP() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const phone = getPendingPhone();

  const handleOtpChange = (text) => {
    const digitsOnly = text.replace(/\D/g, "").slice(0, 6);
    setOtp(digitsOnly);
    if (error) setError("");
  };

  const handleOTP = async () => {
    if (loading) return;
    setError("");
    if (otp.length !== 6) {
      setError("OTP must be exactly 6 digits.");
      return;
    }
    if (!phone) {
      setError("Session expired. Please go back and enter your number.");
      return;
    }
    setLoading(true);
    // On success the auth provider picks up the new session and routes to
    // onboarding or home, so there is nothing to navigate to here.
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone,
        type: "sms",
        token: otp,
      });
      if (error) {
        console.log("Error verifying OTP:", error.message);
        setError("Invalid or expired code. Please try again.");
      }
    } catch (e) {
      console.log("Error verifying OTP:", e?.message);
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const isComplete = otp.length === 6 && !loading;

  return (
    <Pressable style={styles.flexFill} onPress={Keyboard.dismiss}>
      <View style={styles.otpPage}>
        <View style={styles.header}>
          <Text style={styles.otpTitle}>Check your text</Text>
          <Text style={styles.otpSubtitle}>Enter the 6-digit code we sent you</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.inputCSS, focused && styles.inputCSSFocused]}
            placeholder="000000"
            placeholderTextColor="#b1b1b1"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            keyboardAppearance="light"
            value={otp}
            onChangeText={handleOtpChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={6}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <Pressable
          style={[styles.otpButton, !isComplete && styles.otpButtonDisabled]}
          onPress={handleOTP}
          disabled={!isComplete}
        >
          {loading ? (
            <ActivityIndicator color="#0891B2" />
          ) : (
            <Text style={[styles.otpButtonText, !isComplete && styles.otpButtonTextDisabled]}>
              Verify
            </Text>
          )}
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
  otpTitle: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1.5,
    textAlign: "center",
  },
  otpSubtitle: {
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
    paddingHorizontal: 22,
    fontSize: 24,
    fontWeight: "700",
    color: "#0E7490",
    letterSpacing: 8,
    textAlign: "center",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  inputCSSFocused: {
    borderColor: "#0891B2",
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
  otpButton: {
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
  otpButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.35)",
    shadowOpacity: 0,
    elevation: 0,
  },
  otpButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0891B2",
    letterSpacing: 0.2,
  },
  otpButtonTextDisabled: {
    color: "rgba(255,255,255,0.5)",
  },
});