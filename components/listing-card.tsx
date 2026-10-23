import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatNPR } from "../src/money";
import { colors } from "../src/theme";

type Listing = {
  id: string;
  title: string;
  price: number;
  location: string;
  distanceKm: number;
  sellerVerified: boolean;
};

export function ListingCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatNPR(listing.price)}, ${listing.distanceKm} km away`}
      style={styles.card}
    >
      <View style={styles.thumb} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{listing.title}</Text>
        <Text style={styles.price}>{formatNPR(listing.price)}</Text>
        <Text style={styles.meta}>
          {listing.location} · {listing.distanceKm} km
          {listing.sellerVerified ? " · verified seller" : ""}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", gap: 12, padding: 10, borderRadius: 14,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  thumb: { width: 76, height: 76, borderRadius: 10, backgroundColor: colors.surface2 },
  body: { flex: 1, justifyContent: "center", gap: 3 },
  title: { color: colors.text, fontSize: 14, fontWeight: "600" },
  price: { color: colors.gold, fontSize: 14, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 11 },
});
