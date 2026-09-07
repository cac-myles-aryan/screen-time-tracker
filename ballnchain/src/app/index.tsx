import { StyleSheet } from "react-native";
import Login from "./login";

export default function Index() {
  return (
    <>
      <Login />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
