# CHIP — architecture

**TRADE. POWER. BUILD NVDA.** Every trade powers the chip.

The whole site is one loop, and every module below is a view of that loop:

```
TRADES → FEES → THE CHIP POWERS UP → 100 % → NVDA STOCK TOKEN PURCHASE → THE RESERVE GROWS → RESET → NEXT CYCLE
```

## 1. Visual system

| Token | Value | Use |
| --- | --- | --- |
| `void` | `#050606` | page background |
| `void-2` | `#0A0C0D` | panels, navbar when scrolled |
| `graphite` | `#15191B` | rules, borders |
| `metal` | `#1C2124` | raised borders, dark metal |
| `silver` | `#B8C0C4` | secondary text, cold silver |
| `aluminum` | `#E5EAEC` | bright aluminum, hover text |
| `ink` | `#F4F6F5` | primary text |
| `muted` | `#7C8587` | labels |
| `energy` | `#B7FF39` | active circuitry — the only saturated colour on the page |
| `energy-2` | `#72FF7A` | secondary energy, pulses |
| `energy-deep` | `#1D6F32` | dim/idle circuitry, deep glow |
| `cyan` | `#7CEEFF` | optional detail (signal packets at the moment they land) |

The page stays black / graphite / silver / white. Green is *power*: it appears only where a circuit is live.

Type: **Geist** (grotesk; display weight 600, tight tracking, uppercase for headlines) and **Geist Mono** for addresses, hashes, stats, cycle ids, timestamps — nothing else.

Copy: short, sharp, technical, all English. `CORE POWER 84.2%`, `NEXT NVDA EXECUTION $842 / $1,000`, `CORE FULL.`, `EXECUTING NVDA.`, `RESERVE UPDATED.`, `NEW CYCLE STARTED.`

Logo: a square processor outline holding four sharp traces that read as a C — top, left, bottom, and the core lead coming in from the open side — with a small core block in the middle. One generator (`components/brand/mark.ts`) feeds the React mark, `app/icon.svg`, the OG image and the intro.

## 2. Component tree

```
app/layout            Providers → Background · Intro · Navbar · <main> · Footer · Toaster
app/page              Hero → HowItWorks → CoreMap → ReserveSection → ActivitySection → Transparency → FinalCta
app/reserve           ReservePage        (stack + stats + full processing history)
app/activity          ActivityPage       (full feed + trade list)
app/dashboard         DashboardPage      (wallet: CHIP / NVDA-linked reserve exposure, read-only)

components/chip       ChipStage (dynamic) → ChipScene (R3F) | ChipFallback (SVG) · ChipHud · CoreInput (popups) · chipShaders
components/reserve    ReserveStack (R3F wafers) · ReserveStats · CycleHistory · CurrentCycle
components/activity   ActivityFeed (5 rows, landing) · ActivityPage
components/wallet     ConnectButton · ConnectDialog · DashboardPage
components/charts     ReserveChart (SVG, no chart lib needed)
components/ui         Label · Num (smooth) · AddressRow · StateNotice · ModeBadge · SceneBoundary · DemoChip
components/brand      ChipMark · mark.ts
components/layout     Navbar · Background · Footer · Intro · IntroOverlay · Toaster
```

Rule: components read the **store**; nothing in `components/` calls viem. All chain logic is in `lib/blockchain`, all price logic in `lib/pricing`, the simulation in `lib/demo`, the polling in `lib/live`.

## 3. State machine

```
             ┌──────────────────────────────────────────────┐
             ▼                                              │
IDLE ─▶ POWERING ─(input ≥ target)─▶ FULL ─▶ EXECUTING ─▶ CONFIRMED ─▶ RESETTING ─┘
                                      │                        ▲
                                      └──(execution seen)──────┘
```

`lib/chip/machine.ts` owns the transitions (`nextStatus(status, event)`) and the timed
signature sequence (`runExecutionSequence`): FULL 900 ms (all paths lit, white-green flash) →
EXECUTING 1 900 ms (progress line) → CONFIRMED 1 700 ms (+$1,000 NVDA, reserve counts up) →
RESETTING 1 500 ms (the chip powers down) → POWERING with the next cycle id.

Every animation reads `status` (and `flashAt`) from the store — no scattered conditions.

## 4. DEMO vs LIVE

- `mode` lives in the store; the navbar badge shows **DEMO** or **LIVE**.
- **LIVE** is only offered when `NEXT_PUBLIC_CHIP_TOKEN` and `NEXT_PUBLIC_RESERVE_WALLET` are set. It shows only real contract reads, wallet values, on-chain events, price data (with its source), transaction hashes and reserve balances. Nothing is smoothed or invented; unknown fields render `—`.
- **DEMO** (`lib/demo`) simulates fee events, core power, cycles, executions and reserve growth on the same store. Prices are real when `/api/price` answers (and say so); nothing carries a transaction hash; every data section carries a `DEMO DATA` chip.
- The two never mix: switching modes wipes the store and restarts the engine.

## 5. Blockchain abstraction (`lib/blockchain`)

| Function | Reads |
| --- | --- |
| `getChipState()` / `getCorePower()` | ETH in the reserve wallet + Pons escrow claimable + creator share of the curve's unswept fees, valued in USD at the live ETH price |
| `getReserveBalance()` | NVDA Stock Token `balanceOf(reserve)` |
| `getCycleHistory()` | NVDA `Transfer(to = reserve)` logs, 400k-block chunks, incremental |
| `getCurrentCycle()` | derived: completed cycles + 1, started at the last execution |
| `getCoreActivity()` | `CurveBuy` / `CurveSell` on the CHIP curve, fee share to the core |
| `getFeeFlow()` | `feeBps`, `creatorTaxBps`, `protocolFeeShareBps`, `quoteFeeBalance` |
| `getNVDAReferencePrice()` | `lib/pricing`: Pyth Hermes (key) → Yahoo (delayed) → Pyth on-chain (flagged stale) |

The browser talks to the chain through the same-origin relay `app/api/rpc` (the public
RPC's rate-limit responses break CORS). Prices come through `app/api/price` so keys stay
server-side.

## 6. Reserve data model (`types/`)

```ts
ChipState   { corePowerPercent, currentInputUsd, targetInputUsd, currentCycle, status, lastUpdated }
ReserveState{ reserveValueUsd, nvdaTokenBalance, totalCycles, totalRouted, lastExecution }
Cycle       { id, startedAt, completedAt, inputUsd, nvdaAmount, executionPrice, txHash, status }
ActivityItem{ id, kind: input | power | execution | cycle | system, title, value, at, txHash }
```

Cycles are **derived**, never stored: every NVDA inflow closes one, the chip is the open one.
Fields the chain does not state (USD paid, execution price) stay `null` in LIVE — the UI shows `—`.
