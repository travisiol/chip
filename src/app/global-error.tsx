"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#050606", color: "#f4f6f5", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ maxWidth: 480, padding: 24, border: "1px solid #1D6F32", borderRadius: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "#7c8587" }}>CHIP</div>
          <h1 style={{ fontSize: 20, margin: "12px 0" }}>SOMETHING TRIPPED</h1>
          <p style={{ color: "#b8c0c4", fontSize: 14, lineHeight: 1.5 }}>{error.message || "An unexpected error interrupted the application."}</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, background: "#0b0e0f", color: "#f4f6f5", border: "1px solid #b7ff39", padding: "10px 18px", borderRadius: 6, cursor: "pointer", letterSpacing: "0.14em", fontSize: 12 }}>
            RETRY
          </button>
        </div>
      </body>
    </html>
  );
}
