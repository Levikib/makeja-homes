"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Eye,
  Ban,
  Clock,
  RefreshCw,
  AlertCircle,
  Building2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  email: string;
  slug?: string | null;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  billedAmount?: number | null;
  unitLimit?: number | null;
  unitCount?: number | null;
  userCount?: number | null;
  adminEmail?: string;
  isActive: boolean;
  createdAt: string;
}

const STATUS_FILTERS = ["ALL", "TRIAL", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"];

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
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
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
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/companies", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCompanies(data.companies ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let list = companies;

    if (statusFilter !== "ALL") {
      list = list.filter((c) => c.subscriptionStatus === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.slug ?? "").toLowerCase().includes(q) ||
          (c.adminEmail ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [companies, search, statusFilter]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSuspend(id: string) {
    setActionLoading(id + "-suspend");
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
      } else {
        throw new Error();
      }
    } catch {
      showToast("Failed to suspend account", false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExtendTrial(id: string, days: 7 | 14 | 30) {
    setActionLoading(id + "-extend");
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
      } else {
        throw new Error();
      }
    } catch {
      showToast("Failed to extend trial", false);
    } finally {
      setActionLoading(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border text-sm font-medium shadow-lg transition-all ${
            toast.ok
              ? "bg-green-500/20 border-green-500/40 text-green-300"
              : "bg-red-500/20 border-red-500/40 text-red-300"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Clients
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            All property management companies on the platform
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-sm transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company, email, subdomain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 transition"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === s
                    ? "bg-violet-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <p className="text-gray-500 text-xs mt-3">
          Showing {filtered.length} of {companies.length} clients
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Company</th>
                  <th className="text-left px-5 py-3">Subdomain</th>
                  <th className="text-left px-5 py-3">Plan</th>
                  <th className="text-left px-5 py-3">Units Used/Limit</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Admin Email</th>
                  <th className="text-left px-5 py-3">Joined</th>
                  <th className="text-left px-5 py-3">Expires / Renews</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <Building2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-500">No clients found</p>
                    </td>
                  </tr>
                )}
                {filtered.map((c) => {
                  const isBusy =
                    actionLoading === c.id + "-suspend" ||
                    actionLoading === c.id + "-extend";
                  const expiresAt =
                    c.subscriptionStatus === "TRIAL"
                      ? c.trialEndsAt
                      : c.subscriptionEndsAt;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-white font-medium">{c.name}</p>
                          <p className="text-gray-500 text-xs">{c.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-400 font-mono text-xs">
                        {c.slug ? (
                          <a
                            href={`https://${c.slug}.makejahomes.co.ke`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-violet-400 transition"
                          >
                            {c.slug}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-4">{tierBadge(c.subscriptionTier)}</td>
                      <td className="px-5 py-4 text-gray-300 text-xs">
                        {c.unitCount != null ? c.unitCount : "—"}
                        {" / "}
                        {c.unitLimit != null ? c.unitLimit : "∞"}
                      </td>
                      <td className="px-5 py-4">{statusBadge(c.subscriptionStatus)}</td>
                      <td className="px-5 py-4 text-gray-400 text-xs">{c.adminEmail ?? "—"}</td>
                      <td className="px-5 py-4 text-gray-400 text-xs">{fmtDate(c.createdAt)}</td>
                      <td className="px-5 py-4 text-gray-400 text-xs">{fmtDate(expiresAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/super-admin/clients/${c.id}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 rounded-lg text-violet-300 text-xs font-medium transition"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Link>

                          <button
                            disabled={isBusy}
                            onClick={() => handleSuspend(c.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-yellow-400 text-xs font-medium transition disabled:opacity-40"
                            title="Suspend account"
                          >
                            <Ban className="w-3 h-3" />
                          </button>

                          <button
                            disabled={isBusy}
                            onClick={() => handleExtendTrial(c.id, 14)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-medium transition disabled:opacity-40"
                            title="Extend trial +14 days"
                          >
                            <Clock className="w-3 h-3" />
                            +14d
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
