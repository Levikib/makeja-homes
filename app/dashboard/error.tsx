"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[DashboardError]", error)
  }, [error])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <h1 className="text-white text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          This page encountered an error. You can try again or navigate to a different section.
          {error.digest && (
            <span className="block mt-2 font-mono text-xs text-gray-600">
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
          >
            <Home size={14} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
