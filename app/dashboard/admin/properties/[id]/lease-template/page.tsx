"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, ArrowLeft, Save, RotateCcw, Plus, Trash2,
  GripVertical, Eye, ChevronDown, ChevronUp, Loader2,
  CheckCircle, AlertCircle, Info, Sparkles,
} from "lucide-react";

const DEFAULT_CLAUSES = [
  {
    id: "rent",
    title: "Rent Payment",
    body: "Monthly rent of {{rentAmount}} is due on or before the 5th day of each calendar month. Late payments attract a penalty as stipulated by management.",
  },
  {
    id: "deposit",
    title: "Security Deposit",
    body: "The Tenant has paid a refundable security deposit of {{depositAmount}}. This deposit shall be refunded within 30 days after the Tenant vacates, subject to deductions for damages beyond normal wear and tear.",
  },
  {
    id: "utilities",
    title: "Utilities",
    body: "The Tenant is responsible for payment of water, electricity, garbage collection fees, and any other utility charges applicable to the unit. Water charges are billed monthly based on meter readings.",
  },
  {
    id: "use",
    title: "Use of Premises",
    body: "The Tenant shall use the premises for residential purposes only and shall not sublet, assign, or transfer any interest without written consent from Management.",
  },
  {
    id: "maintenance",
    title: "Maintenance",
    body: "The Tenant shall maintain the unit in a clean and sanitary condition and shall promptly report any damages or maintenance issues to Management. Intentional or negligent damage shall be the financial responsibility of the Tenant.",
  },
  {
    id: "notice",
    title: "Notice to Vacate",
    body: "Either party shall provide a minimum of 30 days written notice before the end of the lease period. Failure to provide notice may result in forfeiture of part of the security deposit.",
  },
  {
    id: "prohibited",
    title: "Prohibited Activities",
    body: "The Tenant shall not engage in any illegal activities on the premises, cause nuisance to other tenants, keep pets without written management approval, or make structural alterations to the unit.",
  },
  {
    id: "inspection",
    title: "Inspection",
    body: "Management reserves the right to inspect the unit with reasonable notice (minimum 24 hours) or immediately in case of emergency.",
  },
  {
    id: "renewal",
    title: "Renewal",
    body: "This lease may be renewed by mutual agreement in writing. Continued occupation after the end date without a new agreement shall constitute a month-to-month tenancy.",
  },
  {
    id: "law",
    title: "Governing Law",
    body: "This Agreement is governed by the laws of Kenya including the Landlord and Tenant Act (Cap 301) and the Rent Restriction Act (Cap 296).",
  },
];

type Clause = { id: string; title: string; body: string };

const PLACEHOLDERS = [
  { key: "{{rentAmount}}", desc: "Monthly rent (e.g. KSH 25,000)" },
  { key: "{{depositAmount}}", desc: "Security deposit amount" },
  { key: "{{startDate}}", desc: "Lease start date" },
  { key: "{{endDate}}", desc: "Lease end date" },
  { key: "{{tenantName}}", desc: "Tenant full name" },
  { key: "{{unitNumber}}", desc: "Unit number" },
  { key: "{{propertyName}}", desc: "Property name" },
];

function clausesToTemplate(clauses: Clause[]): string {
  return clauses.map((c, i) => `${i + 1}. ${c.title.toUpperCase()}: ${c.body}`).join("\n\n");
}

