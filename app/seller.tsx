import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { SELLER, SELLER_ORDERS } from "../src/catalog";
import { formatNPR, quote, settlement } from "../src/money";
import { colors } from "../src/theme";

export default function SellerScreen() {
  const active = SELLER_ORDERS.filter((order) => order.state !== "paid");
  const revenue = SELLER_ORDERS.reduce((sum, order) => {
    const value = quote({ items: [{ price: order.total, qty: 1 }] });
    return sum + settlement(value).seller;
  }, 0);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{SELLER.name}</Text>
        <Text style={styles.meta}>{SELLER.rating} rating · {SELLER.reviews} reviews · joined {SELLER.joined}</Text>
      </View>
      <View style={styles.stats}>
        <Stat value="1,284" label="views / 7d" />
        <Stat value={String(active.length)} label="open orders" />
        <Stat value={formatNPR(revenue)} label="settled" />
      </View>
      <Text style={styles.section}>Orders</Text>
      <FlatList
        data={SELLER_ORDERS}
        keyExtractor={(order) => order.id}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View style={styles.order}>
            <View>
              <Text style={styles.orderId}>{item.id}</Text>
              <Text style={styles.orderMeta}>{item.buyer} · {item.state}</Text>
            </View>
            <Text style={styles.orderValue}>{formatNPR(item.total)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 16 },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  stats: { flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12 },
  statValue: { color: colors.gold, fontSize: 15, fontWeight: "700" },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 2 },
  section: { color: colors.text, fontSize: 14, fontWeight: "600", padding: 16 },
  order: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 13 },
  orderId: { color: colors.body, fontWeight: "600", fontSize: 13 },
  orderMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  orderValue: { color: colors.text, fontWeight: "600", fontSize: 13 },
});
