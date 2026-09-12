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
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>New Focus Session</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Focus session name"
              placeholderTextColor="#9CA3AF"
              value={sessionName}
              onChangeText={setSessionName}
            />
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
                placeholder="Enter minutes"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={customDuration}
                onChangeText={setCustomDuration}
              />
            )}
            <Pressable
              style={[
                styles.startButton,
                !canStart && styles.startButtonDisabled,
              ]}
              onPress={handleStartSession}
              disabled={!canStart}
            >
              <Text style={styles.startButtonText}>Start Session</Text>
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
    backgroundColor: "cyan",
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  homeTitle: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 28,
    color: "#0F172A",
    textAlign: "center",
  },
  homeSubtitle: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 13,
    color: "#0891B2",
    marginTop: 4,
    textAlign: "center",
  },
  listWrapper: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  contactBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
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
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  contactName: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 15,
    color: "#0F172A",
  },
  contactPhone: {
    fontFamily: "System",
    fontSize: 13,
    color: "#64748B",
    marginTop: 1,
  },
  apertureButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ECFEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  apertureIcon: {
    color: "#0891B2",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 24,
  },
  statusText: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 13,
    color: "#0891B2",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
  },
  modalTitle: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 20,
    color: "#0F172A",
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    fontFamily: "System",
    color: "#111827",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  durationSlot: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  durationSlotActive: {
    backgroundColor: "#0891B2",
    borderColor: "#0891B2",
  },
  durationText: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 13,
    color: "#0F172A",
  },
  durationTextActive: {
    color: "#FFFFFF",
  },
  startButton: {
    height: 50,
    backgroundColor: "#0891B2",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  startButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  startButtonText: {
    fontFamily: "System",
    fontWeight: "600",
    color: "#FFFFFF",
    fontSize: 16,
  },
});
