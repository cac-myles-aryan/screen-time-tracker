import { StyleSheet } from "react-native";
//import Home from "./(tabs)/home";
import Login from "./(auth)/login";
import OTP from "./(auth)/otp";

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/home" />;
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
