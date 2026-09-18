"use client";

import { motion } from "framer-motion";
import { AddressRow } from "@/components/ui/AddressRow";
import { DemoChip } from "@/components/ui/DemoChip";
import { CHAIN_ID, RPC_URL } from "@/config/chains";
import { chipConfig } from "@/config/chip";
import { CHIP_TOKEN, EXECUTION_CONTRACT, NVDA_TOKEN, PONS, RESERVE_WALLET, ROUTING_CONTRACT } from "@/config/contracts";
import { fmtAgo, fmtUsd } from "@/lib/format";
import { useMounted, useNow } from "@/lib/hooks";
import { reveal, revealDelayed } from "@/lib/motion";
import { useChip } from "@/lib/store/chip";

/**
 * VERIFY THE CORE. Every address the system touches, the routing allocation
 * as the venue implements it, and the price source — only what is actually
 * configured, in monospace, with COPY and VIEW EXPLORER.
 */
export function TransparencySection() {
  const mounted = useMounted();
  const feeFlow = useChip((s) => s.feeFlow);
  const token = useChip((s) => s.token);
  const nvda = useChip((s) => s.prices.NVDA);
  const eth = useChip((s) => s.prices.ETH);
  const mode = useChip((s) => s.mode);
  const now = useNow();

  const creatorShare = feeFlow ? ((feeFlow.feeBps * (10_000 - feeFlow.protocolShareBps)) / 10_000 + feeFlow.creatorTaxBps) / 100 : null;
  const protocolShare = feeFlow ? (feeFlow.feeBps * feeFlow.protocolShareBps) / 10_000 / 100 : null;

  return (
    <section id="transparency" className="relative mx-auto max-w-[1440px] px-5 py-24 md:px-8 md:py-32">
      <motion.div {...reveal}>
        <div className="label">Transparency</div>
        <h2 className="display mt-3 text-[clamp(34px,5vw,64px)]">VERIFY THE CORE.</h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-silver">
          Addresses as configured, allocation as implemented on the venue, prices with their source. What is not configured says so.
        </p>
      </motion.div>

      <motion.div className="mt-12" {...revealDelayed(0.05)}>
        <AddressRow label="CHIP contract" address={CHIP_TOKEN} token tag={CHIP_TOKEN ? "CONFIGURED" : "PENDING"} note={token && mounted && mode === "live" ? `${token.name} · ${token.symbol} · ${token.graduated ? "graduated" : "on curve"}` : "The CHIP ERC-20 on Robinhood Chain."} />
        <AddressRow label="Reserve wallet" address={RESERVE_WALLET} tag={RESERVE_WALLET ? "CONFIGURED" : "PENDING"} note="Receives routed fees, holds the NVDA Stock Tokens." />
        <AddressRow label="NVDA-linked token contract" address={NVDA_TOKEN} token tag="VERIFIED" note="NVIDIA • Robinhood Token — the NVDA Stock Token on Robinhood Chain. Tokenized NVDA exposure, not NVIDIA shares." />
        <AddressRow label="Execution contract" address={EXECUTION_CONTRACT} tag={EXECUTION_CONTRACT ? "CONFIGURED" : "PENDING"} note="Executes the NVDA purchase once the core reaches its target." />
        {ROUTING_CONTRACT ? <AddressRow label="Routing contract" address={ROUTING_CONTRACT} tag="CONFIGURED" note="Splits fees in front of the reserve." /> : null}
        {token?.curve && mode === "live" ? <AddressRow label="Bonding curve" address={token.curve} tag="READ" note="Pons V2 curve the trades and fees come from." /> : null}
        <AddressRow label="Venue escrow" address={PONS.feeEscrow} tag="VERIFIED" note="Pons V2 fee escrow: swept creator fees waiting to be claimed by the reserve." />
      </motion.div>

      <motion.div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3" {...revealDelayed(0.1)}>
        <div>
          <div className="label flex items-center gap-2">
            Routing allocation {mode === "demo" ? <DemoChip label="DEMO ASSUMPTION" /> : null}
          </div>
          {mounted && feeFlow ? (
            <dl className="mono mt-3 space-y-1.5 text-[13px]">
              <div className="flex justify-between gap-4 border-t border-graphite pt-2">
                <dt className="text-silver">{creatorShare?.toFixed(2)}% of each trade</dt>
                <dd className="text-energy">→ NVDA reserve</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-graphite pt-2">
                <dt className="text-silver">{protocolShare?.toFixed(2)}% of each trade</dt>
                <dd className="text-muted">→ venue protocol</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-graphite pt-2 text-[11px] text-muted">
                <dt>base fee {feeFlow.feeBps} bps · creator tax {feeFlow.creatorTaxBps} bps</dt>
                <dd>protocol share {feeFlow.protocolShareBps / 100}%</dd>
              </div>
            </dl>
          ) : (
            <p className="mono mt-3 text-[12px] text-muted">Read from the curve once the token is configured.</p>
          )}
        </div>
        <div>
          <div className="label">Price source</div>
          <dl className="mono mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between gap-4 border-t border-graphite pt-2">
              <dt className="text-silver">NVDA</dt>
              <dd className="text-right text-ink">
                {mounted && nvda ? fmtUsd(nvda.price, 2) : "—"}
                <div className="text-[10px] text-muted">{mounted && nvda ? `${nvda.sourceLabel}${now ? ` · ${fmtAgo(nvda.publishedAt, now)}` : ""}${nvda.stale ? " · DELAYED" : ""}` : "no source answering"}</div>
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-graphite pt-2">
              <dt className="text-silver">ETH</dt>
              <dd className="text-right text-ink">
                {mounted && eth ? fmtUsd(eth.price, 2) : "—"}
                <div className="text-[10px] text-muted">{mounted && eth ? `${eth.sourceLabel}${now ? ` · ${fmtAgo(eth.publishedAt, now)}` : ""}${eth.stale ? " · DELAYED" : ""}` : "no source answering"}</div>
              </dd>
            </div>
            <div className="border-t border-graphite pt-2 text-[11px] text-muted">Pyth Hermes → Yahoo Finance (delayed) → Pyth on-chain (flagged when stale). Never a hardcoded value.</div>
          </dl>
        </div>
        <div>
          <div className="label">Network</div>
          <dl className="mono mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between gap-4 border-t border-graphite pt-2">
              <dt className="text-silver">Chain</dt>
              <dd className="text-ink">Robinhood Chain · {CHAIN_ID}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-graphite pt-2">
              <dt className="text-silver">RPC</dt>
              <dd className="truncate text-ink">{RPC_URL.replace(/^https?:\/\//, "")}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-graphite pt-2">
              <dt className="text-silver">Execution threshold</dt>
              <dd className="text-ink">{fmtUsd(chipConfig.targetInputUsd, 0)}</dd>
            </div>
          </dl>
        </div>
      </motion.div>
    </section>
  );
}
