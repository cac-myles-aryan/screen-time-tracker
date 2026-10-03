import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";


//import newFocusSession from "../lib/newFocusSession";

const dummyContacts = [
  { id: "1", name: "John Doe", phone: "555-201-3344", tag: "aperture" },
  { id: "2", name: "John Kaisen", phone: "555-402-8871", tag: "focused" },
  { id: "3", name: "John Zenin", phone: "555-330-5567", tag: "invite" },
];

export default function Home() {
  const [modalVisible, setModalVisible] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [customDuration, setCustomDuration] = useState("");

  const durationOptions = [30, 60, 90, "custom"];
  const isCustomSelected = selectedDuration === "custom";
  const hasValidDuration = isCustomSelected
    ? customDuration.trim().length > 0
    : selectedDuration !== null;
  const canStart = sessionName.trim().length > 0 && hasValidDuration;

  const resetAndClose = () => {
    setModalVisible(false);
    setSessionName("");
    setSelectedDuration(null);
    setCustomDuration("");
  };

  const handleStartSession = () => {
    //newFocusSession(sessionName,isCustomSelected ? Number(customDuration) : selectedDuration,);
    console.log(
      "Starting session:",
      sessionName,
      isCustomSelected ? Number(customDuration) : selectedDuration,
    );
    resetAndClose();
  };
  return (
    <View style={styles.homeCSS}>
      <View style={styles.header}>
        <Text style={styles.homeTitle}>Ball and Chain</Text>
        <Text style={styles.homeSubtitle}>Start a Focus Session</Text>
      </View>

      <ScrollView
        style={styles.listWrapper}
        contentContainerStyle={styles.listContainer}
      >
        {dummyContacts.map((contact) => (
          <View key={contact.id} style={styles.contactBox}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </View>

            {contact.tag === "aperture" ? (
              <Pressable
                style={styles.apertureButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.apertureIcon}>+</Text>
              </Pressable>
            ) : (
              <Text style={styles.statusText}>
                {contact.tag === "focused" ? "Focused" : "Invite"}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetAndClose}
      >
        <Pressable style={styles.modalOverlay} onPress={resetAndClose}>
          <Pressable style={styles.modalCard} onPress={() => { }}>
            <Text style={styles.modalTitle}>New Focus Session</Text>

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
                    {option === "custom" ? "Custom" : option}
                  </Text>
                </Pressable>
              ))}
            </View>
            {isCustomSelected && (
              <TextInput
                style={styles.modalInput}
                label="minutes"
                placeholder="Enter custom duration"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={customDuration}
                onChangeText={setCustomDuration}
              />
            )}
            <View>
              <Text style={styles.modalTitle}>
                What will you be working on? (optional)
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Chemistry homework"
                placeholderTextColor="#9CA3AF"
                value={sessionName}
                onChangeText={setSessionName}
              />
            </View>
            <Pressable
              style={[
                styles.startButton,
                !canStart && styles.startButtonDisabled,
              ]}
              onPress={handleStartSession}
              disabled={!canStart}
            >
              <Text style={styles.startButtonText}>Lock IN!</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  homeCSS: {
    flex: 1,
    backgroundColor: "#22D3EE",
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  homeTitle: {
    fontWeight: "900",
    fontSize: 52,
    color: "#FFFFFF",
    letterSpacing: -1.5,
  },
  homeSubtitle: {
    fontWeight: "500",
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
  },
  listWrapper: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 10,
  },
  contactBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#ECFEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#0891B2",
    fontWeight: "800",
    fontSize: 17,
  },
  contactName: {
    fontWeight: "700",
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "400",
  },
  apertureButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#22D3EE",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  apertureIcon: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  statusText: {
    fontWeight: "700",
    fontSize: 13,
    color: "#0891B2",
    marginLeft: "auto",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 0,
  },
  modalTitle: {
    fontWeight: "800",
    fontSize: 20,
    color: "#0F172A",
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    color: "#0E7490",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  durationSlot: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  durationSlotActive: {
    backgroundColor: "#22D3EE",
    borderColor: "#22D3EE",
  },
  durationText: {
    fontWeight: "800",
    fontSize: 15,
    color: "#0F172A",
  },
  durationTextActive: {
    color: "#FFFFFF",
  },
  startButton: {
    height: 56,
    backgroundColor: "#22D3EE",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  startButtonDisabled: {
    backgroundColor: "rgba(34,211,238,0.3)",
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    fontWeight: "800",
    color: "#FFFFFF",
    fontSize: 16,
    letterSpacing: 0.2,
  },
});