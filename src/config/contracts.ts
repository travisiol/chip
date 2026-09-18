import { getAddress, isAddress, type Address, type Hex } from "viem";

/**
 * Every address CHIP touches, in one place, all from the environment.
 *
 * VERIFIED values were read from Robinhood Chain (chain id 4663) through the
 * public RPC. CONFIGURE values are empty until the token is launched and the
 * reserve wallet exists — LIVE mode is not offered until they are set, and
 * the transparency section only lists what is actually configured.
 */

export interface ConfigIssue {
  key: string;
  message: string;
}

export const configIssues: ConfigIssue[] = [];

function parseAddress(key: string, raw: string | undefined, fallback?: Address): Address | null {
  const value = raw?.trim();
  if (!value) return fallback ?? null;
  if (!isAddress(value)) {
    configIssues.push({ key, message: `${key} is not a valid address (${value.slice(0, 12)}...)` });
    return fallback ?? null;
  }
  return getAddress(value);
}

/** CONFIGURE — the CHIP ERC-20. A Pons V2 launch on Robinhood Chain is the assumed venue. */
export const CHIP_TOKEN = parseAddress("NEXT_PUBLIC_CHIP_TOKEN", process.env.NEXT_PUBLIC_CHIP_TOKEN);

/** CONFIGURE — where routed fees land and where the NVDA Stock Tokens are held. */
export const RESERVE_WALLET = parseAddress("NEXT_PUBLIC_RESERVE_WALLET", process.env.NEXT_PUBLIC_RESERVE_WALLET);

/** CONFIGURE (optional) — the contract or account that executes purchases once the core is full. */
export const EXECUTION_CONTRACT = parseAddress("NEXT_PUBLIC_EXECUTION_CONTRACT", process.env.NEXT_PUBLIC_EXECUTION_CONTRACT);

/** CONFIGURE (optional) — an on-chain router/splitter in front of the reserve, if one is deployed. */
export const ROUTING_CONTRACT = parseAddress("NEXT_PUBLIC_ROUTING_CONTRACT", process.env.NEXT_PUBLIC_ROUTING_CONTRACT);

/**
 * VERIFIED — "NVIDIA • Robinhood Token", symbol NVDA, 18 decimals: the NVDA
 * Stock Token issued on Robinhood Chain (tokenized NVDA exposure, not a share
 * of NVIDIA Corporation). Read through name()/symbol()/decimals().
 */
export const NVDA_TOKEN = parseAddress("NEXT_PUBLIC_NVDA_TOKEN", process.env.NEXT_PUBLIC_NVDA_TOKEN, "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC") as Address;

/** VERIFIED — Pons V2 factory and its fee escrow (factory.feeEscrow()), where swept creator fees wait to be claimed. */
export const PONS = {
  factory: "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e" as Address,
  feeEscrow: parseAddress("NEXT_PUBLIC_PONS_ESCROW", process.env.NEXT_PUBLIC_PONS_ESCROW, "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e") as Address,
  appUrl: (process.env.NEXT_PUBLIC_PONS_APP_URL?.trim() || "https://www.ponsfamily.com").replace(/\/$/, ""),
} as const;

/**
 * VERIFIED — Pyth on Robinhood Chain (ERC1967 proxy, v1.4.5). Only BTC/ETH have
 * ever been pushed on-chain and the prints can be days old: the on-chain read
 * is a last resort, always shown with its age.
 */
export const PYTH = {
  address: "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a" as Address,
  feeds: {
    /** Crypto.ETH/USD */
    ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace" as Hex,
    /** Equity.Index.NVDA/USD — "Pyth price in USD for NVDA 24/7". */
    NVDA: "0xa470c4ac46f44b547b2cba52338f311fb642b79375ce5f0cfd5cb5b99227b852" as Hex,
  },
} as const;

/** CONFIGURE — WalletConnect Cloud project id; without it only injected wallets are offered. */
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || "";

/** Everything LIVE mode needs before it can be honest. */
export const liveConfigured = Boolean(CHIP_TOKEN && RESERVE_WALLET);
