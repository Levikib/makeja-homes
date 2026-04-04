"use client"

import { useState, useEffect } from "react"
import { Settings, Building2, CreditCard, Save, CheckCircle, AlertCircle } from "lucide-react"

const TIER_LABELS: Record<string, string> = {
  TRIAL: "Free Trial",
  STARTER: "Starter",
  GROWTH: "Growth",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
}
const STATUS_COLOR: Record<string, string> = {
  TRIAL: "bg-amber-900/30 text-amber-300 border-amber-500/30",
  ACTIVE: "bg-green-900/30 text-green-300 border-green-500/30",
  SUSPENDED: "bg-red-900/30 text-red-300 border-red-500/30",
  CANCELLED: "bg-gray-800 text-gray-400 border-gray-700",
  EXPIRED: "bg-red-900/30 text-red-300 border-red-500/30",
}

export default function AdminSettingsPage() {
  const [company, setCompany] = useState<any>(null)
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", country: "Kenya", billingEmail: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.company) {
          setCompany(d.company)
          setForm({
            name: d.company.name ?? "",
            phone: d.company.phone ?? "",
            address: d.company.address ?? "",
            city: d.company.city ?? "",
            country: d.company.country ?? "Kenya",
            billingEmail: d.company.billingEmail ?? "",
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save")
      setCompany(data.company)
      showToast("success", "Settings saved successfully")
    } catch (err: any) {
      showToast("error", err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="text-white max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm shadow-lg transition-all ${toast.type === "success" ? "bg-green-900/80 border-green-500/40 text-green-200" : "bg-red-900/80 border-red-500/40 text-red-200"}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Company Settings</h1>
          <p className="text-gray-400 text-sm">Manage your company profile and billing information</p>
        </div>
      </div>

      {/* Subscription card */}
      {company && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                <CreditCard size={16} className="text-purple-400" />
              </div>
              <div>
                <p className="text-white font-semibold">{TIER_LABELS[company.subscriptionTier] ?? company.subscriptionTier} Plan</p>
                <p className="text-gray-400 text-xs">{company.unitLimit} unit limit · subdomain: {company.slug}</p>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLOR[company.subscriptionStatus] ?? STATUS_COLOR.ACTIVE}`}>
              {company.subscriptionStatus}
            </span>
          </div>
          {company.trialEndsAt && company.subscriptionStatus === 'TRIAL' && (
            <p className="text-amber-400 text-xs mt-3">
              Trial ends {new Date(company.trialEndsAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          {company.subscriptionEndsAt && company.subscriptionStatus === 'ACTIVE' && (
            <p className="text-gray-400 text-xs mt-3">
              Renews {new Date(company.subscriptionEndsAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      )}

      {/* Edit form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={16} className="text-purple-400" />
          <h2 className="font-semibold text-sm">Company Profile</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1.5">Company Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              placeholder="Makeja Homes Ltd"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Account Email</label>
            <input
              value={company?.email ?? ""}
              disabled
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-600 mt-1">Cannot be changed here</p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Phone Number</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              placeholder="+254 700 000 000"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1.5">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              placeholder="123 Kimathi Street"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">City</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              placeholder="Nairobi"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Country</label>
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="Kenya">Kenya</option>
              <option value="Uganda">Uganda</option>
              <option value="Tanzania">Tanzania</option>
              <option value="Rwanda">Rwanda</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1.5">Billing Email</label>
            <input
              value={form.billingEmail}
              onChange={(e) => setForm({ ...form, billingEmail: e.target.value })}
              type="email"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              placeholder="billing@yourcompany.com"
            />
            <p className="text-xs text-gray-600 mt-1">Invoices and billing notices are sent here</p>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition"
          >
            <Save size={15} className={saving ? "animate-pulse" : ""} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
