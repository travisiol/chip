# CHIP

**TRADE. POWER. BUILD NVDA.** — Every trade powers the chip.

A Robinhood Chain token ecosystem built around one loop:

```
TRADES → FEES → THE CHIP POWERS UP → 100 % → NVDA STOCK TOKEN PURCHASE → THE RESERVE GROWS → RESET → NEXT CYCLE
```

The chip is the mechanism, the interface and the brand. A visitor should understand it in five seconds: people trade CHIP, the core powers up, at 100 % the system executes NVDA, the reserve grows, a new cycle starts.

> CHIP is not affiliated with NVIDIA Corporation or Robinhood Markets, Inc. The reserve holds **NVDA Stock Tokens** — a tokenized asset on Robinhood Chain that tracks NVDA — not NVIDIA shares. Holding CHIP confers no ownership of NVIDIA shares.

## Run it

```bash
npm install
npm run dev        # http://localhost:3713 — DEMO mode until the contracts are configured
```

```bash
npm test           # 18 unit tests: state machine, trace network, cycles, store, formatting
npm run lint       # eslint (React Compiler rules)
npm run typecheck
npm run build
npm run live-check # every chain read on real Robinhood Chain addresses (~25 s)
```

Deploys as-is on Vercel (single Next app at the repo root; the two API routes need the Node runtime, so no static export).

## DEMO / LIVE

The navbar badge says which one you are looking at.

- **DEMO** — the default until the contracts exist. Fee events, core power, cycles, executions and the reserve are simulated on the same store LIVE feeds later; prices are real when `/api/price` answers. Nothing carries a transaction hash; every simulated figure is marked `DEMO DATA`.
- **LIVE** — offered once `NEXT_PUBLIC_CHIP_TOKEN` and `NEXT_PUBLIC_RESERVE_WALLET` are set. Only real contract values, wallet balances, on-chain events, prices with their source, transaction hashes and reserve balances. Fields the chain does not state (USD paid, execution price) render `—`.

The two never mix: switching wipes the store and restarts the engine. The choice is remembered per browser.

To see LIVE mode before CHIP is launched, `.env.local` carries a commented fixture block: an active Pons V2 token standing in for CHIP and a real wallet that accumulates NVDA Stock Tokens (`npm run live-check` finds one — `node --import ./tests/register.mjs scripts/find-fixture.ts` lists candidates).

## How it is built

- Next 16 · React 19 · TypeScript · Tailwind 4 · Framer Motion · React Three Fiber / three · wagmi 3 · viem · TanStack Query · zustand · lucide.
- `docs/ARCHITECTURE.md` — the visual system, component tree, state machine, DEMO/LIVE contract, blockchain abstraction and data model, written before the code.
- `src/lib/chip/traces.ts` — the circuit network every view shares (hero, SVG fallback, core map, intro): pins → fan-out traces → ring bus → core leads, plus the execution bus on the right. Deterministic, tested.
- `src/components/chip/ChipScene.tsx` — the processor: ceramic package, brushed frame, micro pins, silicon die, routed traces driven by one `uPower` uniform, signal packets riding their pin's route to the core, the execution leaving through the bus. No assets: every texture is painted at runtime.
- `src/lib/chip/machine.ts` — `IDLE → POWERING → FULL → EXECUTING → CONFIRMED → RESETTING → POWERING`, and the timed signature sequence every animation reads.
- `src/lib/blockchain/` — `getChipState`, `getCorePower`, `getReserveBalance`, `getCurrentCycle`, `getCycleHistory`, `getCoreActivity`, `getFeeFlow`; `src/lib/pricing/` — `getNVDAReferencePrice` through Pyth Hermes (key) → Yahoo (delayed) → Pyth on-chain (flagged when stale).
- The browser reaches the chain through `app/api/rpc` (the public RPC's rate-limit responses break CORS); prices come through `app/api/price` so keys stay server-side.

### What LIVE mode reads

| Figure | Source |
| --- | --- |
| Core power | ETH in the reserve wallet + Pons escrow claimable + creator share of the curve's unswept fees, valued at the live ETH price |
| Cycle history | `Transfer(NVDA → reserve)` logs, 400k-block chunks, incremental after the first scan |
| Live activity | `CurveBuy` / `CurveSell` on the CHIP curve, fee share to the core |
| Routing allocation | `feeBps`, `protocolFeeShareBps`, `creatorTaxBps` from the curve |
| Reserve value | NVDA balance × the reference price, with the source and its age |

Verified on chain (`npm run live-check`): the NVDA Stock Token at `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` answers `NVIDIA • Robinhood Token / NVDA / 18`; Pons V2 fee flow 1 % base, 30 % protocol share → 70 bps to the core; real inflows decode with their hashes.

## Before mainnet

1. Launch CHIP on Pons V2 with the reserve wallet as `creatorFeeRecipient`; set `NEXT_PUBLIC_CHIP_TOKEN`, `NEXT_PUBLIC_RESERVE_WALLET`, `NEXT_PUBLIC_RESERVE_START_BLOCK`.
2. Deploy the execution contract (the site never buys anything itself — `FULL` waits for it) and set `NEXT_PUBLIC_EXECUTION_CONTRACT`.
3. Get a Pyth Hermes key (`PYTH_API_KEY`) for sub-second prices; Yahoo is ~15 min delayed.
4. Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for mobile wallets; `NEXT_PUBLIC_SITE_URL` for the share card.
5. Legal review of the NVDA wording and the disclaimer.

## QA hooks (development only)

`window.__chip.qa.fill(96)` pushes the core to 96 %, `window.__chip.qa.execute()` plays the signature moment, `window.__chip.qa.fee(12.81)` sends a signal into a pin. `npm run capture` screenshots every route headlessly; `npm run signature` records the signature moment as a contact sheet (`docs/captures/signature.png`). `?intro=1` replays the opening, `?intro=0` skips it.
