"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <html>
      <body style={{ margin: 0, background: "#0a0a0a", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", maxWidth: 480, padding: "0 24px" }}>
          <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 24 }}>⚠️</div>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
            An unexpected error occurred. Our team has been notified.
            {error.digest && <><br /><span style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.4 }}>ID: {error.digest}</span></>}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={reset}
              style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Try Again
            </button>
            <a href="/dashboard/admin" style={{ background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 24px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              Go to Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
