"use client"

import { useState } from "react"
import { Smartphone, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface MpesaButtonProps {
  amount: number
  leaseId?: string
  billId?: string
  defaultPhone?: string
  onSuccess?: (checkoutRequestId: string) => void
}

export function MpesaButton({ amount, leaseId, billId, defaultPhone = "", onSuccess }: MpesaButtonProps) {
  const [phone, setPhone] = useState(defaultPhone)
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<"idle" | "sent" | "error">("idle")
  const [message, setMessage] = useState("")
  const [showForm, setShowForm] = useState(false)

  const handlePay = async () => {
    if (!phone.trim()) { setMessage("Enter your M-Pesa phone number"); setState("error"); return }
    setLoading(true); setMessage(""); setState("idle")
    try {
      const res = await fetch("/api/payments/mpesa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, amount, leaseId, billId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error ?? "M-Pesa request failed")
        setState("error")
      } else {
        setMessage(data.message ?? "Check your phone for the M-Pesa prompt")
        setState("sent")
        onSuccess?.(data.checkoutRequestId)
        setShowForm(false)
      }
    } catch {
      setMessage("Network error. Please try again.")
      setState("error")
    } finally {
      setLoading(false)
    }
  }

  if (state === "sent") return (
    <div className="flex items-start gap-3 bg-green-900/20 border border-green-500/30 rounded-xl p-4">
      <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-green-300 text-sm font-medium">STK Push Sent</p>
        <p className="text-green-400/80 text-xs mt-0.5">{message}</p>
        <button onClick={() => { setState("idle"); setShowForm(false) }} className="text-xs text-green-400 underline mt-2">Send another</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-2">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition w-full justify-center"
        >
          <Smartphone size={16} />
          Pay with M-Pesa — KES {Math.round(amount).toLocaleString()}
        </button>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <Smartphone size={15} className="text-green-400" />
            M-Pesa STK Push
          </p>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
            />
            <p className="text-xs text-gray-600 mt-1">Enter the M-Pesa number for KES {Math.round(amount).toLocaleString()}</p>
          </div>
          {state === "error" && (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle size={13} /> {message}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handlePay}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />}
              {loading ? "Sending..." : "Send Prompt"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
