import { CHIP_TOKEN, NVDA_TOKEN } from "./contracts";

export const CHIP = {
  symbol: "CHIP",
  name: "CHIP",
  decimals: 18,
  address: CHIP_TOKEN,
} as const;

/**
 * The reserve asset. Wording matters: this is an NVDA Stock Token on Robinhood
 * Chain — tokenized NVDA exposure — not a share of NVIDIA Corporation, and
 * CHIP is not affiliated with NVIDIA.
 */
export const NVDA = {
  symbol: "NVDA",
  name: "NVIDIA • Robinhood Token",
  shortName: "NVDA Stock Token",
  decimals: 18,
  address: NVDA_TOKEN,
} as const;

export const ETH = { symbol: "ETH", decimals: 18 } as const;
