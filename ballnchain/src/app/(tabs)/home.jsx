import { useCallback, useEffect, useMemo, useState } from "react";
import * as Contacts from "expo-contacts/legacy";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Focus from "../../../modules/focus-control/src";
import { toE164 } from "../../lib/phone";
import { confirmEndEarly, getMyActiveSession, requestEndEarly, reportTamper, sendHeartbeat, startSelfSession } from "../../lib/session_handler";

// iOS rejects Screen Time schedules shorter than 15 minutes.
const MIN_MINUTES = 15;
const MAX_MINUTES = 1440;
const durationOptions = [30, 60, 90, "custom"];

async function fetchContacts() {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") return { state: "denied", contacts: [] };
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      sort: Contacts.SortTypes.FirstName,
    });
    const rows = [];
    for (const c of data) {
      const name = c.name?.trim();
      const number = (c.phoneNumbers ?? []).find((n) => toE164(n.number ?? ""));
      if (!name || !number) continue;
      rows.push({ id: c.id, name, display: number.number, phone: toE164(number.number) });
    }
    return { state: "ready", contacts: rows };
  } catch (e) {
    console.log("Error loading contacts:", e.message);
    return { state: "error", contacts: [], message: String(e?.message ?? e) };
  }
}

function countdown(expiryAt, now) {
  const total = Math.max(0, Math.ceil((new Date(expiryAt).getTime() - now) / 1000));
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedDuration, setSelectedDuration] = useState(null);
  const [customDuration, setCustomDuration] = useState("");
  const [focusNote, setFocusNote] = useState("");
  const [target, setTarget] = useState(null); // { name, phone } the session is assigned to
  const [contacts, setContacts] = useState([]);
  const [contactsState, setContactsState] = useState("loading"); // loading | ready | denied | error
  const [query, setQuery] = useState("");
  const [blockedCount, setBlockedCount] = useState(() => {
    const s = Focus.getSelectionSummary();
    return s.applications + s.categories + s.webDomains;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setSession(await getMyActiveSession());
    } catch (e) {
      setLoadError(e.message || "Couldn't load your session.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Tick so the countdown updates and the session flips to inactive on expiry.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const active =
    session && new Date(session.expiry_at).getTime() > now ? session : null;

  // The focus screen shows seconds, so tick every second while it's up.
  const focusing = !!active;
  useEffect(() => {
    if (!focusing) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [focusing]);

  // While a session runs: heartbeat to the server, and text the contact if Screen
  // Time access was pulled or the shield was lifted. Checked
  // live (listener) and on every foreground, since the app may have been asleep.
  const isActive = !!active;
  const activeExpiry = active?.expiry_at;
  useEffect(() => {
    if (!isActive) return;
    const report = (reason) =>
      reportTamper(reason).catch((e) => console.log("Error reporting tamper:", e.message));
    const check = () => {
      if (new Date(activeExpiry).getTime() <= Date.now()) return;
      if (Focus.isBlockingAvailable) {
        if (Focus.getAuthorizationStatus() === "denied") report("authorization_revoked");
        if (Focus.consumeShieldDropped()) report("shield_dropped");
      }
    };
    const beat = () => {
      sendHeartbeat().catch((e) => console.log("Error sending heartbeat:", e.message));
    };
    beat();
    const timer = setInterval(() => {
      beat();
      check();
    }, 30000);
    const authSub = Focus.onAuthorizationChange((status) => {
      if (status === "denied") report("authorization_revoked");
    });
    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        beat();
        check();
      }
    });
    return () => {
      clearInterval(timer);
      authSub.remove();
      appSub.remove();
    };
  }, [isActive, activeExpiry]);

  const isCustomSelected = selectedDuration === "custom";
  const minutes = isCustomSelected ? Number(customDuration) : selectedDuration;
  const canStart =
    !submitting &&
    Number.isFinite(minutes) &&
    minutes >= MIN_MINUTES &&
    minutes <= MAX_MINUTES &&
    target !== null;

  const [contactsAttempt, setContactsAttempt] = useState(0);
  const [contactsError, setContactsError] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetchContacts().then((result) => {
      if (cancelled) return;
      setContacts(result.contacts);
      setContactsState(result.state);
      setContactsError(result.message ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [contactsAttempt]);

  const retryContacts = () => {
    setContactsState("loading");
    setContactsAttempt((n) => n + 1);
  };

  const visibleContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || c.display.includes(q));
  }, [contacts, query]);

  const pickApps = async () => {
    try {
      if (Focus.getAuthorizationStatus() !== "approved") {
        await Focus.requestAuthorization();
      }
      const s = await Focus.pickAppsToBlock();
      setBlockedCount(s.applications + s.categories + s.webDomains);
      setSubmitError("");
    } catch (e) {
      setSubmitError(e.message || "Couldn't get Screen Time access.");
    }
  };

  const handleStart = async () => {
    if (!canStart) return;
    Keyboard.dismiss();
    setSubmitting(true);
    setSubmitError("");
    let blocking = false;
    try {
      // Checked before touching Screen Time so a failure here can't undo a
      // shield that belongs to the session already running.
      if (await getMyActiveSession()) {
        throw new Error("You're already in a focus session.");
      }
      const endsAt = new Date(Date.now() + minutes * 60000);

      if (Focus.isBlockingAvailable) {
        if (Focus.getAuthorizationStatus() !== "approved") {
          await Focus.requestAuthorization();
        }
        if (blockedCount === 0) {
          throw new Error("Choose the apps you want blocked first.");
        }
        await Focus.startBlocking(endsAt);
        blocking = true;
      }

      let created;
      try {
        created = await startSelfSession({
          endsAt,
          focusContent: focusNote,
          contactName: target.name,
          contactPhone: target.phone,
        });
      } catch (e) {
        // Never leave apps shielded for a session that isn't on record.
        if (blocking) await Focus.stopBlocking();
        throw e;
      }

      setNow(Date.now());
      setSession(created);
      setTarget(null);
      setSelectedDuration(null);
      setCustomDuration("");
      setFocusNote("");
    } catch (e) {
      console.log("Error starting session:", e.message);
      setSubmitError(e.message || "Couldn't start the session.");
    } finally {
      setSubmitting(false);
    }
  };

  const [requesting, setRequesting] = useState(false);
  const endStatus = active?.end_request_status;
  const confirmRequestEnd = () => {
    Alert.alert(
      "Request to end early?",
      `${active?.contact_name || "Your accountability contact"} will be texted a code. Enter it to end your session.`,
      [
        { text: "Keep focusing", style: "cancel" },
        {
          text: "Send request",
          onPress: async () => {
            setRequesting(true);
            try {
              await requestEndEarly();
              await load();
            } catch (e) {
              console.log("Error requesting end:", e.message);
              Alert.alert("Couldn't send the request", e.message || "Try again.");
            } finally {
              setRequesting(false);
            }
          },
        },
      ],
    );
  };

  const [endCode, setEndCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const submitEndCode = async () => {
    setConfirming(true);
    try {
      await confirmEndEarly(endCode.trim());
      if (Focus.isBlockingAvailable) await Focus.stopBlocking();
      setEndCode("");
      setSession(null);
    } catch (e) {
      console.log("Error confirming end:", e.message);
      Alert.alert("Couldn't end the session", e.message || "Try again.");
    } finally {
      setConfirming(false);
    }
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setTarget(null);
    setSubmitError("");
  };

  if (active) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable
        onPress={Keyboard.dismiss}
        accessible={false}
        style={[
          styles.homeCSS,
          styles.focusScreen,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Animated.View entering={FadeIn.duration(700)}>
          <Text style={styles.focusTitle} adjustsFontSizeToFit numberOfLines={1}>
            FOCUSED
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(250).duration(700)} style={styles.focusMiddle}>
          <Text style={styles.focusTimer} adjustsFontSizeToFit numberOfLines={1}>
            {countdown(active.expiry_at, now)}
          </Text>
          <Text style={styles.focusRemaining}>remaining</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(600).duration(600)}>
          <Text style={styles.focusContact}>
            Accountability: {active.contact_name || active.contact_phone}
          </Text>
        </Animated.View>

        {endStatus === "pending" ? (
          <>
            <Text style={styles.focusContact}>
              Ask {active.contact_name || "your contact"} for the code they were texted.
            </Text>
            <TextInput
              style={[styles.search, { textAlign: "center", marginBottom: 12 }]}
              placeholder="Code"
              placeholderTextColor="#9CA3AF"
              value={endCode}
              onChangeText={setEndCode}
              keyboardType="number-pad"
              maxLength={10}
            />
            <Pressable
              style={[styles.focusEndButton, (confirming || !endCode.trim()) && { opacity: 0.6 }]}
              onPress={submitEndCode}
              disabled={confirming || !endCode.trim()}
            >
              <Text style={styles.focusEndText}>end session</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable
          style={[styles.focusEndButton, { marginTop: 12 }, requesting && { opacity: 0.6 }]}
          onPress={confirmRequestEnd}
          disabled={requesting}
        >
          <Text style={styles.focusEndText}>
            {endStatus === "pending" ? "send a new code" : "request to end early"}
          </Text>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.homeCSS}>
      <Animated.View
        entering={FadeIn.duration(700)}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.homeTitle}>Ball and Chain</Text>
        <Text style={styles.homeSubtitle}>Start a Focus Session</Text>
      </Animated.View>

      {loading || contactsState === "loading" ? (
        <ActivityIndicator color="#FFFFFF" style={{ marginTop: 32 }} />
      ) : loadError ? (
        <Text style={styles.emptyText}>{loadError}</Text>
      ) : contactsState === "denied" ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>
            Allow contact access to pick who holds you accountable.
          </Text>
          <Pressable style={styles.secondaryButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.secondaryButtonText}>Open Settings</Text>
          </Pressable>
        </View>
      ) : contactsState === "error" ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>Couldn&apos;t load your contacts.{contactsError ? `\n${contactsError}` : ""}</Text>
          <Pressable style={styles.secondaryButton} onPress={retryContacts}>
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <Animated.View entering={FadeIn.delay(350).duration(700)} style={{ flex: 1 }}>
          <TextInput
            style={styles.search}
            placeholder="Search contacts"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          <ScrollView
            style={styles.listWrapper}
            contentContainerStyle={styles.listContainer}
            keyboardShouldPersistTaps="handled"
          >
            {visibleContacts.length === 0 ? (
              <Text style={styles.emptyText}>
                {contacts.length === 0 ? "No contacts with phone numbers." : "No matches."}
              </Text>
            ) : (
              visibleContacts.map((contact) => (
                <View key={contact.id} style={styles.contactBox}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.display}</Text>
                  </View>
                  <Pressable
                    style={styles.apertureButton}
                    onPress={() => setTarget({ name: contact.name, phone: contact.phone })}
                  >
                    <Text style={styles.apertureIcon}>+</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      )}

      <Modal visible={target !== null} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.flexFill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalOverlay} onPress={closeModal}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>New Focus Session</Text>
                <Text style={styles.modalSubtitle}>Accountability: {target?.name}</Text>

                <View style={styles.durationRow}>
                  {durationOptions.map((option) => (
                    <Pressable
                      key={option}
                      style={[
                        styles.durationSlot,
                        selectedDuration === option && styles.durationSlotActive,
                      ]}
                      onPress={() => setSelectedDuration(option)}
                    >
                      <Text
                        style={[
                          styles.durationText,
                          selectedDuration === option && styles.durationTextActive,
                        ]}
                      >
                        {option === "custom" ? "Custom" : `${option}m`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {isCustomSelected && (
                  <TextInput
                    style={styles.input}
                    placeholder={`Minutes (${MIN_MINUTES}–${MAX_MINUTES})`}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    value={customDuration}
                    onChangeText={(t) => setCustomDuration(t.replace(/\D/g, "").slice(0, 4))}
                  />
                )}

                <Text style={styles.label}>What are you working on? (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Chemistry homework"
                  placeholderTextColor="#9CA3AF"
                  value={focusNote}
                  onChangeText={setFocusNote}
                  maxLength={80}
                />

                {Focus.isBlockingAvailable ? (
                  <>
                    <Text style={styles.label}>What gets blocked?</Text>
                    <Pressable style={styles.secondaryButton} onPress={pickApps}>
                      <Text style={styles.secondaryButtonText}>
                        {blockedCount > 0
                          ? `${blockedCount} selected · Change`
                          : "Choose apps to block"}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.note}>
                    App blocking isn&apos;t available in this build. The session is recorded
                    and your contact is saved, but nothing is blocked.
                  </Text>
                )}

                {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

                <Pressable
                  style={[styles.startButton, !canStart && styles.startButtonDisabled]}
                  onPress={handleStart}
                  disabled={!canStart}
                >
                  {submitting ? (
                    <ActivityIndicator color="#0891B2" />
                  ) : (
                    <Text style={styles.startButtonText}>Lock IN!</Text>
                  )}
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  homeCSS: { flex: 1, backgroundColor: "#22D3EE" },
  header: { paddingHorizontal: 24, paddingBottom: 20, alignItems: "center" },
  homeTitle: {
    fontWeight: "900",
    fontSize: 52,
    color: "#FFFFFF",
    letterSpacing: -1.5,
    textAlign: "center",
  },
  homeSubtitle: {
    fontWeight: "500",
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    textAlign: "center",
  },
  emptyBlock: { paddingHorizontal: 24, gap: 16, marginTop: 24 },
  emptyText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
    textAlign: "center",
    marginTop: 16,
    opacity: 0.9,
  },
  search: {
    color: "#0E7490",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  listWrapper: { flex: 1 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  contactBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0891B2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  rowText: { flex: 1, marginRight: 8 },
  contactName: { fontWeight: "700", fontSize: 15, color: "#0F172A" },
  contactPhone: { fontSize: 13, color: "#64748B", marginTop: 1 },
  apertureButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ECFEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  apertureIcon: { color: "#0891B2", fontSize: 24, fontWeight: "700", lineHeight: 26 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#22D3EE",
    borderRadius: 24,
    padding: 22,
  },
  modalTitle: {
    fontWeight: "900",
    fontSize: 26,
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  modalSubtitle: {
    fontWeight: "500",
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  label: { fontWeight: "700", fontSize: 14, color: "#FFFFFF", marginTop: 6, marginBottom: 8 },
  note: { color: "rgba(255,255,255,0.85)", fontWeight: "500", fontSize: 13, marginTop: 10 },
  input: {
    color: "#0E7490",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  durationRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  durationSlot: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  durationSlotActive: { backgroundColor: "#FFFFFF" },
  durationText: { fontWeight: "800", fontSize: 15, color: "#FFFFFF" },
  durationTextActive: { color: "#0891B2" },
  secondaryButton: {
    height: 50,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 0,
  },
  secondaryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  submitError: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 10,
  },
  startButton: {
    height: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  startButtonDisabled: { backgroundColor: "rgba(255,255,255,0.35)" },
  startButtonText: { fontWeight: "800", color: "#0891B2", fontSize: 17, letterSpacing: 0.2 },
  focusScreen: { paddingHorizontal: 28, alignItems: "stretch" },
  focusTitle: {
    fontWeight: "900",
    fontSize: 72,
    color: "#0F172A",
    letterSpacing: -2,
    textAlign: "center",
  },
  focusMiddle: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  focusTimer: {
    alignSelf: "stretch",
    fontWeight: "800",
    fontSize: 76,
    color: "#0F172A",
    letterSpacing: -2,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  focusRemaining: { fontWeight: "700", fontSize: 28, color: "#0E7490", alignSelf: "flex-end" },
  focusContact: {
    fontWeight: "500",
    fontSize: 13,
    color: "rgba(15,23,42,0.6)",
    textAlign: "center",
    marginBottom: 16,
  },
  focusEndButton: {
    alignSelf: "center",
    height: 56,
    paddingHorizontal: 40,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  focusEndText: { fontWeight: "800", fontSize: 17, color: "#0891B2" },
});
