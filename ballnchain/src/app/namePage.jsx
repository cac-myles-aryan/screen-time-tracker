import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function Login() {
  return (
    <View style={styles.namePageCSS}>
      <View style={styles.header}>
        <Text style={styles.namePageTitle}>Let's Get it Started</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.namePageSubtitle}>
          Enter your name and first intitial
        </Text>
        <TextInput
          style={styles.inputCSS}
          placeholder="John D."
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <Pressable style={styles.namePageButton} onPress={handlenamePage}>
        <Text style={styles.namePageButtonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  namePageCSS: {
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
  namePageTitle: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 32,
    color: "#111827",
    textAlign: "center",
  },
  namePageSubtitle: {
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
  namePageButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#111827",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  namePageButtonText: {
    fontFamily: "System",
    fontWeight: "600",
    color: "#FFFFFF",
    fontSize: 16,
  },
});
