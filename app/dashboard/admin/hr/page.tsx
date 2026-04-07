"use client";

import { useState, useEffect } from "react";
import {
  Users, DollarSign, Loader2, CheckCircle, AlertCircle, ChevronDown,
  Edit2, Play, RefreshCw, Banknote, Phone, Building2, Calendar,
  Clock, Briefcase, X, Check, User,
} from "lucide-react";

const KES = (n: number) => `KES ${Math.round(n || 0).toLocaleString()}`;

const roleColors: Record<string, string> = {
  ADMIN: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  MANAGER: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  CARETAKER: "bg-green-500/15 text-green-400 border-green-500/30",
  STOREKEEPER: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  TECHNICAL: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const empTypeLabel: Record<string, string> = {
  FULL_TIME: "Full-time", PART_TIME: "Part-time",
  CONTRACT: "Contract", CASUAL: "Casual",
};

interface StaffMember {
  id: string; firstName: string; lastName: string; email: string; role: string; isActive: boolean;
  profileId: string | null;
  employmentType: string | null; startDate: string | null; salary: number | null;
  salaryFrequency: string | null; bankName: string | null; bankAccountNumber: string | null;
  bankAccountName: string | null; mpesaNumber: string | null; paymentMethod: string | null;
  benefits: string | null; noSalary: boolean; lastPaidAt: string | null; notes: string | null;
}

interface HRFormState {
  employmentType: string; startDate: string; salary: string; salaryFrequency: string;
  bankName: string; bankAccountNumber: string; bankAccountName: string;
  mpesaNumber: string; paymentMethod: string; benefits: string; notes: string;
  noSalary: boolean;
}

const defaultForm = (): HRFormState => ({
  employmentType: "FULL_TIME", startDate: "", salary: "", salaryFrequency: "MONTHLY",
  bankName: "", bankAccountNumber: "", bankAccountName: "",
  mpesaNumber: "", paymentMethod: "BANK", benefits: "", notes: "", noSalary: false,
});

export default function HRPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit HR profile
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HRFormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Payroll run
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payrollDate, setPayrollDate] = useState(new Date().toISOString().split("T")[0]);
  const [payrollNotes, setPayrollNotes] = useState("");
  const [runningPayroll, setRunningPayroll] = useState(false);
  const [payrollResult, setPayrollResult] = useState<{ paid: string[]; skipped: string[]; message: string } | null>(null);

  // Enroll
  const [unenrolled, setUnenrolled] = useState<{ id: string; firstName: string; lastName: string; email: string; role: string; lastLoginAt: string | null; mustChangePassword: boolean }[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/payroll");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setStaff(data.staff || []);
      setUnenrolled(data.unenrolled || []);
      setTotalPayroll(data.totalMonthlyPayroll || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const enroll = async (userId: string) => {
    setEnrolling(userId);
    try {
      await fetch(`/api/users/${userId}/hr-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employmentType: "FULL_TIME", salaryFrequency: "MONTHLY", paymentMethod: "BANK" }),
      });
      await fetchStaff();
    } finally {
      setEnrolling(null);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const openEdit = (s: StaffMember) => {
    setEditingId(s.id);
    setSaveMsg("");
    setForm({
      employmentType: s.employmentType || "FULL_TIME",
      startDate: s.startDate ? s.startDate.split("T")[0] : "",
      salary: s.salary ? String(s.salary) : "",
      salaryFrequency: s.salaryFrequency || "MONTHLY",
      bankName: s.bankName || "",
      bankAccountNumber: s.bankAccountNumber || "",
      bankAccountName: s.bankAccountName || "",
      mpesaNumber: s.mpesaNumber || "",
      paymentMethod: s.paymentMethod || "BANK",
      benefits: s.benefits || "",
      notes: s.notes || "",
      noSalary: s.noSalary ?? false,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`/api/users/${editingId}/hr-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, salary: form.salary ? parseFloat(form.salary) : null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      setSaveMsg("Saved");
      await fetchStaff();
      setTimeout(() => setEditingId(null), 800);
    } catch (e: any) {
      setSaveMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const payableStaff = staff.filter(s => s.salary && !s.noSalary);
    if (selected.size === payableStaff.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(payableStaff.map(s => s.id)));
    }
  };

  const runPayroll = async () => {
    if (!selected.size) return;
    setRunningPayroll(true);
    setPayrollResult(null);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffIds: Array.from(selected),
          paymentDate: payrollDate,
          notes: payrollNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payroll failed");
      setPayrollResult(data);
      setSelected(new Set());
      await fetchStaff();
    } catch (e: any) {
      setPayrollResult({ paid: [], skipped: [], message: e.message });
    } finally {
      setRunningPayroll(false);
    }
  };

  const payableStaff = staff.filter(s => s.salary && !s.noSalary);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-purple-400" /> Staff & Payroll
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage employment details, salaries, and run payroll — automatically recorded as expenses.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "On Payroll", value: staff.length, icon: Users, color: "text-blue-400" },
          { label: "Salary Configured", value: payableStaff.length, icon: DollarSign, color: "text-green-400" },
          { label: "Monthly Payroll", value: KES(totalPayroll), icon: Banknote, color: "text-orange-400", wide: true },
          { label: "Not Yet Enrolled", value: unenrolled.length, icon: AlertCircle, color: "text-yellow-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Payroll result */}
      {payrollResult && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
          payrollResult.paid.length ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {payrollResult.paid.length ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold">{payrollResult.message}</p>
            {payrollResult.skipped.length > 0 && (
              <p className="text-xs mt-1 opacity-75">Skipped: {payrollResult.skipped.join(", ")}</p>
            )}
          </div>
          <button onClick={() => setPayrollResult(null)} className="ml-auto shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Payroll run panel */}
      {selected.size > 0 && (
        <div className="bg-gray-900/80 border border-purple-500/30 rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-purple-300 text-sm font-medium">
            <Play className="w-4 h-4" />
            Run payroll for {selected.size} staff member{selected.size !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input type="date" value={payrollDate} onChange={e => setPayrollDate(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none" />
            <input type="text" value={payrollNotes} onChange={e => setPayrollNotes(e.target.value)}
              placeholder="Notes (optional)…"
              className="flex-1 min-w-0 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:border-purple-500 focus:outline-none" />
          </div>
          <button onClick={runPayroll} disabled={runningPayroll}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition">
            {runningPayroll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Process & Record Expenses
          </button>
        </div>
      )}

      {/* Not yet enrolled */}
      {unenrolled.length > 0 && (
        <div className="bg-gray-900/40 border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800">
            <User className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-300">Not yet enrolled in payroll ({unenrolled.length})</p>
            <span className="text-[10px] text-gray-600 ml-1">— must have accepted invite to enroll</span>
          </div>
          <div className="divide-y divide-gray-800/40">
            {unenrolled.map(u => {
              const hasLoggedIn = !!u.lastLoginAt;
              return (
                <div key={u.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${hasLoggedIn ? "bg-gradient-to-br from-orange-500 to-red-500 text-white" : "bg-gray-800 text-gray-500"}`}>
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${hasLoggedIn ? "text-white" : "text-gray-500"}`}>{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-gray-600 truncate">{u.email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${roleColors[u.role] ?? "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}>
                    {u.role}
                  </span>
                  {hasLoggedIn ? (
                    <button
                      onClick={() => enroll(u.id)}
                      disabled={enrolling === u.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-400 text-xs font-medium rounded-lg transition disabled:opacity-40"
                    >
                      {enrolling === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <User className="w-3 h-3" />}
                      Enroll
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-700 italic px-2">Invite pending</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Staff table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={selected.size === payableStaff.length && payableStaff.length > 0}
              onChange={toggleAll}
              className="w-4 h-4 accent-purple-500 cursor-pointer" title="Select all with salary" />
            <p className="text-sm font-medium text-gray-300">Staff ({staff.length})</p>
          </div>
          <button onClick={fetchStaff} className="text-gray-500 hover:text-gray-300 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {staff.length === 0 ? (
          <div className="py-16 text-center text-gray-600">No staff found</div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {staff.map(s => (
              <div key={s.id}>
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/20 transition">
                  {/* Checkbox */}
                  <input type="checkbox"
                    checked={selected.has(s.id)}
                    disabled={!s.salary || s.noSalary}
                    onChange={() => toggleSelect(s.id)}
                    className="w-4 h-4 accent-purple-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                  />

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {s.firstName[0]}{s.lastName[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{s.firstName} {s.lastName}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${roleColors[s.role] ?? "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}>
                        {s.role}
                      </span>
                      {s.employmentType && (
                        <span className="text-[10px] text-gray-500">{empTypeLabel[s.employmentType] ?? s.employmentType}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{s.email}</p>
                  </div>

                  {/* Salary */}
                  <div className="text-right hidden sm:block">
                    {s.noSalary ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-500/10 text-gray-500 border-gray-600/40 font-medium">Volunteer</span>
                    ) : s.salary ? (
                      <>
                        <p className="text-sm font-bold text-green-400">{KES(s.salary)}</p>
                        <p className="text-[10px] text-gray-500">/{s.salaryFrequency?.toLowerCase() ?? 'month'}</p>
                      </>
                    ) : (
                      <p className="text-xs text-yellow-500/70 italic">No salary set</p>
                    )}
                  </div>

                  {/* Payment method */}
                  <div className="hidden md:flex items-center gap-1 text-xs text-gray-500 w-20">
                    {s.paymentMethod === 'MPESA' ? <Phone className="w-3 h-3" /> : s.paymentMethod === 'CASH' ? <DollarSign className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                    {s.paymentMethod || "—"}
                  </div>

                  {/* Last paid */}
                  <div className="hidden lg:block text-xs text-gray-600 w-28 text-right">
                    {s.lastPaidAt ? (
                      <span className="text-gray-400">{new Date(s.lastPaidAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                    ) : (
                      <span className="text-gray-700">Never paid</span>
                    )}
                  </div>

                  {/* Edit */}
                  <button onClick={() => editingId === s.id ? setEditingId(null) : openEdit(s)}
                    className="ml-2 p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition flex-shrink-0">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Inline HR editor */}
                {editingId === s.id && (
                  <div className="px-5 pb-5 bg-gray-900/40 border-t border-gray-800/60">
                    <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Employment Type</label>
                        <select value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none">
                          <option value="FULL_TIME">Full-time</option>
                          <option value="PART_TIME">Part-time</option>
                          <option value="CONTRACT">Contract</option>
                          <option value="CASUAL">Casual</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Start Date</label>
                        <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none" />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Salary (KES)</label>
                        <input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
                          placeholder="e.g. 50000"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none" />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Salary Frequency</label>
                        <select value={form.salaryFrequency} onChange={e => setForm(f => ({ ...f, salaryFrequency: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none">
                          <option value="MONTHLY">Monthly</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="ANNUALLY">Annually</option>
                          <option value="ONE_TIME">One-time</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Payment Method</label>
                        <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none">
                          <option value="BANK">Bank Transfer</option>
                          <option value="MPESA">M-Pesa</option>
                          <option value="CASH">Cash</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">M-Pesa Number</label>
                        <input type="text" value={form.mpesaNumber} onChange={e => setForm(f => ({ ...f, mpesaNumber: e.target.value }))}
                          placeholder="07XX XXX XXX"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none" />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Bank Name</label>
                        <input type="text" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                          placeholder="e.g. KCB"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none" />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Bank Account Number</label>
                        <input type="text" value={form.bankAccountNumber} onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none" />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Account Name</label>
                        <input type="text" value={form.bankAccountName} onChange={e => setForm(f => ({ ...f, bankAccountName: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none" />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Benefits / Allowances</label>
                        <input type="text" value={form.benefits} onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))}
                          placeholder="e.g. Medical, Transport allowance KES 5,000"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none" />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Notes</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none resize-none" />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input type="checkbox" checked={form.noSalary}
                            onChange={e => setForm(f => ({ ...f, noSalary: e.target.checked }))}
                            className="w-4 h-4 accent-purple-500 cursor-pointer" />
                          <span className="text-sm text-gray-300">Volunteer / No salary</span>
                          <span className="text-xs text-gray-600">— excluded from payroll runs; still appears on roster</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                      <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 text-sm rounded-lg transition">
                        Cancel
                      </button>
                      {saveMsg && (
                        <span className={`text-xs ${saveMsg === "Saved" ? "text-green-400" : "text-red-400"}`}>{saveMsg}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-700">
        Running payroll creates a <strong className="text-gray-500">SALARIES</strong> expense entry per staff member, visible in Expenses and included in financial reports.
      </p>
    </div>
  );
}
