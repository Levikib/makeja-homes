"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

const IDLE_TIMEOUT_MS = 20 * 60 * 1000   // 20 minutes
const WARN_BEFORE_MS  = 2 * 60 * 1000    // warn 2 minutes before timeout

export function SessionMonitor() {
  const router = useRouter()
  const idleTimer = useRef<NodeJS.Timeout | null>(null)
  const warnTimer = useRef<NodeJS.Timeout | null>(null)
  const warnShown = useRef(false)

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {}
    router.push("/auth/login?session=expired")
  }, [router])

  const showWarning = useCallback(() => {
    if (warnShown.current) return
    warnShown.current = true
    // Dispatch a custom event so the UI can show a modal
    window.dispatchEvent(new CustomEvent("session-expiry-warning", {
      detail: { expiresInMs: WARN_BEFORE_MS }
    }))
  }, [])

  const resetTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (warnTimer.current) clearTimeout(warnTimer.current)
    warnShown.current = false

    warnTimer.current = setTimeout(showWarning, IDLE_TIMEOUT_MS - WARN_BEFORE_MS)
    idleTimer.current = setTimeout(logout, IDLE_TIMEOUT_MS)
  }, [logout, showWarning])

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"]
    const handler = () => resetTimers()

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }))
    resetTimers()

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler))
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (warnTimer.current) clearTimeout(warnTimer.current)
    }
  }, [resetTimers])

  return null
}
