import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native";

import { LISTINGS } from "../src/catalog";
import { advance, canAdvance, processingOutcome, startCheckout, PAYMENT_METHODS } from "../src/checkout";
import { quote, formatNPR, settlement } from "../src/money";
import { colors } from "../src/theme";

export default function CheckoutScreen() {
  const { listing } = useLocalSearchParams<{ listing?: string }>();
  const router = useRouter();
  const product = LISTINGS.find((item) => item.id === listing) ?? LISTINGS[0];
  const breakdown = quote({ items: [{ price: product.price, qty: 1 }], distanceKm: product.distanceKm });
  const [address, setAddress] = useState("Baneshwor, Kathmandu");
  const [method, setMethod] = useState<string>("esewa");
  const [checkout, setCheckout] = useState(() =>
    startCheckout({ items: [{ price: product.price, qty: 1 }], address: "", total: breakdown.total }));

  function go(to: Parameters<typeof advance>[1], patch = {}) {
    try {
      const next = advance(checkout, to, patch);
      setCheckout(next);
      if (to === "processing") {
        setTimeout(() => setCheckout((current) => processingOutcome(current)), 600);
      }
      if (next.state === "paid") router.replace("/");
    } catch {
      // The guard returns its reason below; the button is disabled for the same case.
    }
  }

  const step = checkout.state;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 18 }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>Checkout</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 14 }}>{step}</Text>

      <Text style={{ color: colors.muted, fontSize: 11 }}>DELIVERY ADDRESS</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, color: colors.text, padding: 12, marginTop: 5 }}
      />

      <View style={{ marginTop: 16, gap: 6 }}>
        <Row label="Subtotal" value={formatNPR(breakdown.subtotal)} />
        <Row label="Delivery" value={formatNPR(breakdown.delivery)} />
        <Row label="Platform fee" value={formatNPR(breakdown.platformFee)} />
        <Row label="Total" value={formatNPR(breakdown.total)} strong />
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>
          Seller receives {formatNPR(settlement(breakdown).seller)} · platform {formatNPR(settlement(breakdown).platform)}
        </Text>
      </View>

      <View style={{ marginTop: 16, flexDirection: "row", gap: 8 }}>
        {PAYMENT_METHODS.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => setMethod(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: method === option.id }}
            style={{ flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: method === option.id ? colors.gold : colors.line }}
          >
            <Text style={{ color: method === option.id ? colors.gold : colors.muted, fontSize: 12, textAlign: "center" }}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {step === "cart" && (
        <Pressable style={buttonStyle} onPress={() => go("address", { address })}>
          <Text style={buttonText}>Continue to address</Text>
        </Pressable>
      )}
      {step === "address" && (
        <Pressable style={buttonStyle} disabled={!canAdvance(checkout, "review").ok} onPress={() => go("review")}>
          <Text style={buttonText}>Review order</Text>
        </Pressable>
      )}
      {step === "review" && (
        <Pressable style={buttonStyle} onPress={() => go("payment", { method })}>
          <Text style={buttonText}>Continue to payment</Text>
        </Pressable>
      )}
      {step === "payment" && (
        <Pressable style={buttonStyle} onPress={() => go("processing", { method })}>
          <Text style={buttonText}>Pay {formatNPR(breakdown.total)}</Text>
        </Pressable>
      )}
      {step === "processing" && <Text style={{ color: colors.gold, marginTop: 18 }}>Contacting {method}…</Text>}
      {step === "failed" && (
        <Pressable style={buttonStyle} onPress={() => go("payment")}>
          <Text style={buttonText}>Try again</Text>
        </Pressable>
      )}
      {step === "paid" && <Text style={{ color: colors.green, marginTop: 18 }}>Paid. The seller has been notified.</Text>}
    </SafeAreaView>
  );
}

const buttonStyle = { backgroundColor: colors.gold, borderRadius: 12, padding: 14, marginTop: 18, alignItems: "center" as const };
const buttonText = { color: "#1a1405", fontWeight: "700" as const };

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: strong ? colors.text : colors.muted, fontWeight: strong ? "700" : "400" }}>{label}</Text>
      <Text style={{ color: strong ? colors.gold : colors.body, fontWeight: strong ? "700" : "400" }}>{value}</Text>
    </View>
  );
}
