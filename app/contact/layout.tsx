import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact Us — Makeja Homes",
  description:
    "Get in touch with the Makeja Homes team. Reach us via email, phone, or WhatsApp. We're based in Nairobi, Kenya.",
  alternates: {
    canonical: "https://makejahomes.co.ke/contact",
  },
  openGraph: {
    title: "Contact Makeja Homes — Property Management Software Kenya",
    description:
      "Reach the Makeja Homes team via email, phone, or WhatsApp. Based in Nairobi, Kenya.",
    url: "https://makejahomes.co.ke/contact",
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
