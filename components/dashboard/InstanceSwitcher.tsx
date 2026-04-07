"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Building2, ChevronDown, Check, Loader2, ArrowRightLeft } from "lucide-react"
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
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const current = instances.find(i => i.isCurrent)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const fetchInstances = async () => {
    if (instances.length > 0) return // already loaded
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

  const switchTo = async (slug: string) => {
    if (switching) return
    setSwitching(slug)
    setError("")
    try {
      const res = await fetch("/api/auth/switch-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSlug: slug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Switch failed")
      setOpen(false)
      // Force a full navigation so the new JWT cookie is used everywhere
      router.push(data.redirectTo)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSwitching(null)
    }
  }

  // Only show if there's more than one instance (or we haven't loaded yet)
  const hasMultiple = instances.length > 1 || instances.length === 0

  if (!hasMultiple && instances.length === 1) return null

  return (
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
            <p className="text-[11px] text-gray-500 truncate">Loading…</p>
          )}
        </div>
        <ArrowRightLeft className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors flex-shrink-0" />
      </button>

      {open && (
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
              {instances.map(inst => {
                const isSwitching = switching === inst.tenantSlug
                return (
                  <button
                    key={inst.tenantSlug}
                    onClick={() => !inst.isCurrent && switchTo(inst.tenantSlug)}
                    disabled={inst.isCurrent || !!switching}
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
                    {isSwitching && (
                      <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {instances.length > 1 && (
            <div className="border-t border-gray-800 px-3 py-1.5">
              <p className="text-[9px] text-gray-600">
                Switching replaces your current session — no password needed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
