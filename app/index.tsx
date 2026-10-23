import { useMemo, useState } from "react";
import { FlatList, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { LISTINGS, SELLER } from "../src/catalog";
import { applyFilters, CATEGORIES } from "../src/filters";
import { formatNPR } from "../src/money";
import { colors } from "../src/theme";
import { ListingCard } from "../components/listing-card";

export default function FeedScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  // Filters run locally so the result count does not flicker while a network
  // request is in flight. The same function is covered by the node:test suite.
  const listings = useMemo(
    () => applyFilters(LISTINGS, { query, category, sort: query ? "relevance" : "newest" }),
    [query, category],
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby</Text>
        <Text style={styles.subtitle}>{SELLER.verified ? "Verified sellers in Kathmandu" : ""}</Text>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search mobiles, furniture, bikes"
        placeholderTextColor={colors.muted}
        style={styles.input}
        accessibilityLabel="Search listings"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {["all", ...CATEGORIES].map((item) => (
          <Pressable
            key={item}
            onPress={() => setCategory(item)}
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            style={[styles.chip, category === item && styles.chipActive]}
          >
            <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nothing matches “{query}” in {category === "all" ? "any category" : category}. Try a wider price range.
          </Text>
        }
      />
      <Text style={styles.note}>{formatNPR(LISTINGS[0].price)} · prices stored in paisa</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 18 },
  header: { paddingTop: 12, paddingBottom: 10 },
  title: { color: colors.text, fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: 12, color: colors.text, paddingHorizontal: 14, paddingVertical: 11,
  },
  chips: { gap: 8, paddingVertical: 12 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipActive: { backgroundColor: "rgba(245,194,107,.14)", borderColor: "rgba(245,194,107,.38)" },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  chipTextActive: { color: colors.gold },
  list: { gap: 10, paddingBottom: 24 },
  empty: { color: colors.muted, fontSize: 13, textAlign: "center", paddingVertical: 34 },
  note: { color: colors.muted, fontSize: 10, textAlign: "center", paddingBottom: 8 },
});
