"use client";

import { useEffect, useState } from "react";
import { User, Phone, Mail, CreditCard, Home, Calendar, Save, Lock, Eye, EyeOff } from "lucide-react";

const fmt = (n: number) => `KES ${Math.round(n || 0).toLocaleString()}`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—";

export default function TenantProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({ firstName: "", lastName: "", phoneNumber: "" });

  // Password change
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    fetch("/api/tenant/profile")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setProfile(d);
        setForm({ firstName: d.firstName, lastName: d.lastName, phoneNumber: d.phoneNumber || "" });
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/tenant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setSuccess("Profile updated successfully");
      setProfile((p: any) => ({ ...p, ...form }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      setPwSuccess("Password changed successfully");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-white">My Profile</h1>
        <p className="text-gray-400 mt-1">Manage your personal information and security</p>
      </div>

      {/* Tenancy Info — read-only */}
      {profile?.tenancy && (
        <div className="bg-gradient-to-br from-purple-950/20 to-black border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Home className="w-4 h-4 text-purple-400" /> Tenancy Details
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Property</p>
              <p className="text-white font-medium">{profile.tenancy.propertyName}</p>
            </div>
            <div>
              <p className="text-gray-400">Unit</p>
              <p className="text-white font-medium">{profile.tenancy.unitNumber}</p>
            </div>
            <div>
              <p className="text-gray-400">Monthly Rent</p>
              <p className="text-white font-medium">{fmt(profile.tenancy.rentAmount)}</p>
            </div>
            <div>
              <p className="text-gray-400">Deposit</p>
              <p className="text-white font-medium">{fmt(profile.tenancy.depositAmount)}</p>
            </div>
            <div>
              <p className="text-gray-400">Lease Start</p>
              <p className="text-white font-medium">{fmtDate(profile.tenancy.leaseStartDate)}</p>
            </div>
            <div>
              <p className="text-gray-400">Lease End</p>
              <p className="text-white font-medium">{fmtDate(profile.tenancy.leaseEndDate)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Personal Info */}
      <div className="bg-gradient-to-br from-purple-950/20 to-black border border-purple-500/20 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-purple-400" /> Personal Information
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">{success}</div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-black border border-purple-500/30 text-white focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-black border border-purple-500/30 text-white focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              <Mail className="w-3.5 h-3.5 inline mr-1" />Email Address
            </label>
            <input
              type="email"
              value={profile?.email || ""}
              disabled
              className="w-full px-4 py-2.5 rounded-lg bg-black/50 border border-gray-700 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-600 mt-1">Email cannot be changed. Contact your property manager.</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              <Phone className="w-3.5 h-3.5 inline mr-1" />Phone Number
            </label>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
              placeholder="+254 700 000 000"
              className="w-full px-4 py-2.5 rounded-lg bg-black border border-purple-500/30 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {profile?.idNumber && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                <CreditCard className="w-3.5 h-3.5 inline mr-1" />ID Number
              </label>
              <input
                type="text"
                value={profile.idNumber}
                disabled
                className="w-full px-4 py-2.5 rounded-lg bg-black/50 border border-gray-700 text-gray-500 cursor-not-allowed"
              />
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-600 pt-1">
            <span><Calendar className="w-3.5 h-3.5 inline mr-1" />Member since {fmtDate(profile?.createdAt)}</span>
            {profile?.lastLoginAt && (
              <span>Last login {fmtDate(profile.lastLoginAt)}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-gradient-to-br from-purple-950/20 to-black border border-purple-500/20 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-purple-400" /> Change Password
        </h2>

        {pwError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{pwError}</div>
        )}
        {pwSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">{pwSuccess}</div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={pwForm.currentPassword}
                onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2.5 pr-10 rounded-lg bg-black border border-purple-500/30 text-white focus:border-purple-500 focus:outline-none"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={pwForm.newPassword}
                onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                className="w-full px-4 py-2.5 pr-10 rounded-lg bg-black border border-purple-500/30 text-white focus:border-purple-500 focus:outline-none"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-black border border-purple-500/30 text-white focus:border-purple-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={pwSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {pwSaving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
