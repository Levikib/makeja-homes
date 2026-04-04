"use client"

import { useState, useEffect } from "react"
import { User, Phone, Mail, Shield, Save, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  const [form, setForm] = useState({
    firstName: "", lastName: "", phoneNumber: "",
    currentPassword: "", newPassword: "", confirmPassword: "",
  })

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.user)
        setForm((f) => ({
          ...f,
          firstName: data.user.firstName ?? "",
          lastName: data.user.lastName ?? "",
          phoneNumber: data.user.phoneNumber ?? "",
        }))
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setResult({ success: false, message: "New passwords do not match" })
      return
    }
    setSaving(true)
    setResult(null)
    try {
      const body: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
      }
      if (form.newPassword) {
        body.currentPassword = form.currentPassword
        body.newPassword = form.newPassword
      }
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProfile(data.user)
      setForm((f) => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }))
      setResult({ success: true, message: "Profile updated successfully" })
    } catch (err: any) {
      setResult({ success: false, message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Administrator", MANAGER: "Property Manager",
    CARETAKER: "Caretaker", STOREKEEPER: "Storekeeper",
    TENANT: "Tenant", TECHNICAL: "Technical Staff",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Profile & Account</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your personal information and password</p>
      </div>

      {/* User card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {profile?.firstName?.[0]}{profile?.lastName?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{profile?.firstName} {profile?.lastName}</h2>
            <p className="text-gray-400 text-sm">{profile?.email}</p>
            <span className="inline-block mt-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              {ROLE_LABELS[profile?.role] ?? profile?.role}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-gray-800">
          <div>
            <p className="text-gray-500 text-xs">Member since</p>
            <p className="text-gray-300 text-sm">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-KE", { month: "long", year: "numeric" }) : "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Last login</p>
            <p className="text-gray-300 text-sm">{profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "Never"}</p>
          </div>
        </div>
      </div>

      {result && (
        <div className={`flex items-center gap-3 p-4 rounded-xl mb-5 border ${result.success ? "bg-green-900/20 border-green-500/30 text-green-300" : "bg-red-900/20 border-red-500/30 text-red-300"}`}>
          {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm">{result.message}</span>
          <button onClick={() => setResult(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Personal info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2"><User size={16} className="text-purple-400" /> Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">First Name</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Last Name</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-gray-400 text-sm mb-1.5 flex items-center gap-1.5"><Mail size={12} /> Email Address</label>
            <input
              value={profile?.email ?? ""}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-500 text-sm cursor-not-allowed"
              disabled
            />
            <p className="text-gray-600 text-xs mt-1">Email cannot be changed. Contact your administrator.</p>
          </div>
          <div className="mt-4">
            <label className="block text-gray-400 text-sm mb-1.5 flex items-center gap-1.5"><Phone size={12} /> Phone Number</label>
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              placeholder="+254 7XX XXX XXX"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Change password */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-1 flex items-center gap-2"><Shield size={16} className="text-purple-400" /> Change Password</h3>
          <p className="text-gray-500 text-xs mb-5">Leave blank to keep your current password</p>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none pr-10"
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
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  )
}
