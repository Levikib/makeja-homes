import type { Metadata } from "next"
import { Cormorant_Garamond, Jost, DM_Sans } from "next/font/google"
import "./globals.css"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
})

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jost",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://makejahomes.co.ke"),
  title: {
    default: "Makeja Homes — Property Management Software Kenya",
    template: "%s | Makeja Homes",
  },
  description:
    "Professional property management software built for Kenya. M-Pesa STK Push, digital lease signing, automated billing, 5-role dashboards, and AI-powered insights. Trusted by property managers across Nairobi.",
  keywords: [
    "property management software Kenya",
    "property management system Nairobi",
    "landlord software Kenya",
    "M-Pesa property management",
    "rental management software Kenya",
    "digital lease signing Kenya",
    "property management app Kenya",
    "real estate software Nairobi",
    "tenant management system Kenya",
    "makeja homes",
  ],
  authors: [{ name: "Makeja Homes Ltd", url: "https://makejahomes.co.ke" }],
  creator: "Makeja Homes Ltd",
  publisher: "Makeja Homes Ltd",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://makejahomes.co.ke",
    siteName: "Makeja Homes",
    title: "Makeja Homes — Professional Property Management Software Kenya",
    description:
      "M-Pesa STK Push, digital lease signing, automated billing, 5-role dashboards, and AI-powered insights. The most complete property management platform in Kenya.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Makeja Homes — Property Management Software Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Makeja Homes — Property Management Software Kenya",
    description:
      "M-Pesa STK Push, digital lease signing, automated billing, 5-role dashboards. The most complete property management platform in Kenya.",
    images: ["/og-image.png"],
    creator: "@makejahomes",
  },
  alternates: {
    canonical: "https://makejahomes.co.ke",
  },
  verification: {
    google: "",
  },
  category: "technology",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en-KE"
      className={`${cormorant.variable} ${jost.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://wa.me" />
        <link rel="dns-prefetch" href="https://api.paystack.co" />
        <meta name="theme-color" content="#131B1D" />
        <meta name="geo.region" content="KE-110" />
        <meta name="geo.placename" content="Nairobi, Kenya" />
        <meta name="geo.position" content="-1.286389;36.817223" />
        <meta name="ICBM" content="-1.286389, 36.817223" />
      </head>
      <body>{children}</body>
    </html>
  )
}
