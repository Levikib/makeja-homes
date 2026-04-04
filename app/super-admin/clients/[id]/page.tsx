"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  Home,
  UserCheck,
  Ban,
  Clock,
  Trash2,
  RefreshCw,
  AlertCircle,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
}

interface CompanyDetail {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  slug?: string | null;
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  billedAmount?: number | null;
  unitLimit?: number | null;
  adminUser?: AdminUser | null;
  properties: { id: string; name: string; city: string }[];
}

interface UsageStats {
  propertiesCount: number;
  unitsCount: number;
  usersCount: number;
  tenantsCount: number;
}

// ─── Badge helpers ─────────────────────────────────────────────────────────

function statusBadge(status: string | null | undefined) {
  const map: Record<string, string> = {
    TRIAL: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    ACTIVE: "bg-green-500/20 text-green-300 border-green-500/30",
    SUSPENDED: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    EXPIRED: "bg-red-500/20 text-red-300 border-red-500/30",
    CANCELLED: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  };
  const label = status ?? "UNKNOWN";
  const cls = map[label] ?? "bg-gray-500/20 text-gray-400 border-gray-600/30";
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function tierBadge(tier: string | null | undefined) {
  const map: Record<string, string> = {
    STARTER: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    GROWTH: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    PRO: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    ENTERPRISE: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  };
  const label = tier ?? "FREE";
  const cls = map[label] ?? "bg-gray-500/20 text-gray-400 border-gray-600/30";
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [changePlanTier, setChangePlanTier] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/companies/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch company");
      const data = await res.json();
      setCompany(data.company);
      setUsageStats(data.usageStats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSuspend() {
    setActionLoading("suspend");
    try {
      const res = await fetch(`/api/super-admin/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscriptionStatus: "SUSPENDED", isActive: false }),
      });
      if (res.ok) {
        showToast("Account suspended", true);
        fetchData();
      } else throw new Error();
    } catch {
      showToast("Failed to suspend", false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExtendTrial(days: 7 | 14 | 30) {
    setActionLoading("extend-" + days);
    try {
      const res = await fetch(
        `/api/super-admin/companies/${id}/extend-trial`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ days }),
        }
      );
      if (res.ok) {
        showToast(`Trial extended by ${days} days`, true);
        fetchData();
      } else throw new Error();
    } catch {
      showToast("Failed to extend trial", false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleChangePlan() {
    if (!changePlanTier) return;
    setActionLoading("plan");
    try {
      const res = await fetch(`/api/super-admin/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscriptionTier: changePlanTier }),
      });
      if (res.ok) {
        showToast(`Plan changed to ${changePlanTier}`, true);
        setChangePlanTier("");
        fetchData();
      } else throw new Error();
    } catch {
      showToast("Failed to change plan", false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    setActionLoading("delete");
    try {
      const res = await fetch(`/api/super-admin/companies/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        showToast("Company deleted", true);
        setTimeout(() => router.replace("/super-admin/clients"), 1000);
      } else throw new Error();
    } catch {
      showToast("Failed to delete", false);
    } finally {
      setActionLoading(null);
      setConfirmDelete(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-semibold mb-2">{error ?? "Company not found"}</p>
          <Link href="/super-admin/clients" className="text-violet-400 hover:underline text-sm">
            Back to clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border text-sm font-medium shadow-lg ${
            toast.ok
              ? "bg-green-500/20 border-green-500/40 text-green-300"
              : "bg-red-500/20 border-red-500/40 text-red-300"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Delete Company?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will soft-delete <strong className="text-white">{company.name}</strong> and
              deactivate their account. This action cannot be easily undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === "delete"}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-bold transition disabled:opacity-50"
              >
                {actionLoading === "delete" ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link
          href="/super-admin/clients"
          className="mt-1 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white">{company.name}</h1>
            {statusBadge(company.subscriptionStatus)}
            {tierBadge(company.subscriptionTier)}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {company.slug
              ? `${company.slug}.makejahomes.co.ke`
              : "No subdomain assigned"}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-sm transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column — 2/3 */}
        <div className="xl:col-span-2 space-y-6">
          {/* Company Info */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-400" />
              Company Info
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Company Name</p>
                <p className="text-white">{company.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Email</p>
                <p className="text-white flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {company.email}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Phone</p>
                <p className="text-white flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {company.phone ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Location</p>
                <p className="text-white flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {[company.city, company.country].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Address</p>
                <p className="text-white">{company.address ?? "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Registered</p>
                <p className="text-white flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {fmtDate(company.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-violet-400" />
              Subscription
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Plan Tier</p>
                {tierBadge(company.subscriptionTier)}
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Status</p>
                {statusBadge(company.subscriptionStatus)}
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Trial Ends</p>
                <p className="text-white">{fmtDate(company.trialEndsAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Subscription Ends</p>
                <p className="text-white">{fmtDate(company.subscriptionEndsAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Billed Amount</p>
                <p className="text-white">
                  {company.billedAmount != null
                    ? `KSH ${company.billedAmount.toLocaleString()}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Unit Limit</p>
                <p className="text-white">
                  {company.unitLimit != null ? company.unitLimit : "Unlimited"}
                </p>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          {usageStats && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Usage Stats
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                  <Building2 className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {usageStats.propertiesCount}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">Properties</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                  <Home className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {usageStats.unitsCount}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">Units</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                  <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {usageStats.usersCount}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">Staff Users</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                  <UserCheck className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {usageStats.tenantsCount}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">Tenants</p>
                </div>
              </div>
            </div>
          )}

          {/* Admin User */}
          {company.adminUser && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-400" />
                Admin User
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Name</p>
                  <p className="text-white">
                    {company.adminUser.firstName} {company.adminUser.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Email</p>
                  <p className="text-white">{company.adminUser.email}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Phone</p>
                  <p className="text-white">
                    {company.adminUser.phoneNumber ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Last Login</p>
                  <p className="text-white">
                    {fmtDateTime(company.adminUser.lastLoginAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column — Actions */}
        <div className="space-y-5">
          {/* Suspend */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Account Control
            </h3>
            <button
              onClick={handleSuspend}
              disabled={actionLoading === "suspend"}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm font-medium transition disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              {actionLoading === "suspend" ? "Suspending..." : "Suspend Account"}
            </button>
          </div>

          {/* Extend Trial */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Extend Trial
            </h3>
            <div className="space-y-2">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => handleExtendTrial(days)}
                  disabled={actionLoading === "extend-" + days}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 text-sm font-medium transition disabled:opacity-50"
                >
                  <Clock className="w-4 h-4" />
                  {actionLoading === "extend-" + days
                    ? "Extending..."
                    : `+${days} days`}
                </button>
              ))}
            </div>
          </div>

          {/* Change Plan */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Change Plan
            </h3>
            <select
              value={changePlanTier}
              onChange={(e) => setChangePlanTier(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition mb-2"
            >
              <option value="">Select tier...</option>
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
            <button
              onClick={handleChangePlan}
              disabled={!changePlanTier || actionLoading === "plan"}
              className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
            >
              {actionLoading === "plan" ? "Saving..." : "Apply Change"}
            </button>
          </div>

          {/* Delete */}
          <div className="bg-gray-900/60 border border-red-900/30 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-red-400 mb-3">
              Danger Zone
            </h3>
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete Company
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
