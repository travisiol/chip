import { parseAbi } from "viem";

/** Standard ERC-20 surface, including the Transfer event the cycle history is built from. */
export const erc20Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

/** A Pons V2 launcher token knows its bonding curve. */
export const ponsTokenAbi = parseAbi(["function curve() view returns (address)", "function deployer() view returns (address)"]);

/**
 * Pons V2 bonding curve — VERIFIED against live logs and eth_calls on
 * 2026-09-18 (VOLT, same venue): both trade events have (sender, recipient) indexed and four
 * data words; the views below all answer on a live curve.
 */
export const ponsCurveAbi = parseAbi([
  "function feeBps() view returns (uint256)",
  "function creatorTaxBps() view returns (uint256)",
  "function protocolFeeShareBps() view returns (uint256)",
  "function quoteFeeBalance() view returns (uint256)",
  "function getReserves() view returns (uint256 quoteReserve, uint256 tokenReserve)",
  "function realQuoteReserve() view returns (uint256)",
  "function graduated() view returns (bool)",
  "function deployer() view returns (address)",
  "function token() view returns (address)",
  "event CurveBuy(address indexed sender, address indexed recipient, uint256 quoteIn, uint256 tokensOut, uint256 fee, uint256 snipeTax)",
  "event CurveSell(address indexed sender, address indexed recipient, uint256 tokensIn, uint256 quoteOut, uint256 fee, uint256 snipeTax)",
]);

/** Pons fee escrow: swept creator fees waiting to be claimed. */
export const ponsEscrowAbi = parseAbi(["function balanceOf(address account) view returns (uint256)"]);

/** Pyth (IPyth) — only the unsafe read; freshness is judged by the caller. */
export const pythAbi = parseAbi([
  "function getPriceUnsafe(bytes32 id) view returns (int64 price, uint64 conf, int32 expo, uint256 publishTime)",
]);

