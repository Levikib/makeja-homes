"use client"

import { useState, useEffect } from "react"
import DepositsClient from "./DepositsClient"

export const dynamic = 'force-dynamic'

export default function DepositsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/admin/deposits")
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load deposits")
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading deposits...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-400">{error || "Failed to load deposits"}</p>
      </div>
    )
  }

  return <DepositsClient deposits={data.deposits ?? []} stats={data.stats ?? {}} />
}
