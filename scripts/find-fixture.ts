// Lists NVDA receivers with a wallet-like cadence (5–40 inflows in the last 20k blocks) and whether they are contracts.
import type { Address } from "viem";
import { NVDA_TOKEN } from "@/config/contracts";
import { erc20Abi } from "@/lib/blockchain/abis";
import { publicClient } from "@/lib/blockchain";

const client = publicClient();
const head = await client.getBlockNumber();
const logs = await client.getLogs({ address: NVDA_TOKEN, event: erc20Abi[5], fromBlock: head - 20_000n, toBlock: head });
const counts = new Map<string, number>();
for (const l of logs) if (l.args.to) counts.set(l.args.to, (counts.get(l.args.to) ?? 0) + 1);
const mid = [...counts.entries()].filter(([, n]) => n >= 5 && n <= 40).sort((a, b) => b[1] - a[1]).slice(0, 8);
for (const [a, n] of mid) {
  const code = await client.getCode({ address: a as Address });
  const bal = await client.readContract({ address: NVDA_TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [a as Address] });
  console.log(a, `x${n}`, code && code !== "0x" ? "contract" : "EOA", `${(Number(bal) / 1e18).toFixed(4)} NVDA`);
}
