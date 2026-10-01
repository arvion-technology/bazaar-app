import test from "node:test";
import assert from "node:assert/strict";
import {
  CHECKOUT_STATES, PAYMENT_METHODS, canAdvance, advance, startCheckout, processingOutcome,
  paymentMethod, canRetry, isTerminal, CHECKOUT_FLOWS,
} from "../src/checkout.js";
import {
  formatNPR, rupees, platformFee, deliveryFee, quote, settlement, parsePriceInput,
  PLATFORM_FEE_MIN,
} from "../src/money.js";
import {
  CATEGORIES, applyFilters, matchesQuery, sortListings, facetCounts, suggestions,
} from "../src/filters.js";
import { createCache, cachedFetch } from "../src/cache.js";
import { LISTINGS, SCREENS, PRODUCT, SELLER, SELLER_ORDERS } from "../src/catalog.js";

const item = (price, qty = 1) => ({ price, qty });

/* --------------------------------------------------------------- checkout */

test("checkout has eight states and three payment methods", () => {
  assert.equal(CHECKOUT_STATES.length, 8);
  assert.deepEqual(PAYMENT_METHODS.map((method) => method.id), ["esewa", "khalti", "cod"]);
  assert.equal(paymentMethod("esewa").kind, "wallet");
  assert.equal(paymentMethod("nope"), null);
});

test("a checkout cannot skip review or payment", () => {
  const checkout = startCheckout({ items: [item(100_000)], address: "Baneshwor", total: 102_000 });
  assert.equal(canAdvance(checkout, "paid").ok, false);
  assert.equal(canAdvance(checkout, "payment").ok, false);
  assert.equal(advance(checkout, "address").state, "address");
  assert.equal(canAdvance(advance(checkout, "address"), "review").ok, true);
});

test("guards name the missing thing", () => {
  const checkout = startCheckout({ items: [item(100_000)], total: 100_000 });
  const noAddress = canAdvance(checkout, "address");
  assert.equal(noAddress.ok, true, "the address screen can be entered before it is filled");
  const emptyCart = canAdvance(startCheckout({ items: [], address: "x", total: 10 }), "address");
  assert.equal(emptyCart.ok, true);
  const review = { ...checkout, state: "review", address: "Baneshwor" };
  assert.match(canAdvance({ ...review, items: [] }, "payment").reason, /cart is empty/);
  assert.match(canAdvance({ ...review, total: 0 }, "payment").reason, /payment method|total/);
  const payment = { ...review, state: "payment", method: "esewa", total: 1000 };
  assert.equal(canAdvance(payment, "processing").ok, true);
  assert.equal(canAdvance({ ...payment, method: null }, "processing").ok, false);
});

test("the happy eSewa and Khalti flows complete", () => {
  for (const method of ["esewa", "khalti"]) {
    let checkout = startCheckout({ items: [item(100_000)], total: 102_000 });
    checkout = advance(checkout, "address", { address: "Baneshwor" });
    checkout = advance(checkout, "review");
    checkout = advance(checkout, "payment", { method });
    checkout = advance(checkout, "processing");
    checkout = processingOutcome(checkout);
    assert.equal(checkout.state, "paid", method);
    assert.equal(isTerminal(checkout), true);
    assert.equal(checkout.history.length, 5);
  }
});

test("cash on delivery only settles after delivery is confirmed", () => {
  let checkout = startCheckout({ items: [item(100_000)], total: 100_000 });
  checkout = advance(checkout, "address", { address: "Baneshwor" });
  checkout = advance(checkout, "review");
  checkout = advance(checkout, "payment", { method: "cod" });
  checkout = advance(checkout, "processing");
  assert.equal(canAdvance(checkout, "paid").ok, false);
  const paid = advance(checkout, "paid", { deliveryConfirmed: true });
  assert.equal(paid.state, "paid");
});

