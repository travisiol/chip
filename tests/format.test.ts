import assert from "node:assert/strict";
import { test } from "node:test";
import { fmtAgo, fmtAmount, fmtCycle, fmtDuration, fmtEth, fmtPct, fmtUsd, shortAddress, shortHash } from "@/lib/format";
import { finish, type PriceProvider } from "@/lib/pricing/types";

test("money, amounts and percentages", () => {
  assert.equal(fmtUsd(18482.14), "$18,482.14");
  assert.equal(fmtUsd(1000, 0), "$1,000");
  assert.equal(fmtUsd(null), "—");
  assert.equal(fmtAmount(17.32), "17.32");
  assert.equal(fmtAmount(0.22034, 4), "0.2203");
  assert.equal(fmtPct(82.14), "82.1%");
  assert.equal(fmtEth(0.00001), "<0.0001 ETH");
  assert.equal(fmtEth(0.0021), "0.0021 ETH");
  assert.equal(fmtEth(0), "0 ETH");
});

test("cycles, hashes, addresses, durations", () => {
  assert.equal(fmtCycle(24), "#024");
  assert.equal(shortHash("0x83abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234591A"), "0x83ab…91A");
  assert.equal(shortAddress("0x322f0929c4625ed5bad873c95208d54e1c003b2d"), "0x322f…3b2d");
  assert.equal(fmtDuration(3 * 3_600_000 + 41 * 60_000), "03h 41m");
  assert.equal(fmtDuration(2 * 60_000 + 47_000), "02m 47s");
  assert.equal(fmtAgo(1_000_000, 1_048_000), "48s ago");
  assert.equal(fmtAgo(0, 48 * 60_000), "48m ago");
});

test("a price quote is flagged stale by the provider's freshness budget", () => {
  const provider: PriceProvider = { id: "yahoo", label: "Yahoo", freshForMs: 60_000, supports: () => true, fetch: async () => null };
  const fresh = finish(provider, { symbol: "NVDA", price: 362, publishedAt: Date.now() - 10_000 });
  const stale = finish(provider, { symbol: "NVDA", price: 362, publishedAt: Date.now() - 120_000 });
  assert.equal(fresh?.stale, false);
  assert.equal(stale?.stale, true);
  assert.equal(finish(provider, { symbol: "NVDA", price: 0, publishedAt: Date.now() }), null);
  assert.equal(finish(provider, null), null);
});