function templateToClauses(template: string): Clause[] | null {
  // Try to parse numbered clauses back out
  const lines = template.split(/\n\n+/);
  const parsed: Clause[] = [];
  for (const line of lines) {
    const match = line.match(/^\d+\.\s+([^:]+):\s+([\s\S]+)$/);
    if (match) {
      parsed.push({ id: `c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, title: match[1].trim(), body: match[2].trim() });
    }
  }
  return parsed.length > 0 ? parsed : null;
}

export default function LeaseTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [propertyName, setPropertyName] = useState("");
  const [clauses, setClauses] = useState<Clause[]>(DEFAULT_CLAUSES.map(c => ({ ...c })));
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [placeholdersOpen, setPlaceholdersOpen] = useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch(`/api/properties/${propertyId}/contract-template`)
      .then(r => r.json())
      .then(d => {
        setPropertyName(d.propertyName || "");
        if (d.contractTemplate) {
          const parsed = templateToClauses(d.contractTemplate);
          if (parsed) {
            setClauses(parsed);
            setIsCustom(true);
          } else {
            // Stored as free-form — put in first clause body
            setClauses([{ id: "custom_raw", title: "Contract Terms", body: d.contractTemplate }]);
            setIsCustom(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const template = clausesToTemplate(clauses);
      const res = await fetch(`/api/properties/${propertyId}/contract-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractTemplate: template }),
      });
      if (!res.ok) throw new Error();
      setIsCustom(true);
      showToast("success", "Template saved — all future contracts for this property will use these clauses.");
    } catch {
      showToast("error", "Failed to save template. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset to system defaults? This will clear your custom clauses.")) return;
    setSaving(true);
    try {
      await fetch(`/api/properties/${propertyId}/contract-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractTemplate: null }),
      });
      setClauses(DEFAULT_CLAUSES.map(c => ({ ...c })));
      setIsCustom(false);
      showToast("success", "Reset to system defaults.");
    } catch {
      showToast("error", "Failed to reset.");
    } finally {
      setSaving(false);
    }
  };

  const addClause = () => {
    setClauses(prev => [...prev, {
      id: `new_${Date.now()}`,
      title: "New Clause",
      body: "",
    }]);
  };

  const removeClause = (idx: number) => {
    setClauses(prev => prev.filter((_, i) => i !== idx));
  };

  const updateClause = (idx: number, field: "title" | "body", value: string) => {
    setClauses(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const moveClause = (from: number, to: number) => {
    if (to < 0 || to >= clauses.length) return;
    const next = [...clauses];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setClauses(next);
  };

  const previewText = clausesToTemplate(clauses);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  );

  return (
    <div className="max-w-4xl space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm shadow-xl transition-all ${
          toast.type === "success"
            ? "bg-green-900/95 border-green-500/40 text-green-200"
            : "bg-red-900/95 border-red-500/40 text-red-200"
        }`}>
          {toast.type === "success"
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/admin/properties">
          <button className="mt-1 p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Lease Contract Template</h1>
            {isCustom && (
              <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs rounded-full font-medium">
                Custom
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm ml-12">
            {propertyName} — define the standard clauses sent to every new tenant at this property
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-sm rounded-lg transition"
          >
            <Eye className="w-4 h-4" />
            {previewOpen ? "Hide Preview" : "Preview"}
          </button>
          {isCustom && (
            <button
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white text-sm rounded-lg transition"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition shadow-lg shadow-indigo-500/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Template
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-300/90 leading-relaxed">
          These clauses are injected into every lease contract automatically when you send a contract to a new tenant.
          <strong className="text-indigo-200"> Signed contracts are never modified</strong> — changes here only affect contracts sent in the future.
          You can add tenant-specific conditions (parking, pets, etc.) per lease when sending.
        </div>
      </div>

      {/* Placeholders reference */}
      <div className="bg-gray-900/60 border border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setPlaceholdersOpen(!placeholdersOpen)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/40 transition text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Available placeholders (auto-filled per tenant)
          </span>
          {placeholdersOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {placeholdersOpen && (
          <div className="border-t border-gray-700 px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLACEHOLDERS.map(p => (
              <div key={p.key} className="flex flex-col gap-0.5">
                <code className="text-yellow-300 text-xs font-mono bg-yellow-500/10 px-2 py-1 rounded">{p.key}</code>
                <span className="text-gray-500 text-xs pl-1">{p.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      {previewOpen && (
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
            <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" /> Contract preview (placeholders shown as-is)
            </span>
          </div>
          <pre className="px-5 py-4 text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
            {previewText}
          </pre>
        </div>
      )}

      {/* Clause editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Clauses — {clauses.length}
          </h2>
          <button
            onClick={addClause}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Clause
          </button>
        </div>

        {clauses.map((clause, idx) => (
          <div
            key={clause.id}
            className="group bg-gray-900/60 border border-gray-700 hover:border-gray-600 rounded-xl overflow-hidden transition"
          >
            {/* Clause header row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveClause(idx, idx - 1)}
                  disabled={idx === 0}
                  className="text-gray-600 hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed transition"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveClause(idx, idx + 1)}
                  disabled={idx === clauses.length - 1}
                  className="text-gray-600 hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed transition"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-gray-600 text-xs font-mono w-5 shrink-0 select-none">{idx + 1}.</span>

              <input
                value={clause.title}
                onChange={e => updateClause(idx, "title", e.target.value)}
                className="flex-1 bg-transparent text-white font-semibold text-sm focus:outline-none focus:ring-0 placeholder:text-gray-600"
                placeholder="Clause title"
              />

              <button
                onClick={() => removeClause(idx)}
                className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition shrink-0"
                title="Remove clause"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Clause body */}
            <textarea
              value={clause.body}
              onChange={e => updateClause(idx, "body", e.target.value)}
              rows={3}
              className="w-full bg-transparent px-4 py-3 text-gray-300 text-sm focus:outline-none resize-none placeholder:text-gray-600 leading-relaxed"
              placeholder="Clause text... use {{placeholders}} for dynamic values"
            />
          </div>
        ))}

        {clauses.length === 0 && (
          <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl">
            <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No clauses yet</p>
            <button onClick={addClause} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm transition">
              Add your first clause
            </button>
          </div>
        )}
      </div>

      {/* Save footer */}
      <div className="flex items-center justify-between py-4 border-t border-gray-800">
        <p className="text-gray-500 text-sm">
          {isCustom ? "Custom template active for this property" : "Using system default clauses"}
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg transition shadow-lg shadow-indigo-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Template
        </button>
      </div>
    </div>
  );
}
