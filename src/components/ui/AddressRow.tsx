"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { explorer } from "@/config/chains";
import { shortAddress } from "@/lib/format";
import { toast } from "@/lib/toast";

interface Props {
  label: string;
  address: string | null;
  /** Shown when the address is a token contract (explorer /token route). */
  token?: boolean;
  /** One line of context under the label. */
  note?: string;
  /** VERIFIED / CONFIGURE hint. */
  tag?: string;
}

/** One line of the transparency table: label, mono address, COPY, VIEW EXPLORER. */
export function AddressRow({ label, address, token, note, tag }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast({ kind: "info", title: `${label} copied` });
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast({ kind: "error", title: "Could not copy", body: "Clipboard access was refused." });
    }
  };
  return (
    <div className="row grid-cols-1 sm:grid-cols-[190px_minmax(0,1fr)_auto]">
      <div>
        <div className="label flex items-center gap-2">
          {label}
          {tag ? <span className="chip h-4 px-1.5 text-[8px]">{tag}</span> : null}
        </div>
        {note ? <div className="mt-1 text-[11px] text-muted">{note}</div> : null}
      </div>
      <div className="mono min-w-0 text-[12px] leading-relaxed">
        {address ? (
          <>
            <span className="hidden break-all text-ink lg:inline">{address}</span>
            <span className="text-ink lg:hidden">{shortAddress(address, 10, 8)}</span>
          </>
        ) : (
          <span className="text-muted">NOT CONFIGURED</span>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={copy} disabled={!address} aria-label={`Copy ${label}`}>
          {copied ? <Check size={12} /> : <Copy size={12} />} COPY
        </button>
        {address ? (
          <a href={token ? explorer.token(address) : explorer.address(address)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            <ExternalLink size={12} /> EXPLORER
          </a>
        ) : (
          <span className="btn btn-ghost btn-sm opacity-40" aria-hidden>
            <ExternalLink size={12} /> EXPLORER
          </span>
        )}
      </div>
    </div>
  );
}
