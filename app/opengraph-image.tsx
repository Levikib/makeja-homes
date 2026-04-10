import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Makeja Homes — Property Management Software Kenya"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#131B1D",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: "80px 96px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 70% 30%, rgba(226,125,96,0.15), transparent 60%)",
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #3E4E50, #E27D60)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
              color: "white",
            }}
          >
            M
          </div>
          <span
            style={{ fontSize: 24, fontWeight: 700, color: "#F4F1ED", letterSpacing: -0.5 }}
          >
            Makeja Homes
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#F4F1ED",
            lineHeight: 1,
            letterSpacing: -2,
            marginBottom: 24,
          }}
        >
          Property Management
          <br />
          <span style={{ color: "#E27D60" }}>Software for Kenya.</span>
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(194,214,216,0.6)",
            lineHeight: 1.6,
            maxWidth: 700,
            marginBottom: 48,
          }}
        >
          M-Pesa STK Push · Digital Leases · 5-Role Dashboards · AI Insights
        </div>

        {/* Pills */}
        <div style={{ display: "flex", gap: 12 }}>
          {["14-day Free Trial", "No Credit Card", "Built in Nairobi 🇰🇪"].map((t) => (
            <div
              key={t}
              style={{
                background: "rgba(226,125,96,0.15)",
                border: "1px solid rgba(226,125,96,0.3)",
                borderRadius: 100,
                padding: "8px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: "#EBA08A",
                letterSpacing: 0.3,
              }}
            >
              {t}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 96,
            fontSize: 16,
            color: "rgba(194,214,216,0.3)",
            fontWeight: 500,
          }}
        >
          makejahomes.co.ke
        </div>
      </div>
    ),
    { ...size }
  )
}
