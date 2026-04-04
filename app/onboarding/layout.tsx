import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Get Started — Makeja Homes',
  description: 'Sign up for Makeja Homes — the property management platform built for Kenyan landlords and agencies.',
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar with logo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg leading-none">M</span>
            </div>
            <span className="text-white font-bold text-lg">Makeja Homes</span>
          </Link>
          <div className="text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-16">
        {children}
      </main>

      {/* Minimal footer */}
      <footer className="py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Makeja Homes. All rights reserved.{' '}
            <Link href="/contact" className="hover:text-gray-400 transition-colors">
              Contact us
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
