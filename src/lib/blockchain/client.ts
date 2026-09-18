import { createPublicClient, fallback, http, type PublicClient } from "viem";
import { BROWSER_RPC_URL, RPC_FALLBACKS, RPC_URL, isBrowser, robinhoodChain } from "@/config/chains";

let client: PublicClient | undefined;

/**
 * One shared read-only client. In the browser every call goes through the
 * same-origin relay; in Node the official RPC first (it answers wide
 * eth_getLogs), public fallbacks after it.
 */
export function publicClient(): PublicClient {
  if (!client) {
    client = createPublicClient({
      chain: robinhoodChain,
      transport: isBrowser()
        ? http(BROWSER_RPC_URL, { batch: { wait: 16 }, timeout: 25_000, retryCount: 2, retryDelay: 800 })
        : fallback(
            [http(RPC_URL, { batch: true, timeout: 20_000, retryCount: 2 }), ...RPC_FALLBACKS.map((u) => http(u, { batch: true, timeout: 15_000, retryCount: 1 }))],
            { rank: false },
          ),
    }) as PublicClient;
  }
  return client;
}

/** A human sentence for the UI, never the raw viem dump. */
export function describeRpcError(e: unknown): string {
  const err = e as { shortMessage?: string; message?: string; name?: string };
  const msg = err?.shortMessage ?? err?.message ?? "Unknown error";
  if (/timeout|timed out/i.test(msg)) return "The RPC did not answer in time.";
  if (/429|rate limit/i.test(msg)) return "The RPC is rate-limiting requests.";
  if (/fetch|network|ECONN/i.test(msg)) return "Network error while reaching the RPC.";
  return msg.split("\n")[0].slice(0, 140);
}
