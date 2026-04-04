"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Clock } from "lucide-react"

export default function SessionWarning() {
  const [visible, setVisible] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(120)
  const router = useRouter()

  useEffect(() => {
    const handleWarning = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setSecondsLeft(Math.ceil((detail?.expiresInMs ?? 120000) / 1000))
      setVisible(true)
    }
    window.addEventListener("session-expiry-warning", handleWarning)
    return () => window.removeEventListener("session-expiry-warning", handleWarning)
  }, [])

  useEffect(() => {
    if (!visible) return
    if (secondsLeft <= 0) {
      fetch("/api/auth/logout", { method: "POST" }).finally(() => {
        router.push("/auth/login?session=expired")
      })
      return
    }
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [visible, secondsLeft, router])

  const stayLoggedIn = () => {
    // Touch the me endpoint to verify session is still valid
    fetch("/api/auth/me").then((r) => {
      if (r.ok) setVisible(false)
      else router.push("/auth/login?session=expired")
    })
  }

  if (!visible) return null

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-amber-500/40 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
            <Clock size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Session Expiring</h2>
            <p className="text-gray-400 text-xs">You will be logged out soon</p>
          </div>
        </div>

        <div className="text-center my-6">
          <div className="text-5xl font-mono font-bold text-white mb-2">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
          <p className="text-gray-400 text-sm">until automatic logout</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={stayLoggedIn}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <Shield size={16} />
            Stay Logged In
          </button>
          <button
            onClick={() => router.push("/auth/login?session=expired")}
            className="w-full bg-gray-800 text-gray-400 py-2.5 rounded-xl text-sm hover:bg-gray-700 transition"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  )
}
