"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare, BookOpen, Globe, CheckCircle, XCircle,
  ChevronRight, Settings, Zap, RefreshCw, Send,
  ToggleLeft, ToggleRight, ExternalLink, Loader2,
  Building2, AlertCircle, Users, Megaphone,
} from "lucide-react";
import { Suspense } from "react";

// ── Types ────────────────────────────────────────────────────────────────

interface Integration {
  key: "whatsapp" | "quickbooks" | "listings";
  enabled: boolean;
  settings: Record<string, any>;
}

// ── Toast ────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const show = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };
  return { toast, show };
}

function Toast({ toast }: { toast: { type: "success" | "error"; msg: string } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${
      toast.type === "success"
        ? "bg-green-900/90 border-green-500/30 text-green-300"
        : "bg-red-900/90 border-red-500/30 text-red-300"
    }`}>
      {toast.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
      {toast.msg}
    </div>
  );
}

// ── WhatsApp Panel ───────────────────────────────────────────────────────

function WhatsAppPanel({ integration, onSave }: { integration: Integration | null; onSave: () => void }) {
  const { toast, show } = useToast();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [form, setForm] = useState({
    accountSid: integration?.settings?.accountSid ?? "",
    authToken: integration?.settings?.authToken ?? "",
    fromNumber: integration?.settings?.fromNumber ?? "",
  });
  const enabled = integration?.enabled ?? false;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "whatsapp", enabled: true, settings: { ...form, enabled: true } }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      show("success", "WhatsApp configuration saved");
      onSave();
    } catch (e: any) {
      show("error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    await fetch("/api/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "whatsapp", enabled: !enabled }),
    });
    onSave();
  }

  async function handleTest() {
    if (!testPhone) return;
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "test", phone: testPhone }),
      });
      const data = await res.json();
      if (data.success) show("success", `Test message sent! SID: ${data.sid}`);
      else show("error", data.error ?? "Failed to send test");
    } finally {
      setTesting(false);
    }
  }

  async function handleBulkReminder() {
    setSending(true);
    try {
      const res = await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reminder" }),
      });
      const data = await res.json();
      show("success", `Sent: ${data.sent} | Failed: ${data.failed} | No phone: ${data.noPhone ?? 0}`);
    } catch (e: any) {
      show("error", e.message);
    } finally {
      setSending(false);
    }
  }

  async function handleOverdueBlast() {
    setSending(true);
    try {
      const res = await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "overdue" }),
      });
      const data = await res.json();
      show("success", `Overdue notices sent: ${data.sent} | Failed: ${data.failed}`);
    } catch (e: any) {
      show("error", e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      {/* Status + toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${enabled ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
          <span className="text-gray-300 text-sm font-medium">{enabled ? "Active" : "Inactive"}</span>
        </div>
        <button onClick={handleToggle} className="text-gray-400 hover:text-white transition">
          {enabled ? <ToggleRight className="w-8 h-8 text-green-400" /> : <ToggleLeft className="w-8 h-8" />}
        </button>
      </div>

      {/* Config form */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Twilio Credentials</h4>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Account SID</label>
          <input value={form.accountSid} onChange={e => setForm(f => ({ ...f, accountSid: e.target.value }))}
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Auth Token</label>
          <input type="password" value={form.authToken} onChange={e => setForm(f => ({ ...f, authToken: e.target.value }))}
            placeholder="Your Twilio auth token"
            className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">WhatsApp From Number</label>
          <input value={form.fromNumber} onChange={e => setForm(f => ({ ...f, fromNumber: e.target.value }))}
            placeholder="whatsapp:+14155238886"
            className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition" />
        </div>
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Save Configuration"}
        </button>
      </div>

      {/* Test message */}
      {enabled && (
        <div className="border-t border-gray-800 pt-5 space-y-4">
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Test & Send</h4>
          <div className="flex gap-2">
            <input value={testPhone} onChange={e => setTestPhone(e.target.value)}
              placeholder="+254712345678"
              className="flex-1 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition" />
            <button onClick={handleTest} disabled={testing || !testPhone}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg transition text-sm flex items-center gap-1.5">
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Test
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleBulkReminder} disabled={sending}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
              Rent Reminders
            </button>
            <button onClick={handleOverdueBlast} disabled={sending}
              className="bg-red-900/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 font-medium py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
              Overdue Notices
            </button>
          </div>
          <p className="text-gray-600 text-xs">Reminders go to all tenants with phone numbers. Overdue notices go to tenants with overdue bills.</p>
        </div>
      )}
    </div>
  );
}

// ── QuickBooks Panel ─────────────────────────────────────────────────────

function QuickBooksPanel({ integration, onSave }: { integration: Integration | null; onSave: () => void }) {
  const { toast, show } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [syncDays, setSyncDays] = useState(30);
  const connected = integration?.enabled && integration?.settings?.accessToken;
  const connectedAt = integration?.settings?.connectedAt;

  async function handleSync(type: "all" | "payments" | "expenses") {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/quickbooks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, days: syncDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const p = data.results?.payments;
      const e = data.results?.expenses;
      show("success", `Synced — Payments: ${p?.synced ?? 0} OK, ${p?.failed ?? 0} failed | Expenses: ${e?.synced ?? 0} OK, ${e?.failed ?? 0} failed`);
    } catch (err: any) {
      show("error", err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    await fetch("/api/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "quickbooks", enabled: false }),
    });
    onSave();
    show("success", "QuickBooks disconnected");
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      {connected ? (
        <>
          <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-300 font-medium text-sm">Connected to QuickBooks</p>
              {connectedAt && <p className="text-green-600 text-xs">Since {new Date(connectedAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Manual Sync</h4>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400 text-sm">Sync last</span>
              <select value={syncDays} onChange={e => setSyncDays(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none">
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["all", "payments", "expenses"] as const).map(type => (
                <button key={type} onClick={() => handleSync(type)} disabled={syncing}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-1.5 capitalize">
                  {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleDisconnect}
            className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 text-red-400 font-medium py-2.5 rounded-lg transition text-sm">
            Disconnect QuickBooks
          </button>
        </>
      ) : (
        <div className="space-y-5">
          <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-xl text-sm text-blue-300">
            Connect your QuickBooks Online account to automatically sync rent payments and expenses as transactions.
          </div>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" /><span>Rent payments → Sales Receipts</span></div>
            <div className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" /><span>Property expenses → Purchases</span></div>
            <div className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" /><span>Tenants → Customers</span></div>
            <div className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" /><span>P&L reports pull directly from QBO</span></div>
          </div>
          <a href="/api/integrations/quickbooks/connect"
            className="flex items-center justify-center gap-2 w-full bg-[#2CA01C] hover:bg-[#258a17] text-white font-semibold py-3 rounded-xl transition text-sm">
            <ExternalLink className="w-4 h-4" />
            Connect QuickBooks Online
          </a>
          <p className="text-gray-600 text-xs text-center">You&apos;ll be redirected to Intuit to authorize access. No data is shared without your permission.</p>
        </div>
      )}
    </div>
  );
}

// ── Listings Panel ───────────────────────────────────────────────────────

function ListingsPanel({ integration, onSave }: { integration: Integration | null; onSave: () => void }) {
  const { toast, show } = useToast();
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const enabled = integration?.enabled ?? false;
  const settings = integration?.settings ?? {};

  const [form, setForm] = useState({
    jumiaEnabled: settings?.jumiaHouse?.enabled ?? false,
    jumiaApiKey: settings?.jumiaHouse?.apiKey ?? "",
    jumiaAgencyId: settings?.jumiaHouse?.agencyId ?? "",
    brkEnabled: settings?.buyRentKenya?.enabled ?? false,
    brkApiKey: settings?.buyRentKenya?.apiKey ?? "",
    brkAgentId: settings?.buyRentKenya?.agentId ?? "",
    ppEnabled: settings?.propertyPro?.enabled ?? false,
    ppApiKey: settings?.propertyPro?.apiKey ?? "",
    ppAgentEmail: settings?.propertyPro?.agentEmail ?? "",
  });

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "listings",
          enabled: form.jumiaEnabled || form.brkEnabled || form.ppEnabled,
          settings: {
            jumiaHouse: form.jumiaEnabled ? { enabled: true, apiKey: form.jumiaApiKey, agencyId: form.jumiaAgencyId } : { enabled: false },
            buyRentKenya: form.brkEnabled ? { enabled: true, apiKey: form.brkApiKey, agentId: form.brkAgentId } : { enabled: false },
            propertyPro: form.ppEnabled ? { enabled: true, apiKey: form.ppApiKey, agentEmail: form.ppAgentEmail } : { enabled: false },
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      show("success", "Listing portals saved");
      onSave();
    } catch (e: any) {
      show("error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePushAll() {
    setPushing(true);
    try {
      const res = await fetch("/api/integrations/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push-all-vacant" }),
      });
      const data = await res.json();
      show("success", `Published ${data.pushed} vacant units to listing portals`);
    } catch (e: any) {
      show("error", e.message);
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      {[
        {
          label: "Jumia House",
          key: "jumia",
          enabledKey: "jumiaEnabled",
          fields: [
            { label: "API Key", key: "jumiaApiKey", type: "password" },
            { label: "Agency ID", key: "jumiaAgencyId", type: "text" },
          ],
        },
        {
          label: "BuyRentKenya",
          key: "brk",
          enabledKey: "brkEnabled",
          fields: [
            { label: "API Key", key: "brkApiKey", type: "password" },
            { label: "Agent ID", key: "brkAgentId", type: "text" },
          ],
        },
        {
          label: "PropertyPro Kenya",
          key: "pp",
          enabledKey: "ppEnabled",
          fields: [
            { label: "API Key", key: "ppApiKey", type: "password" },
            { label: "Agent Email", key: "ppAgentEmail", type: "email" },
          ],
        },
      ].map(portal => (
        <div key={portal.key} className="border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-semibold text-sm">{portal.label}</h4>
            <button onClick={() => setForm(f => ({ ...f, [portal.enabledKey]: !(f as any)[portal.enabledKey] }))}
              className="text-gray-400 hover:text-white transition">
              {(form as any)[portal.enabledKey]
                ? <ToggleRight className="w-7 h-7 text-green-400" />
                : <ToggleLeft className="w-7 h-7" />}
            </button>
          </div>
          {(form as any)[portal.enabledKey] && portal.fields.map(field => (
            <div key={field.key}>
              <label className="block text-xs text-gray-400 mb-1.5">{field.label}</label>
              <input
                type={field.type}
                value={(form as any)[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 transition"
              />
            </div>
          ))}
        </div>
      ))}

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Save Portal Settings"}
      </button>

      {enabled && (
        <button onClick={handlePushAll} disabled={pushing}
          className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2">
          {pushing ? <><Loader2 className="w-4 h-4 animate-spin" />Publishing...</> : <><Globe className="w-4 h-4" />Publish All Vacant Units</>}
        </button>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

const CARDS = [
  {
    key: "whatsapp" as const,
    label: "WhatsApp Business",
    description: "Send rent reminders, payment confirmations, and maintenance updates via WhatsApp.",
    icon: MessageSquare,
    color: "from-green-600 to-emerald-700",
    glow: "shadow-green-500/20",
    features: ["Rent payment reminders", "Overdue notices", "Maintenance updates", "Bulk broadcasts"],
  },
  {
    key: "quickbooks" as const,
    label: "QuickBooks Online",
    description: "Automatically sync payments and expenses to your QuickBooks accounting software.",
    icon: BookOpen,
    color: "from-blue-600 to-indigo-700",
    glow: "shadow-blue-500/20",
    features: ["Payments → Sales Receipts", "Expenses → Purchases", "Tenants → Customers", "P&L reporting"],
  },
  {
    key: "listings" as const,
    label: "Listing Portals",
    description: "Auto-publish vacant units to Jumia House, BuyRentKenya, and PropertyPro Kenya.",
    icon: Globe,
    color: "from-violet-600 to-purple-700",
    glow: "shadow-violet-500/20",
    features: ["Jumia House", "BuyRentKenya", "PropertyPro Kenya", "Auto-publish on vacancy"],
  },
];

function IntegrationsPageInner() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const qbo = searchParams.get("qbo");
    if (qbo === "connected") show("success", "QuickBooks connected successfully!");
    if (qbo === "error") show("error", `QuickBooks connection failed: ${searchParams.get("reason") ?? "unknown error"}`);
  }, []);

  function getIntegration(key: string) {
    return integrations.find(i => i.key === key) ?? null;
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-violet-400" /> Integrations
        </h1>
        <p className="text-gray-400 text-sm mt-1">Connect Makeja Homes with your favourite tools and platforms</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {CARDS.map(card => {
            const Icon = card.icon;
            const integration = getIntegration(card.key);
            const isConnected = integration?.enabled ?? false;
            const isOpen = activePanel === card.key;

            return (
              <div key={card.key} className="flex flex-col">
                {/* Card header */}
                <div
                  className={`bg-gray-900/80 border rounded-2xl overflow-hidden transition-all ${isOpen ? "border-violet-500/40" : "border-gray-800/80 hover:border-gray-700"}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg ${card.glow} flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        isConnected
                          ? "bg-green-500/15 text-green-400 border-green-500/30"
                          : "bg-gray-800 text-gray-500 border-gray-700"
                      }`}>
                        {isConnected ? "Connected" : "Not connected"}
                      </span>
                    </div>

                    <h3 className="text-white font-bold text-base mb-1">{card.label}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">{card.description}</p>

                    <ul className="space-y-1.5 mb-5">
                      {card.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => setActivePanel(isOpen ? null : card.key)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isOpen
                          ? "bg-violet-600 text-white"
                          : "bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:text-white"
                      }`}>
                      <span className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        {isOpen ? "Close Settings" : "Configure"}
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                  </div>

                  {/* Expandable panel */}
                  {isOpen && (
                    <div className="border-t border-gray-800 p-5">
                      {card.key === "whatsapp" && (
                        <WhatsAppPanel integration={integration} onSave={load} />
                      )}
                      {card.key === "quickbooks" && (
                        <QuickBooksPanel integration={integration} onSave={load} />
                      )}
                      {card.key === "listings" && (
                        <ListingsPanel integration={integration} onSave={load} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info strip */}
      <div className="flex items-start gap-3 p-4 bg-gray-900/60 border border-gray-800 rounded-xl text-sm text-gray-400">
        <AlertCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
        <div>
          All integration credentials are stored encrypted per-tenant and never shared across accounts.
          WhatsApp requires a Twilio account with WhatsApp Business enabled.
          QuickBooks requires a QuickBooks Online subscription.
          Listing portals require a partner/developer account with each portal.
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    }>
      <IntegrationsPageInner />
    </Suspense>
  );
}
