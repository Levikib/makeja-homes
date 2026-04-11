"use client";

import { useState, useEffect } from "react";
import {
  Users, UserPlus, Shield, Eye, Ban, CheckCircle,
  RefreshCw, Copy, Check, X, ChevronDown,
} from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "OWNER" | "VIEWER";
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

function fmtDate(d?: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d?: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "VIEWER">("VIEWER");
  const [inviteResult, setInviteResult] = useState<{ link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function fetchMembers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/team", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch team");
      const data = await res.json();
      setMembers(data.users ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMembers(); }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleInvite() {
    setActionLoading("invite");
    try {
      const res = await fetch("/api/super-admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: inviteEmail, firstName: inviteFirstName, lastName: inviteLastName, role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteResult({ link: data.inviteLink });
        showToast(`Invitation sent to ${inviteEmail}`, true);
        fetchMembers();
      } else {
        showToast(data.error ?? "Failed to invite", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleActive(member: TeamMember) {
    setActionLoading(member.id + "-active");
    try {
      const res = await fetch("/api/super-admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: member.id, isActive: !member.isActive }),
      });
      if (res.ok) {
        showToast(`${member.firstName} ${member.isActive ? "deactivated" : "reactivated"}`, true);
        fetchMembers();
      } else {
        const d = await res.json();
        showToast(d.error ?? "Failed", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setActionLoading(null);
    }
  }

  async function changeRole(member: TeamMember, role: "OWNER" | "VIEWER") {
    setActionLoading(member.id + "-role");
    try {
      const res = await fetch("/api/super-admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: member.id, role }),
      });
      if (res.ok) {
        showToast(`${member.firstName}'s role changed to ${role}`, true);
        fetchMembers();
      } else {
        showToast("Failed to change role", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setActionLoading(null);
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border text-sm font-medium shadow-lg transition-all ${
          toast.ok ? "bg-green-500/20 border-green-500/40 text-green-300" : "bg-red-500/20 border-red-500/40 text-red-300"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Manage your super-admin team and access</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchMembers}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-sm transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowInvite(true); setInviteResult(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-white text-sm font-semibold transition">
            <UserPlus className="w-4 h-4" />
            Invite Team Member
          </button>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            {inviteResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-white font-bold">Invitation Sent!</h3>
                    <p className="text-gray-400 text-sm">An email was sent to {inviteEmail}</p>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-2">Share this invite link (valid 48h):</p>
                  <div className="flex items-center gap-2">
                    <p className="text-violet-300 text-xs font-mono flex-1 truncate">{inviteResult.link}</p>
                    <button onClick={() => copyLink(inviteResult.link)}
                      className="flex-shrink-0 p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button onClick={() => { setShowInvite(false); setInviteEmail(""); setInviteFirstName(""); setInviteLastName(""); setInviteRole("VIEWER"); }}
                  className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-white">Invite Team Member</h3>
                  <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-white transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">First Name *</label>
                      <input value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition"
                        placeholder="John" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Last Name *</label>
                      <input value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition"
                        placeholder="Doe" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Email Address *</label>
                    <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition"
                      placeholder="partner@example.com" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Access Level *</label>
                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "OWNER" | "VIEWER")}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition">
                      <option value="OWNER">Full Admin (Owner) — can manage clients, invite team, all actions</option>
                      <option value="VIEWER">Viewer — read-only access, no destructive actions</option>
                    </select>
                  </div>

                  <div className={`rounded-xl p-3 text-xs ${
                    inviteRole === "OWNER"
                      ? "bg-violet-900/20 border border-violet-700/30 text-violet-300"
                      : "bg-gray-800/60 border border-gray-700/30 text-gray-400"
                  }`}>
                    {inviteRole === "OWNER"
                      ? "⚠️ Full Admin can provision clients, activate/suspend accounts, invite other team members, and perform all platform actions."
                      : "👁 Viewer can see all clients, metrics, and subscription details — but cannot modify anything."}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setShowInvite(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition">
                      Cancel
                    </button>
                    <button
                      onClick={handleInvite}
                      disabled={actionLoading === "invite" || !inviteEmail || !inviteFirstName || !inviteLastName}
                      className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition">
                      {actionLoading === "invite" ? "Sending..." : "Send Invitation"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Team Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-white">Team Members</h2>
          <span className="ml-auto text-gray-500 text-sm">{members.length} member{members.length !== 1 ? "s" : ""}</span>
        </div>

        {error && (
          <div className="m-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-3">Member</th>
                  <th className="text-left px-6 py-3">Access Level</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Last Login</th>
                  <th className="text-left px-6 py-3">Added</th>
                  <th className="text-right px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">No team members yet</td>
                  </tr>
                )}
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-semibold">
                            {m.firstName[0]}{m.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{m.firstName} {m.lastName}</p>
                          <p className="text-gray-500 text-xs">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative inline-block">
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m, e.target.value as "OWNER" | "VIEWER")}
                          disabled={actionLoading === m.id + "-role"}
                          className={`appearance-none pl-2 pr-6 py-1 rounded-full text-xs font-medium border cursor-pointer transition ${
                            m.role === "OWNER"
                              ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                              : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                          } focus:outline-none`}
                        >
                          <option value="OWNER">Full Admin</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        m.isActive
                          ? "bg-green-500/20 text-green-300 border-green-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-600/30"
                      }`}>
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{fmtDateTime(m.lastLoginAt)}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{fmtDate(m.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleActive(m)}
                        disabled={actionLoading === m.id + "-active"}
                        title={m.isActive ? "Deactivate access" : "Reactivate access"}
                        className={`p-1.5 rounded-lg border transition disabled:opacity-40 ${
                          m.isActive
                            ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400"
                            : "bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-400"
                        }`}
                      >
                        {m.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-violet-900/10 border border-violet-700/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-violet-400" />
            <h3 className="text-white font-semibold text-sm">Full Admin (Owner)</h3>
          </div>
          <ul className="space-y-1.5 text-gray-400 text-xs">
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> Provision new clients</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> Activate / suspend subscriptions</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> Extend trials and change plans</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> Delete companies</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> Invite and manage team members</li>
          </ul>
        </div>
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-gray-400" />
            <h3 className="text-white font-semibold text-sm">Viewer</h3>
          </div>
          <ul className="space-y-1.5 text-gray-400 text-xs">
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> View all clients and metrics</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> View subscription details</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> View platform overview dashboard</li>
            <li className="flex items-center gap-2"><X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" /> Cannot modify any data</li>
            <li className="flex items-center gap-2"><X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" /> Cannot invite team members</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
