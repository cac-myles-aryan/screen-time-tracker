import { Platform } from "react-native";
import * as Device from "expo-device";

// Development stand-ins for the address book. Numbers use the reserved
// 555-01xx range, so no real person can receive a text sent to one.
const FAKE_CONTACTS = [
  ["Alex Johnson", "(555) 010-0101"],
  ["Ava Martinez", "(555) 010-0102"],
  ["Ben Carter", "(555) 010-0103"],
  ["Chloe Nguyen", "(555) 010-0104"],
  ["Daniel Kim", "(555) 010-0105"],
  ["Emma Rossi", "(555) 010-0106"],
  ["Finn O'Brien", "(555) 010-0107"],
  ["Grace Patel", "(555) 010-0108"],
  ["Henry Walker", "(555) 010-0109"],
  ["Isla Thompson", "(555) 010-0110"],
  ["Jack Brown", "(555) 010-0111"],
  ["Mom", "(555) 010-0112"],
  ["Dad", "(555) 010-0113"],
].map(([name, number], i) => ({ id: `fake-${i}`, name, phoneNumbers: [{ number }] }));

// On by default in dev builds that have no real address book (web, simulator).
// EXPO_PUBLIC_FAKE_CONTACTS=true|false overrides it, and it is never on in
// production builds.
export function shouldFakeContacts() {
  if (!__DEV__) return false;
  const flag = process.env.EXPO_PUBLIC_FAKE_CONTACTS;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return Platform.OS === "web" || !Device.isDevice;
}

export { FAKE_CONTACTS };
