"use client";

import { useEffect, useState } from "react";
import { User, Phone, Mail, CreditCard, Home, Calendar, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

const fmt = (n: number) => `KES ${Math.round(n || 0).toLocaleString()}`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—";

export default function TenantProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    fetch("/api/tenant/profile")
      .then(r => r.json())
      .then(d => { if (!d.error) setProfile(d); })
      .finally(() => setLoading(false));
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError("New passwords do not match"); return; }
    if (pwForm.newPassword.length < 8) { setPwError("Password must be at least 8 characters"); return; }
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
        <p className="text-gray-400 mt-1">Your account information</p>
      </div>

      {/* Avatar + name card */}
      <div className="bg-gradient-to-br from-purple-950/20 to-black border border-purple-500/20 rounded-xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {profile?.firstName?.[0]}{profile?.lastName?.[0]}
        </div>
        <div>
          <p className="text-xl font-semibold text-white">{profile?.firstName} {profile?.lastName}</p>
          <p className="text-gray-400 text-sm">{profile?.email}</p>
          <div className="flex gap-3 mt-2 text-xs text-gray-500">
            <span><Calendar className="w-3 h-3 inline mr-1" />Member since {fmtDate(profile?.createdAt)}</span>
            {profile?.lastLoginAt && <span>Last login {fmtDate(profile.lastLoginAt)}</span>}
          </div>
        </div>
      </div>

      {/* Personal Info — read-only */}
      <div className="bg-gradient-to-br from-purple-950/20 to-black border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" /> Personal Information
          </h2>
          <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">Read only</span>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">First Name</p>
              <p className="text-white bg-black/40 border border-gray-800 rounded-lg px-4 py-2.5 text-sm">{profile?.firstName || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Last Name</p>
              <p className="text-white bg-black/40 border border-gray-800 rounded-lg px-4 py-2.5 text-sm">{profile?.lastName || "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email Address</p>
            <p className="text-gray-300 bg-black/40 border border-gray-800 rounded-lg px-4 py-2.5 text-sm">{profile?.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone Number</p>
            <p className="text-gray-300 bg-black/40 border border-gray-800 rounded-lg px-4 py-2.5 text-sm">{profile?.phoneNumber || "—"}</p>
          </div>
          {profile?.idNumber && (
            <div>
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> ID Number</p>
              <p className="text-gray-300 bg-black/40 border border-gray-800 rounded-lg px-4 py-2.5 text-sm">{profile.idNumber}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-4">To update your personal details, contact your property manager.</p>
      </div>

      {/* Tenancy Info — read-only */}
      {profile?.tenancy && (
        <div className="bg-gradient-to-br from-purple-950/20 to-black border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Home className="w-4 h-4 text-purple-400" /> Tenancy Details
            </h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">Read only</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Property", profile.tenancy.propertyName],
              ["Unit", profile.tenancy.unitNumber],
              ["Monthly Rent", fmt(profile.tenancy.rentAmount)],
              ["Deposit", fmt(profile.tenancy.depositAmount)],
              ["Lease Start", fmtDate(profile.tenancy.leaseStartDate)],
              ["Lease End", fmtDate(profile.tenancy.leaseEndDate)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className="text-white font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-gradient-to-br from-purple-950/20 to-black border border-purple-500/20 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-purple-400" /> Change Password
        </h2>

        {pwError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />{pwSuccess}
          </div>
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
              className={`w-full px-4 py-2.5 rounded-lg bg-black border text-white focus:outline-none ${pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? "border-red-500" : "border-purple-500/30 focus:border-purple-500"}`}
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
