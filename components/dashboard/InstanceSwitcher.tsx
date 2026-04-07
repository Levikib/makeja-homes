"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, Loader2, ArrowRightLeft, Eye, EyeOff, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Instance {
  tenantSlug: string
  companyName: string
  role: string
  isCurrent: boolean
}

const roleColors: Record<string, string> = {
  ADMIN: "text-orange-400",
  MANAGER: "text-blue-400",
  CARETAKER: "text-green-400",
  STOREKEEPER: "text-yellow-400",
  TECHNICAL: "text-purple-400",
  TENANT: "text-pink-400",
}

export function InstanceSwitcher() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  // Password confirmation step
  const [confirmTarget, setConfirmTarget] = useState<Instance | null>(null)
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [pwError, setPwError] = useState("")

  const current = instances.find(i => i.isCurrent)

  // Close on outside click (but not when password modal is open)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (confirmTarget) return // don't close while confirming
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [confirmTarget])

  const fetchInstances = async () => {
    if (instances.length > 0) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/switch-instance")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setInstances(data.instances || [])
    } catch {
      setError("Could not load instances")
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open) fetchInstances()
  }

  const handleSelectInstance = (inst: Instance) => {
    if (inst.isCurrent) return
    setConfirmTarget(inst)
    setPassword("")
    setPwError("")
    setShowPw(false)
  }

  const handleConfirmSwitch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmTarget || !password) return
    setSwitching(true)
    setPwError("")
    try {
      const res = await fetch("/api/auth/switch-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSlug: confirmTarget.tenantSlug, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Switch failed")
      // Success — close everything and navigate
      setConfirmTarget(null)
      setOpen(false)
      router.push(data.redirectTo)
      router.refresh()
    } catch (err: any) {
      setPwError(err.message)
    } finally {
      setSwitching(false)
    }
  }

  const cancelConfirm = () => {
    setConfirmTarget(null)
    setPassword("")
    setPwError("")
  }

  // Only show if the user potentially has multiple instances
  // (we show it speculatively and hide after load if only one)
  if (instances.length === 1) return null

  return (
    <>
      <div ref={ref} className="relative px-3 pb-1">
        <button
          onClick={handleOpen}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors group"
          title="Switch company instance"
        >
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            {current ? (
              <>
                <p className="text-[11px] font-medium text-white truncate leading-none">{current.companyName}</p>
                <p className={cn("text-[9px] leading-none mt-0.5", roleColors[current.role] ?? "text-gray-400")}>{current.role}</p>
              </>
            ) : (
              <p className="text-[11px] text-gray-500 truncate">Switch instance…</p>
            )}
          </div>
          <ArrowRightLeft className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors flex-shrink-0" />
        </button>

        {open && !confirmTarget && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50">
            <div className="px-3 py-2 border-b border-gray-800">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Switch Instance</p>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-gray-500 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
              </div>
            ) : error ? (
              <div className="px-3 py-2 text-xs text-red-400">{error}</div>
            ) : (
              <div className="py-1 max-h-52 overflow-y-auto">
                {instances.map(inst => (
                  <button
                    key={inst.tenantSlug}
                    onClick={() => handleSelectInstance(inst)}
                    disabled={inst.isCurrent}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                      inst.isCurrent
                        ? "bg-orange-500/10 cursor-default"
                        : "hover:bg-gray-800 cursor-pointer"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                      inst.isCurrent ? "bg-orange-500/20 text-orange-400" : "bg-gray-700 text-gray-300"
                    )}>
                      {inst.companyName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{inst.companyName}</p>
                      <p className={cn("text-[10px] leading-none mt-0.5", roleColors[inst.role] ?? "text-gray-400")}>
                        {inst.role}
                      </p>
                    </div>
                    {inst.isCurrent && (
                      <Check className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {instances.length > 1 && (
              <div className="border-t border-gray-800 px-3 py-1.5">
                <p className="text-[9px] text-gray-600">
                  You'll need the password for the target account.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Password confirmation modal — rendered outside the sidebar ref so clicks don't close it */}
      {confirmTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                  {confirmTarget.companyName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{confirmTarget.companyName}</p>
                  <p className={cn("text-xs", roleColors[confirmTarget.role] ?? "text-gray-400")}>{confirmTarget.role}</p>
                </div>
              </div>
              <button onClick={cancelConfirm} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmSwitch} className="px-5 py-5 space-y-4">
              <p className="text-sm text-gray-400">
                Enter your password for this account to switch.
              </p>

              {pwError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {pwError}
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                    required
                    placeholder="Enter account password…"
                    className="w-full px-3 py-2.5 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelConfirm}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={switching || !password}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition"
                >
                  {switching ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Switching…</>
                  ) : (
                    <><ArrowRightLeft className="w-3.5 h-3.5" /> Switch</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
