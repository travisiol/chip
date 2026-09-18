import { chipConfig } from "@/config/chip";

/** The X logo, as a plain path. */
export function XIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** CHIP on X — the navbar link, where the mode badge used to be. */
export function XLink({ size = "sm", className = "" }: { size?: "sm" | "md"; className?: string }) {
  const handle = chipConfig.site.twitter.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "").replace(/\/$/, "");
  return (
    <a href={chipConfig.site.twitter} target="_blank" rel="noreferrer" className={`btn btn-ghost ${size === "sm" ? "btn-sm" : ""} ${className}`} aria-label={`CHIP on X (@${handle})`}>
      <XIcon size={size === "sm" ? 13 : 15} />
      <span className="hidden normal-case tracking-[0.04em] sm:inline">@{handle}</span>
    </a>
  );
}
