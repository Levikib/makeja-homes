"use client"

import { useState, useEffect } from "react"
import { User, Phone, Mail, Shield, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator", MANAGER: "Property Manager",
  CARETAKER: "Caretaker", STOREKEEPER: "Storekeeper",
  TENANT: "Tenant", TECHNICAL: "Technical Staff",
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => { if (data.user) setProfile(data.user) })
      .finally(() => setLoading(false))
  }, [])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    if (form.newPassword !== form.confirmPassword) {
      setResult({ success: false, message: "New passwords do not match" })
      return
    }
    if (form.newPassword.length < 8) {
      setResult({ success: false, message: "Password must be at least 8 characters" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setResult({ success: true, message: "Password changed successfully" })
    } catch (err: any) {
      setResult({ success: false, message: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile & Account</h1>
        <p className="text-gray-400 text-sm mt-1">Your account information and password</p>
      </div>

      {/* Avatar card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {profile?.firstName?.[0]}{profile?.lastName?.[0]}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">{profile?.firstName} {profile?.lastName}</h2>
          <p className="text-gray-400 text-sm">{profile?.email}</p>
          <span className="inline-block mt-1.5 text-xs bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full">
            {ROLE_LABELS[profile?.role] ?? profile?.role}
          </span>
        </div>
        <div className="ml-auto text-right text-xs text-gray-500 hidden sm:block">
          <p>Member since</p>
          <p className="text-gray-300">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-KE", { month: "long", year: "numeric" }) : "—"}</p>
          {profile?.lastLoginAt && (
            <>
              <p className="mt-2">Last login</p>
              <p className="text-gray-300">{new Date(profile.lastLoginAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</p>
            </>
          )}
        </div>
      </div>

      {/* Personal info — read-only */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold flex items-center gap-2"><User size={16} className="text-purple-400" /> Personal Information</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">Read only</span>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">First Name</p>
              <p className="text-white bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-sm">{profile?.firstName || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Last Name</p>
              <p className="text-white bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-sm">{profile?.lastName || "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Mail size={11} /> Email Address</p>
            <p className="text-gray-300 bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-sm">{profile?.email || "—"}</p>
          </div>
          {profile?.phoneNumber && (
            <div>
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Phone size={11} /> Phone Number</p>
              <p className="text-gray-300 bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-sm">{profile.phoneNumber}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-4">To update your details, contact your administrator.</p>
      </div>

      {/* Change Password */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2"><Shield size={16} className="text-purple-400" /> Change Password</h3>
        <p className="text-gray-500 text-xs mb-5">You must know your current password to set a new one</p>

        {result && (
          <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 border text-sm ${result.success ? "bg-green-900/20 border-green-500/30 text-green-300" : "bg-red-900/20 border-red-500/30 text-red-300"}`}>
            {result.success ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {result.message}
            <button onClick={() => setResult(null)} className="ml-auto opacity-60 hover:opacity-100 text-xs">✕</button>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none pr-10"
                required
              />
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="Min 8 characters"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none pr-10"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Repeat new password"
                className={`w-full bg-gray-800 border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none ${form.confirmPassword && form.confirmPassword !== form.newPassword ? "border-red-500" : "border-gray-700 focus:border-purple-500"}`}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield size={15} />}
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  )
}
