import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { LISTINGS } from "../../src/catalog";
import { formatNPR } from "../../src/money";
import { colors } from "../../src/theme";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const listing = LISTINGS.find((item) => item.id === id) ?? LISTINGS[0];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.gallery} />
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>{formatNPR(listing.price)}</Text>
        <Text style={styles.meta}>{listing.location} · {listing.distanceKm} km · {listing.sellerVerified ? "verified seller" : "new seller"}</Text>
        <Text style={styles.description}>{listing.description}</Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.secondary}
            accessibilityRole="button"
            onPress={() => router.push(`/chat/${listing.id}`)}
          >
            <Text style={styles.secondaryText}>Message seller</Text>
          </Pressable>
          <Pressable
            style={styles.primary}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/checkout", params: { listing: listing.id } })}
          >
            <Text style={styles.primaryText}>Buy now</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>
          The buy button opens checkout with this listing. Prices stay in paisa until formatNPR is called.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, gap: 8 },
  gallery: { height: 220, borderRadius: 16, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", marginTop: 8 },
  price: { color: colors.gold, fontSize: 22, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 12 },
  description: { color: colors.body, fontSize: 14, lineHeight: 21, marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  secondary: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 13, alignItems: "center" },
  secondaryText: { color: colors.body, fontWeight: "600" },
  primary: { flex: 1, backgroundColor: colors.gold, borderRadius: 12, padding: 13, alignItems: "center" },
  primaryText: { color: "#1a1405", fontWeight: "700" },
  note: { color: colors.muted, fontSize: 11, marginTop: 16 },
});
