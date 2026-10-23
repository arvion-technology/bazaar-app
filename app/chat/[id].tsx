import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LISTINGS } from "../../src/catalog";
import { colors } from "../../src/theme";

type Message = { id: string; from: "buyer" | "seller" | "offer"; text: string };

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = LISTINGS.find((item) => item.id === id) ?? LISTINGS[0];
  const [messages, setMessages] = useState<Message[]>([
    { id: "m1", from: "seller", text: "Thanks for asking. The box and charger are both included." },
    { id: "m2", from: "buyer", text: "Would you take NPR 65,000 if I pick it up today?" },
    { id: "m3", from: "offer", text: "Offer sent · NPR 65,000 · expires in 24h" },
  ]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(false);

  function send() {
    if (!draft.trim()) return;
    setMessages((current) => [...current, { id: `m${current.length + 1}`, from: "buyer", text: draft.trim() }]);
    setDraft("");
    setUnread(true);
    setTimeout(() => setUnread(false), 2200);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.meta}>{unread ? "1 new reply" : "Seller replies in about an hour"}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.thread}>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Keep payment inside the app. Never transfer to a personal account.</Text>
        </View>
        {messages.map((message) => (
          <View key={message.id} style={[styles.bubble, message.from === "buyer" ? styles.mine : message.from === "offer" ? styles.offer : styles.theirs]}>
            <Text style={styles.bubbleText}>{message.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          placeholder="Write a message"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Text onPress={send} style={styles.send}>Send</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { color: colors.text, fontSize: 16, fontWeight: "600" },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  thread: { padding: 16, gap: 8 },
  notice: { backgroundColor: "rgba(245,194,107,.08)", borderWidth: 1, borderColor: "rgba(245,194,107,.3)", borderRadius: 9, padding: 10, marginBottom: 6 },
  noticeText: { color: colors.gold, fontSize: 11, lineHeight: 16 },
  bubble: { maxWidth: "82%", borderRadius: 14, padding: 11 },
  mine: { alignSelf: "flex-end", backgroundColor: "rgba(58,123,255,.18)" },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surface },
  offer: { alignSelf: "center", backgroundColor: "rgba(245,194,107,.12)", borderWidth: 1, borderColor: "rgba(245,194,107,.35)" },
  bubbleText: { color: colors.body, fontSize: 13, lineHeight: 19 },
  composer: { flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.line },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, color: colors.text, paddingHorizontal: 12, paddingVertical: 10 },
  send: { color: colors.gold, fontWeight: "700", paddingVertical: 10 },
});