test("a failed payment can retry without losing the cart", () => {
  let checkout = startCheckout({ items: [item(50_000)], total: 52_000 });
  checkout = advance(checkout, "address", { address: "Patan" });
  checkout = advance(checkout, "review");
  checkout = advance(checkout, "payment", { method: "esewa" });
  checkout = advance(checkout, "processing");
  checkout = processingOutcome(checkout, { success: false });
  assert.equal(checkout.state, "failed");
  assert.equal(canRetry(checkout), true);
  checkout = advance(checkout, "payment");
  assert.equal(checkout.state, "payment");
  assert.equal(checkout.items.length, 1);
});

test("illegal transitions throw and history is append-only", () => {
  const checkout = startCheckout({ items: [item(100)], total: 100 });
  assert.throws(() => advance(checkout, "paid"), /illegal checkout transition/);
  const next = advance(checkout, "address");
  assert.equal(checkout.state, "cart", "the input is not mutated");
  assert.equal(next.history[0].from, "cart");
  assert.equal(CHECKOUT_FLOWS.esewa.at(-1), "paid");
});

/* --------------------------------------------------------------- money */

test("money is integer paisa and formats without float drift", () => {
  assert.equal(rupees(123_400), 1234);
  assert.equal(formatNPR(123_400), "NPR 1,234");
  assert.equal(formatNPR(123_456), "NPR 1,234.56");
  assert.equal(formatNPR(0), "NPR 0");
  assert.equal(formatNPR(-1_200), "−NPR 12");
  assert.throws(() => formatNPR(12.5), /integer paisa/);
  assert.throws(() => rupees("100"), /integer paisa/);
});

test("the platform fee has a floor and rounds once", () => {
  assert.equal(platformFee(100_000), 2_000);
  assert.equal(platformFee(5_000), PLATFORM_FEE_MIN);
  assert.equal(platformFee(0), PLATFORM_FEE_MIN);
  assert.equal(platformFee(12_345), 247);
  assert.throws(() => platformFee(-1), /non-negative/);
});

test("delivery is base plus per-kilometre, rounded to paisa", () => {
  assert.equal(deliveryFee(0), 8_000);
  assert.equal(deliveryFee(2.4), 14_000);
  assert.equal(deliveryFee(2.41), 14_025);
  assert.throws(() => deliveryFee(-1), /non-negative/);
});

test("a quote breaks the total into four visible lines", () => {
  const value = quote({ items: [item(6_850_000), item(1_250_000, 2)], distanceKm: 2.4, discount: 10_000 });
  assert.equal(value.subtotal, 9_350_000);
  assert.equal(value.platformFee, 187_000);
  assert.equal(value.delivery, 14_000);
  assert.equal(value.total, 9_350_000 + 187_000 + 14_000 - 10_000);
  assert.throws(() => quote({ items: [] }), /at least one item/);
});

test("settlement adds up to the buyer's total", () => {
  const value = quote({ items: [item(100_000)], distanceKm: 1 });
  const split = settlement(value);
  assert.equal(split.seller, value.subtotal + value.delivery);
  assert.equal(split.platform, value.platformFee);
  assert.equal(split.check, split.total);
});

test("price input accepts the way people type money", () => {
  assert.equal(parsePriceInput("1,250"), 125_000);
  assert.equal(parsePriceInput("NPR 99.50"), 9_950);
  assert.equal(parsePriceInput(""), 0);
  assert.equal(parsePriceInput(1234), 123_400);
});

/* --------------------------------------------------------------- filters */

test("filters compose query, category, price and distance", () => {
  const result = applyFilters(LISTINGS, { category: "electronics", maxDistance: 3.5 });
  assert.equal(result.length, 1, "one electronics listing is inside 3.5 km");
  assert.ok(result.every((listing) => listing.category === "electronics" && listing.distanceKm <= 3.5));

  const cheap = applyFilters(LISTINGS, { maxPrice: 1_000_000 });
  assert.ok(cheap.every((listing) => listing.price <= 1_000_000));

  const verified = applyFilters(LISTINGS, { verifiedOnly: true });
  assert.ok(verified.every((listing) => listing.sellerVerified));
});

