import { Image, StyleSheet, View } from "react-native";

// Same logo, size and colour as the native splash, so the handoff from splash
// to app doesn't visibly change.
export default function LoadingScreen() {
  return (
    <View style={styles.page}>
      <Image source={require("../../assets/images/splash-icon.png")} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#22D3EE", justifyContent: "center", alignItems: "center" },
  logo: { width: 300, height: 300 },
});
