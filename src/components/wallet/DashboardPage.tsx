"use client";

import { ArrowUpRight } from "lucide-react";
import { formatUnits, type Address } from "viem";
import { useBalance, useConnection, useReadContract } from "wagmi";
import { CurrentCycle } from "@/components/reserve/CurrentCycle";
import { DemoChip } from "@/components/ui/DemoChip";
import { Label } from "@/components/ui/Label";
import { StateNotice } from "@/components/ui/StateNotice";
import { TradeButton } from "@/components/ui/TradeButton";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { CHAIN_ID, explorer } from "@/config/chains";
import { CHIP_TOKEN, NVDA_TOKEN } from "@/config/contracts";
import { erc20Abi } from "@/lib/blockchain/abis";
import { fmtAmount, fmtEth, fmtPct, fmtUsd, shortAddress } from "@/lib/format";
import { useMounted } from "@/lib/hooks";
import { useChip } from "@/lib/store/chip";

/**
 * /dashboard — the visitor's wallet against the chip. Wallet balances are
 * always real (it is their wallet, read from the chain); CHIP figures need
 * the token to be configured; the reserve exposure is a pro-rata view of
 * the reserve, never a claim on it. Nothing is signed here.
 */
export function DashboardPage() {
  const mounted = useMounted();
  const { address, isConnected, chainId } = useConnection();
  const wrongChain = isConnected && chainId !== CHAIN_ID;

  return (
    <div className="mx-auto max-w-[1440px] px-5 pt-28 pb-24 md:px-8">
      <div className="label">Dashboard</div>
      <h1 className="display mt-3 text-[clamp(40px,6vw,88px)]">YOUR WALLET. THE CHIP.</h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-silver">Balances are read from Robinhood Chain. Connecting never asks for a signature.</p>

      {!mounted || !isConnected || !address ? (
        <div className="panel mt-12 flex flex-col items-start gap-5 p-8">
          <Label>Connect a wallet</Label>
          <p className="max-w-md text-sm leading-relaxed text-silver">See your CHIP balance, your share of the supply, your ETH and NVDA Stock Token balances, and the reserve next to them.</p>
          <ConnectButton size="md" />
        </div>
      ) : wrongChain ? (
        <StateNotice className="mt-12" kind="error" title="WRONG NETWORK" body="Switch to Robinhood Chain (4663) to read your wallet." />
      ) : (
        <Position address={address} />
      )}

      <div className="mt-12">
        <CurrentCycle />
      </div>
    </div>
  );
}

function Position({ address }: { address: Address }) {
  const eth = useBalance({ address, chainId: CHAIN_ID });
  const chip = useReadContract({ address: CHIP_TOKEN ?? undefined, abi: erc20Abi, functionName: "balanceOf", args: [address], chainId: CHAIN_ID, query: { enabled: Boolean(CHIP_TOKEN) } });
  const supply = useReadContract({ address: CHIP_TOKEN ?? undefined, abi: erc20Abi, functionName: "totalSupply", chainId: CHAIN_ID, query: { enabled: Boolean(CHIP_TOKEN) } });
  const decimals = useReadContract({ address: CHIP_TOKEN ?? undefined, abi: erc20Abi, functionName: "decimals", chainId: CHAIN_ID, query: { enabled: Boolean(CHIP_TOKEN) } });
  const nvda = useReadContract({ address: NVDA_TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [address], chainId: CHAIN_ID });
  const reserve = useChip((s) => s.reserve);
  const mode = useChip((s) => s.mode);

  const dec = decimals.data ?? 18;
  const chipBalance = chip.data != null ? Number(formatUnits(chip.data, dec)) : null;
  const share = chip.data != null && supply.data != null && supply.data > 0n ? (Number(chip.data) / Number(supply.data)) * 100 : null;
  const exposure = share != null && reserve.reserveValueUsd != null ? (reserve.reserveValueUsd * share) / 100 : null;

  return (
    <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="panel p-6">
        <Label>Wallet</Label>
        <div className="mono mt-3 text-sm text-ink">{shortAddress(address, 10, 8)}</div>
        <a href={explorer.address(address)} target="_blank" rel="noreferrer" className="label mt-2 inline-flex items-center gap-1 hover:text-ink">
          EXPLORER <ArrowUpRight size={11} />
        </a>
        <Label className="mt-6">ETH balance</Label>
        <div className="num mt-2 text-2xl">{eth.data ? fmtEth(Number(formatUnits(eth.data.value, 18))) : eth.isError ? <span className="text-energy-2">unavailable</span> : "…"}</div>
        <Label className="mt-6">NVDA Stock Token</Label>
        <div className="num mt-2 text-2xl">{nvda.data != null ? `${fmtAmount(Number(formatUnits(nvda.data, 18)), 4)} NVDA` : nvda.isError ? <span className="text-energy-2">unavailable</span> : "…"}</div>
      </div>

      <div className="panel p-6">
        <Label>CHIP balance</Label>
        {CHIP_TOKEN ? (
          <>
            <div className="num mt-2 text-2xl">{chipBalance != null ? `${fmtAmount(chipBalance, 2)} CHIP` : chip.isError ? <span className="text-energy-2">unavailable</span> : "…"}</div>
            <Label className="mt-6">Share of supply</Label>
            <div className="num mt-2 text-2xl">{share != null ? fmtPct(share, 4) : "…"}</div>
          </>
        ) : (
          <>
            <div className="mono mt-3 text-sm text-muted">CHIP TOKEN NOT CONFIGURED</div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">Set NEXT_PUBLIC_CHIP_TOKEN once the token is launched; balances are then read from the ERC-20.</p>
          </>
        )}
        <div className="mt-6">
          <TradeButton size="sm" />
        </div>
      </div>

      <div className="panel p-6">
        <Label className="flex items-center gap-2">
          Reserve next to you <DemoChip />
        </Label>
        <div className="num mt-2 text-2xl">{reserve.reserveValueUsd != null ? fmtUsd(reserve.reserveValueUsd, 0) : "—"}</div>
        <div className="mono mt-1 text-[12px] text-silver">{fmtAmount(reserve.nvdaTokenBalance, 4)} NVDA · {reserve.totalCycles} cycles</div>
        <Label className="mt-6">Pro-rata view</Label>
        <div className="num mt-2 text-2xl">{exposure != null ? fmtUsd(exposure, 2) : CHIP_TOKEN ? "…" : "—"}</div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Your share of supply applied to the reserve value{mode === "demo" ? " (demo reserve)" : ""}. A view, not a claim: the reserve is held by the reserve wallet and nothing here confers ownership of NVIDIA shares.
        </p>
      </div>
    </div>
  );
}