test("query matching requires every term and ignores case", () => {
  assert.equal(matchesQuery(LISTINGS[0], "IPHONE 128"), true);
  assert.equal(matchesQuery(LISTINGS[0], "iphone laptop"), false);
  assert.equal(matchesQuery(LISTINGS[0], ""), true);
  assert.ok(applyFilters(LISTINGS, { query: "study table" }).some((listing) => listing.id === "L-2040"));
});

test("sort orders are explicit and unknown sorts fail", () => {
  assert.equal(sortListings(LISTINGS, "priceAsc")[0].price <= sortListings(LISTINGS, "priceAsc")[1].price, true);
  assert.equal(sortListings(LISTINGS, "nearest")[0].distanceKm <= sortListings(LISTINGS, "nearest")[1].distanceKm, true);
  assert.equal(sortListings(LISTINGS, "newest")[0].createdAt >= sortListings(LISTINGS, "newest")[1].createdAt, true);
  assert.throws(() => sortListings(LISTINGS, "random"), /unknown sort/);
  assert.throws(() => applyFilters(LISTINGS, { category: "pets" }), /unknown category/);
});

test("facet counts and suggestions are computed from the same data", () => {
  const counts = facetCounts(LISTINGS);
  assert.equal(counts.all, LISTINGS.length);
  assert.equal(counts.electronics, 2);
  assert.equal(counts.mobiles, 1);
  const words = suggestions(LISTINGS, "iph");
  assert.deepEqual(words, ["iphone"]);
  assert.deepEqual(suggestions(LISTINGS, "i"), []);
});

/* --------------------------------------------------------------- cache */

test("the cache distinguishes fresh, stale and missing reads", () => {
  let clock = 1_000;
  const cache = createCache({ ttlMs: 500, now: () => clock });
  assert.equal(cache.read("feed").value, null);
  cache.set("feed", [1, 2, 3]);
  assert.deepEqual(cache.read("feed"), { value: [1, 2, 3], stale: false, ageMs: 0 });
  clock = 1_600;
  assert.equal(cache.get("feed"), null);
  assert.deepEqual(cache.read("feed"), { value: [1, 2, 3], stale: true, ageMs: 600 });
  assert.equal(cache.size(), 1);
  assert.equal(cache.invalidate("feed"), true);
  assert.equal(cache.read("feed").value, null);
});

test("cachedFetch returns cached content and updates in the background", async () => {
  let clock = 0;
  const cache = createCache({ ttlMs: 100, now: () => clock });
  cache.set("feed", ["old"]);
  clock = 150;
  let updated = null;
  const result = await cachedFetch(cache, "feed", async () => ["new"], (snapshot) => { updated = snapshot; });
  assert.deepEqual(result.cached, ["old"]);
  assert.equal(result.stale, true);
  assert.deepEqual(await result.request, ["new"]);
  assert.deepEqual(updated.value, ["new"]);
  assert.equal(updated.stale, false);
});

/* --------------------------------------------------------------- catalog data */

test("the case study data is complete and consistent", () => {
  assert.equal(LISTINGS.length, 8);
  assert.equal(new Set(LISTINGS.map((listing) => listing.id)).size, 8);
  assert.ok(LISTINGS.every((listing) => CATEGORIES.includes(listing.category)));
  assert.equal(SCREENS.length, 6);
  assert.equal(SCREENS.filter((screen) => screen.role === "buyer").length, 4);
  assert.equal(SCREENS.filter((screen) => screen.role === "seller").length, 2);
  assert.equal(SELLER.verified, true);
  assert.equal(SELLER_ORDERS.length, 3);
  assert.equal(PRODUCT.domain, "hamrosajhabazaar.com");
  assert.match(PRODUCT.status, /architecture sample/);
  for (const screen of SCREENS) {
    assert.ok(screen.route.startsWith("app/"), screen.id);
    assert.ok(screen.items.length >= 3, screen.id);
  }
});
