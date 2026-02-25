import type { Metadata } from "next"
import "./globals.css"


export const metadata: Metadata = {
  title: "Makeja Homes - Property Management System",
  description: "Comprehensive property management system for Makeja Homes",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body >
        {children}
      </body>
    </html>
  )
}
