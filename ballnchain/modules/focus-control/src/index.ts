import { requireOptionalNativeModule } from "expo-modules-core";

export type AuthorizationStatus =
  | "approved"
  | "denied"
  | "notDetermined"
  | "unknown";

export type SelectionSummary = {
  applications: number;
  categories: number;
  webDomains: number;
};

export type PickedContact = { name: string; phoneNumber: string };

type NativeFocusControl = {
  getAuthorizationStatus(): AuthorizationStatus;
  requestAuthorization(): Promise<AuthorizationStatus>;
  pickAppsToBlock(): Promise<SelectionSummary>;
  getSelectionSummary(): SelectionSummary;
  startBlocking(endsAtMs: number): Promise<void>;
  stopBlocking(): Promise<void>;
  consumeShieldDropped(): boolean;
  getBlockingState(): { active: boolean; endsAt: number | null };
  pickContact(): Promise<PickedContact | null>;
  addListener(
    event: "onAuthorizationChange",
    cb: (e: { status: AuthorizationStatus }) => void,
  ): { remove(): void };
};

// null in Expo Go, on Android and on web: the module only exists in an iOS
// development build that includes this folder.
const native = requireOptionalNativeModule<NativeFocusControl>("FocusControl");

export const isFocusControlAvailable = native !== null;

// Screen Time blocking additionally needs the Family Controls entitlement,
// which free Apple developer accounts can't sign. Build with
// EXPO_PUBLIC_ENABLE_BLOCKING=false to ship without it; contact picking still works.
export const isBlockingAvailable =
  native !== null && process.env.EXPO_PUBLIC_ENABLE_BLOCKING !== "false";

function need(): NativeFocusControl {
  if (!native) {
    throw new Error(
      "Screen Time controls need an iOS development build (not Expo Go).",
    );
  }
  return native;
}

export const getAuthorizationStatus = () =>
  native ? native.getAuthorizationStatus() : "unknown";

export const requestAuthorization = () => need().requestAuthorization();

export const pickAppsToBlock = () => need().pickAppsToBlock();

export const getSelectionSummary = () =>
  native
    ? native.getSelectionSummary()
    : { applications: 0, categories: 0, webDomains: 0 };

/** Shields the chosen apps until `endsAt`. Sessions must be 15+ minutes. */
export const startBlocking = (endsAt: Date) =>
  need().startBlocking(endsAt.getTime());

export const stopBlocking = () => need().stopBlocking();

/** True once if the shield was found lifted mid-session and re-applied. */
export const consumeShieldDropped = () =>
  native ? native.consumeShieldDropped() : false;

export const getBlockingState = () =>
  native ? native.getBlockingState() : { active: false, endsAt: null };

export const pickContact = () => need().pickContact();

/** Fires when the user changes Screen Time access while the app is running. */
export function onAuthorizationChange(
  cb: (status: AuthorizationStatus) => void,
) {
  if (!native) return { remove() {} };
  return native.addListener("onAuthorizationChange", (e) => cb(e.status));
}
