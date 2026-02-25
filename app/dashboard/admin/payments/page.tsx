"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  DollarSign, Building, Receipt, X, Loader2, CheckCircle,
  ChevronDown, ChevronUp, Droplets, Search, Calendar, CreditCard,
  TrendingUp, AlertTriangle, Clock, BarChart3, Send, RefreshCw,
  Banknote, Smartphone, ArrowUpRight, ArrowDownRight,
  SlidersHorizontal, XCircle, MailCheck, ChevronRight,
  FileText, Bell, Zap, Filter, Users, SendHorizonal, Repeat,
} from "lucide-react";
import NotificationModal from "@/components/NotificationModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genKey = (tid: string, type: string, year: number, month: number) =>
  `${tid}_${type}_${year}_${month.toString().padStart(2, "0")}`;

const fmt = (n: number) => `KSh ${Math.round(n || 0).toLocaleString()}`;

const fmtDate = (d: any) => {
  try {
    return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
};

const fmtDateFull = (d: any) => {
  try {
    return new Date(d).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  } catch { return "—"; }
};

const methodLabel = (m: string) =>
  ({ MPESA: "M-Pesa", M_PESA: "M-Pesa", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", CASH: "Cash" }[m?.toUpperCase()] || m || "—");

const MethodIcon = ({ method }: { method: string }) => {
  const m = method?.toUpperCase();
  if (m === "MPESA" || m === "M_PESA") return <Smartphone className="h-3.5 w-3.5" />;
  if (m === "BANK_TRANSFER") return <Banknote className="h-3.5 w-3.5" />;
  return <DollarSign className="h-3.5 w-3.5" />;
};

const TYPE_STYLE: Record<string, string> = {
  RENT:      "bg-blue-500/15 text-blue-300 border-blue-500/30",
  WATER:     "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  GARBAGE:   "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  SECURITY:  "bg-violet-500/15 text-violet-300 border-violet-500/30",
  RECURRING: "bg-orange-500/15 text-orange-300 border-orange-500/30",
};
const pillClass = (type: string) => TYPE_STYLE[type] || "bg-gray-700/60 text-gray-300 border-gray-600";

// ─── Portal Dropdown ──────────────────────────────────────────────────────────
interface SelectOption { value: string; label: string; }

function CustomSelect({
  value, onChange, options, className = "",
}: {
  value: string; onChange: (v: string) => void; options: SelectOption[]; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 });
  const triggerRef      = useRef<HTMLButtonElement>(null);
  const dropRef         = useRef<HTMLDivElement>(null);
  const selectedLabel   = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? "Select…";

  const openDropdown = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen((p) => !p);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !dropRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className="flex items-center justify-between gap-2 w-full bg-gray-800 border border-gray-700 hover:border-gray-500 text-white text-sm rounded-lg px-3 py-2 transition-colors focus:outline-none focus:border-purple-500"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={dropRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 160), zIndex: 99999 }}
          className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl shadow-black/70 overflow-hidden"
        >
          <div className="max-h-64 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${value === opt.value ? "bg-purple-600 text-white" : "text-gray-200 hover:bg-gray-700"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tenant {
  id: string; firstName: string; lastName: string; email: string;
  unitNumber: string; rentAmount: number; propertyId: string;
  propertyName: string; leaseStartDate: string; fullName: string;
}
interface RcCharge { id: string; name: string; amount: number; startDate: string; }
interface UtilData {
  water: { month: number; year: number; amount: number; units: number }[];
  garbage: { month: number; year: number; amount: number }[];
  recurring: RcCharge[];
}
interface Component {
  key: string; type: string; label: string; amount: number;
  year: number; monthNum: number; monthLabel: string;
  isPaid: boolean; isSelected: boolean; isRealData: boolean;
}
interface MonthGroup {
  label: string; year: number; monthNum: number;
  components: Component[]; total: number; paid: number; outstanding: number;
}
interface RecordedPayment {
  id: string; tenantId: string; tenantName: string; tenantUnit: string;
  tenantProperty: string; amount: number; method: string; date: string;
  status: string; verificationStatus: string; ref: string; notes: string;
  components: PaymentComp[];
}
interface PaymentComp {
  componentKey: string; type: string; label: string; amount: number;
  year: number; monthNum: number; monthLabel: string;
}
interface GeneratedBill {
  id: string; tenantId: string; tenantName: string; tenantUnit: string;
  tenantProperty: string; tenantPropertyId: string; tenantEmail: string;
  type: string; label: string; amount: number; monthLabel: string;
  year: number; monthNum: number; componentKey: string;
  status: "UNPAID" | "OVERDUE"; isRealData: boolean;
}

// ─── Outstanding calculator ────────────────────────────────────────────────────
function computeOutstanding(tenant: Tenant, paidSet: Set<string>): number {
  if (!tenant.leaseStartDate || tenant.rentAmount <= 0) return 0;
  const start = new Date(tenant.leaseStartDate);
  start.setDate(1); start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(1); end.setHours(0, 0, 0, 0);
  let out = 0;
  const d = new Date(start);
  while (d <= end) {
    if (!paidSet.has(genKey(tenant.id, "RENT", d.getFullYear(), d.getMonth() + 1))) {
      out += tenant.rentAmount;
    }
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<"payments" | "bills">("payments");

  // Core data
  const [loading,    setLoading]    = useState(true);
  const [tenants,    setTenants]    = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [payments,   setPayments]   = useState<RecordedPayment[]>([]);
  const [paidSet,    setPaidSet]    = useState<Set<string>>(new Set());
  const [scopeProp,  setScopeProp]  = useState("");

  // Record modal
  const [showRecordModal,    setShowRecordModal]    = useState(false);
  const [saving,             setSaving]             = useState(false);
  const [loadingBreakdown,   setLoadingBreakdown]   = useState(false);
  const [recPropFilter,      setRecPropFilter]      = useState("");
  const [recFilteredTenants, setRecFilteredTenants] = useState<Tenant[]>([]);
  const [selectedTenant,     setSelectedTenant]     = useState<Tenant | null>(null);
  const [breakdown,          setBreakdown]          = useState<MonthGroup[]>([]);
  const [expandedMonths,     setExpandedMonths]     = useState<Set<string>>(new Set());
  const [paymentMethod,      setPaymentMethod]      = useState("CASH");
  const [paymentDate,        setPaymentDate]        = useState(new Date().toISOString().split("T")[0]);
  const [reference,          setReference]          = useState("");
  const [recordNotes,        setRecordNotes]        = useState("");

  // Detail modal
  const [detailPayment, setDetailPayment] = useState<RecordedPayment | null>(null);

  // Bills tab
  const [generatedBills,  setGeneratedBills]  = useState<GeneratedBill[]>([]);
  const [generatingBills, setGeneratingBills] = useState(false);
  const [billsGenerated,  setBillsGenerated]  = useState(false);
  const [sentReminders,   setSentReminders]   = useState<Set<string>>(new Set());
  const [reminderBill,    setReminderBill]    = useState<GeneratedBill | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [sendingBulk,     setSendingBulk]     = useState(false);
  const [bulkProgress,    setBulkProgress]    = useState({ done: 0, total: 0 });
  const bulkAbortRef = useRef(false);

  // Payment filters
  const [searchQuery,    setSearchQuery]    = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [filterMethod,   setFilterMethod]   = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");
  const [showFilters,    setShowFilters]    = useState(false);

  // Bill filters
  const [billSearch,       setBillSearch]       = useState("");
  const [billFilterType,   setBillFilterType]   = useState("");
  const [billFilterStatus, setBillFilterStatus] = useState<"" | "OVERDUE" | "UNPAID">("");

  // Notifications
  const [notification, setNotification] = useState({ open: false, type: "success" as "success" | "error", title: "", message: "" });
  const notify = (type: "success" | "error", title: string, message: string) =>
    setNotification({ open: true, type, title, message });

  // ── Scoped data ─────────────────────────────────────────────────────────────
  const scopedTenants = useMemo(
    () => scopeProp ? tenants.filter((t) => t.propertyId === scopeProp) : tenants,
    [tenants, scopeProp],
  );

  const scopedPayments = useMemo(() => {
    if (!scopeProp) return payments;
    const ids = new Set(scopedTenants.map((t) => t.id));
    return payments.filter((p) => ids.has(p.tenantId));
  }, [payments, scopedTenants, scopeProp]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const thisMo = now.getMonth(); const thisYr = now.getFullYear();
    const prevMo = thisMo === 0 ? 11 : thisMo - 1;
    const prevYr = thisMo === 0 ? thisYr - 1 : thisYr;
    const totalRevenue = scopedPayments.reduce((s, p) => s + p.amount, 0);
    const thisMoPay = scopedPayments.filter((p) => { const d = new Date(p.date); return d.getMonth() === thisMo && d.getFullYear() === thisYr; });
    const prevMoPay = scopedPayments.filter((p) => { const d = new Date(p.date); return d.getMonth() === prevMo && d.getFullYear() === prevYr; });
    const thisMonthRev = thisMoPay.reduce((s, p) => s + p.amount, 0);
    const prevMonthRev = prevMoPay.reduce((s, p) => s + p.amount, 0);
    const change = prevMonthRev > 0 ? ((thisMonthRev - prevMonthRev) / prevMonthRev) * 100 : 0;
    const totalOut = scopedTenants.reduce((s, t) => s + computeOutstanding(t, paidSet), 0);
    const unpaidThisMo = scopedTenants.filter((t) => !paidSet.has(genKey(t.id, "RENT", thisYr, thisMo + 1)) && t.rentAmount > 0).length;
    const mTotals: Record<string, number> = {};
    scopedPayments.forEach((p) => { mTotals[p.method] = (mTotals[p.method] || 0) + p.amount; });
    const topMethod = Object.entries(mTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const topMethodPct = totalRevenue > 0 ? Math.round(((mTotals[topMethod] || 0) / totalRevenue) * 100) : 0;
    return { totalRevenue, thisMonthRev, prevMonthRev, change, totalOut, unpaidThisMo, topMethod, topMethodPct, totalPayments: scopedPayments.length, thisMoCount: thisMoPay.length };
  }, [scopedPayments, scopedTenants, paidSet]);

  // ── Filtered payments ────────────────────────────────────────────────────────
  const filteredPayments = useMemo(() => scopedPayments.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.tenantName.toLowerCase().includes(q) && !p.ref.toLowerCase().includes(q) && !p.tenantUnit.toLowerCase().includes(q)) return false;
    }
    if (filterProperty) { const t = tenants.find((t) => t.id === p.tenantId); if (t?.propertyId !== filterProperty) return false; }
    if (filterMethod && p.method !== filterMethod) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterDateFrom && new Date(p.date) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(p.date) > new Date(filterDateTo + "T23:59:59")) return false;
    return true;
  }), [scopedPayments, tenants, searchQuery, filterProperty, filterMethod, filterStatus, filterDateFrom, filterDateTo]);

  const activeFiltersCount = [filterProperty, filterMethod, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length;

  // ── Filtered bills ────────────────────────────────────────────────────────────
  const filteredBills = useMemo(() => generatedBills.filter((b) => {
    if (billSearch) {
      const q = billSearch.toLowerCase();
      if (!b.tenantName.toLowerCase().includes(q) && !b.tenantUnit.toLowerCase().includes(q)) return false;
    }
    if (billFilterType && b.type !== billFilterType) return false;
    if (billFilterStatus && b.status !== billFilterStatus) return false;
    if (scopeProp && b.tenantPropertyId !== scopeProp) return false;
    return true;
  }), [generatedBills, billSearch, billFilterType, billFilterStatus, scopeProp]);

  const billStats = useMemo(() => ({
    total:    filteredBills.length,
    overdue:  filteredBills.filter((b) => b.status === "OVERDUE").length,
    unpaid:   filteredBills.filter((b) => b.status === "UNPAID").length,
    totalAmt: filteredBills.reduce((s, b) => s + b.amount, 0),
  }), [filteredBills]);

  const uniqueBulkTenants = useMemo(
    () => new Set(filteredBills.filter((b) => b.tenantEmail && !sentReminders.has(b.id)).map((b) => b.tenantId)).size,
    [filteredBills, sentReminders],
  );

  const propOpts: SelectOption[] = useMemo(() => [
    { value: "", label: "All Properties" },
    ...properties.map((p) => ({ value: p.id, label: p.name })),
  ], [properties]);

  // ── BUG FIX #1: Load tenants from correct endpoint ────────────────────────────
  // Was: fetch("/api/tenants") ← DOES NOT EXIST
  // Fixed: fetch("/api/admin/tenants/active") ← correct
  const loadAll = async () => {
    setLoading(true);
    try {
      const [tRes, pRes, prRes] = await Promise.allSettled([
        fetch("/api/admin/tenants/active"),                  // ← FIXED
        fetch("/api/admin/payments/list?limit=500"),
        fetch("/api/admin/properties/list"),
      ]);

      if (tRes.status === "fulfilled" && tRes.value.ok) {
        const raw = await tRes.value.json();
        // Handle both array response and { tenants: [...] } response
        const arr: any[] = Array.isArray(raw) ? raw : (raw.tenants || raw.data || []);
        const list: Tenant[] = arr.map((r: any) => ({
          id:             r.id,
          firstName:      r.users?.firstName?.trim() || "Unknown",
          lastName:       r.users?.lastName?.trim()  || "Tenant",
          email:          r.users?.email             || "",
          unitNumber:     r.units?.unitNumber        || "—",
          rentAmount:     Number(r.rentAmount)       || 0,
          propertyId:     r.units?.properties?.id   || r.units?.propertyId || "",
          propertyName:   r.units?.properties?.name || "Unknown",
          leaseStartDate: r.leaseStartDate           || new Date().toISOString(),
          fullName: `${r.users?.firstName?.trim() || "Unknown"} ${r.users?.lastName?.trim() || "Tenant"}`,
        }));
        setTenants(list);
        setRecFilteredTenants(list);
      }

      if (prRes.status === "fulfilled" && prRes.value.ok) {
        const d = await prRes.value.json();
        setProperties(d.properties || d.data || []);
      }

      if (pRes.status === "fulfilled" && pRes.value.ok) {
        const d = await pRes.value.json();
        const raw: any[] = d.payments || [];
        const processed: RecordedPayment[] = raw.map((p: any) => ({
          id:                 p.id,
          tenantId:           p.tenantId || "",
          tenantName:         p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}`.trim() : "Unknown",
          tenantUnit:         p.unit?.unitNumber  || "—",
          tenantProperty:     p.property?.name   || "—",
          amount:             Number(p.amount)   || 0,
          method:             p.paymentMethod    || "CASH",
          date:               p.paymentDate,
          status:             p.status           || "COMPLETED",
          verificationStatus: p.verificationStatus || "APPROVED",
          ref:                p.referenceNumber  || "—",
          notes:              p.notes            || "",
          components:         Array.isArray(p.paymentComponents) ? p.paymentComponents : [],
        }));
        setPayments(processed);
        const reg = new Set<string>();
        processed.forEach((p) => p.components.forEach((c) => { if (c.componentKey) reg.add(c.componentKey); }));
        setPaidSet(reg);
      }
    } catch (e) { console.error("loadAll:", e); }
    finally { setLoading(false); }
  };

  // ── BUG FIX #2 + #5: Fetch utilities with correct endpoints ───────────────────
  // Was: fetch(`/api/admin/recurring-charges?tenantId=...`) ← wrong path, no propertyId
  // Fixed: fetch(`/api/admin/recurring-charges/list?propertyId=...`) ← correct
  const fetchUtilData = async (tenantId: string, propertyId: string): Promise<UtilData> => {
    try {
      const [histRes, rcRes] = await Promise.allSettled([
        fetch(`/api/admin/tenants/history?tenantId=${tenantId}`),
        fetch(`/api/admin/recurring-charges/list?propertyId=${propertyId}`), // ← FIXED
      ]);

      let t: any = {};
      if (histRes.status === "fulfilled" && histRes.value.ok) {
        const json = await histRes.value.json();
        t = json.tenant || json;
      }

      const water = (t.water_readings || t.waterReadings || [])
        .map((r: any) => ({
          month:  Number(r.month),
          year:   Number(r.year),
          amount: r.amountDue || r.amount_due || r.amount || 0,
          units:  (r.currentReading || r.current_reading || 0) - (r.previousReading || r.previous_reading || 0),
        }))
        .filter((r: any) => r.amount > 0);

      const garbage = (t.garbage_fees || t.garbageFees || [])
        .map((g: any) => {
          const d = new Date(g.month || g.date || g.createdAt);
          return { month: d.getMonth() + 1, year: d.getFullYear(), amount: Number(g.amount) || 0 };
        })
        .filter((g: any) => g.amount > 0);

      let rawRc: any[] = [];
      if (rcRes.status === "fulfilled" && rcRes.value.ok) {
        const rcJson = await rcRes.value.json();
        rawRc = rcJson.recurringCharges || rcJson.recurring_charges || rcJson.data || rcJson || [];
        if (!Array.isArray(rawRc)) rawRc = [];
      }
      // Fallback to tenant history if endpoint returns nothing
      if (rawRc.length === 0) {
        rawRc = t.recurring_charges || t.recurringCharges || [];
      }

      const recurring: RcCharge[] = rawRc
        .filter((r: any) => r.isActive !== false)
        .map((r: any) => ({
          id:        r.id || "",
          name:      r.name || "Recurring Charge",
          amount:    Number(r.amount || 0),
          startDate: r.startDate || r.start_date || r.createdAt || new Date().toISOString(),
        }))
        .filter((r) => r.amount > 0);

      return { water, garbage, recurring };
    } catch (err) {
      console.error("fetchUtilData error:", err);
      return { water: [], garbage: [], recurring: [] };
    }
  };

  // ── Generate bills ─────────────────────────────────────────────────────────────
  const handleGenerateBills = useCallback(async () => {
    setGeneratingBills(true);
    setBillsGenerated(false);

    const now = new Date();
    const curYear  = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const toProcess = scopeProp ? tenants.filter((t) => t.propertyId === scopeProp) : tenants;

    // Phase 1: Rent bills (instant)
    const rentBills: GeneratedBill[] = [];
    for (const tenant of toProcess) {
      if (!tenant.leaseStartDate || tenant.rentAmount <= 0) continue;
      const leaseStart = new Date(tenant.leaseStartDate);
      leaseStart.setDate(1); leaseStart.setHours(0, 0, 0, 0);
      const todayStart = new Date(curYear, curMonth - 1, 1);
      const d = new Date(leaseStart);
      while (d <= todayStart) {
        const year = d.getFullYear(); const monthNum = d.getMonth() + 1;
        const key  = genKey(tenant.id, "RENT", year, monthNum);
        const isOverdue = year < curYear || (year === curYear && monthNum < curMonth);
        const monthLabel = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (!paidSet.has(key)) {
          rentBills.push({
            id: `${key}_bill`, tenantId: tenant.id, tenantName: tenant.fullName,
            tenantUnit: tenant.unitNumber, tenantProperty: tenant.propertyName,
            tenantPropertyId: tenant.propertyId, tenantEmail: tenant.email,
            type: "RENT", label: "Monthly Rent", amount: tenant.rentAmount,
            monthLabel, year, monthNum, componentKey: key,
            status: isOverdue ? "OVERDUE" : "UNPAID", isRealData: true,
          });
        }
        d.setMonth(d.getMonth() + 1);
      }
    }
    rentBills.sort((a, b) => a.status !== b.status ? (a.status === "OVERDUE" ? -1 : 1) : a.tenantName.localeCompare(b.tenantName));
    setGeneratedBills(rentBills);
    setBillsGenerated(true);

    // Phase 2: Utilities + Recurring (background enrichment)
    const extraBills: GeneratedBill[] = [];
    for (const tenant of toProcess) {
      if (!tenant.leaseStartDate || !tenant.propertyId) continue;
      // BUG FIX: pass propertyId to fetchUtilData
      const utils = await fetchUtilData(tenant.id, tenant.propertyId);
      if (!utils.water.length && !utils.garbage.length && !utils.recurring.length) continue;

      const leaseStart = new Date(tenant.leaseStartDate);
      leaseStart.setDate(1); leaseStart.setHours(0, 0, 0, 0);
      const todayStart = new Date(curYear, curMonth - 1, 1);
      const d = new Date(leaseStart);

      while (d <= todayStart) {
        const year = d.getFullYear(); const monthNum = d.getMonth() + 1;
        const isOverdue = year < curYear || (year === curYear && monthNum < curMonth);
        const monthLabel = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

        const pushExtra = (type: string, label: string, amount: number) => {
          if (amount <= 0) return;
          const keyType = type === "RECURRING"
            ? `RECURRING_${label.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`
            : type;
          const key = genKey(tenant.id, keyType, year, monthNum);
          if (paidSet.has(key)) return;
          extraBills.push({
            id: `${key}_bill`, tenantId: tenant.id, tenantName: tenant.fullName,
            tenantUnit: tenant.unitNumber, tenantProperty: tenant.propertyName,
            tenantPropertyId: tenant.propertyId, tenantEmail: tenant.email,
            type, label, amount, monthLabel, year, monthNum, componentKey: key,
            status: isOverdue ? "OVERDUE" : "UNPAID", isRealData: true,
          });
        };

        const wd = utils.water.find((r) => r.month === monthNum && r.year === year);
        if (wd) pushExtra("WATER", `Water (${wd.units} units)`, wd.amount);
        const gd = utils.garbage.find((g) => g.month === monthNum && g.year === year);
        if (gd) pushExtra("GARBAGE", "Garbage Collection", gd.amount);
        for (const rc of utils.recurring) {
          const rcStart = new Date(rc.startDate);
          rcStart.setDate(1);
          if (d >= rcStart) pushExtra("RECURRING", rc.name, rc.amount);
        }
        d.setMonth(d.getMonth() + 1);
      }
    }

    setGeneratedBills((prev) => {
      const existing = new Set(prev.map((b) => b.componentKey));
      const merged = [...prev, ...extraBills.filter((b) => !existing.has(b.componentKey))];
      merged.sort((a, b) => a.status !== b.status ? (a.status === "OVERDUE" ? -1 : 1) : a.tenantName.localeCompare(b.tenantName));
      return merged;
    });
    setGeneratingBills(false);

    const total = rentBills.length + extraBills.length;
    const overdue = [...rentBills, ...extraBills].filter((b) => b.status === "OVERDUE").length;
    notify("success", "Bills Ready", `${total} outstanding bills · ${overdue} overdue`);
  }, [tenants, paidSet, scopeProp]);

  // ── Single reminder ──────────────────────────────────────────────────────────
  const handleSendReminder = async (bill: GeneratedBill) => {
    setSendingReminder(true);
    try {
      const res = await fetch("/api/admin/bills/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: bill.tenantId, email: bill.tenantEmail,
          billDetails: { type: bill.type, amount: bill.amount, monthLabel: bill.monthLabel, label: bill.label },
        }),
      });
      if (res.ok) {
        setSentReminders((p) => new Set([...p, bill.id]));
        notify("success", "Reminder Sent!", `Emailed ${bill.tenantName} for ${bill.label} — ${bill.monthLabel}.`);
      } else {
        notify("error", "Send Failed", "Could not send. Check your email config.");
      }
    } catch {
      notify("error", "Network Error", "Failed to reach the server.");
    } finally {
      setSendingReminder(false);
      setReminderBill(null);
    }
  };

  // ── Bulk reminder ────────────────────────────────────────────────────────────
  const handleBulkSend = async () => {
    const tenantMap = new Map<string, GeneratedBill>();
    for (const b of filteredBills) {
      if (!b.tenantEmail || sentReminders.has(b.id)) continue;
      const ex = tenantMap.get(b.tenantId);
      if (!ex || b.status === "OVERDUE") tenantMap.set(b.tenantId, b);
    }
    const toSend = Array.from(tenantMap.values());
    if (toSend.length === 0) {
      notify("error", "Nothing to send", "No tenants with emails and unsent reminders.");
      return;
    }
    setSendingBulk(true);
    bulkAbortRef.current = false;
    setBulkProgress({ done: 0, total: toSend.length });
    let sent = 0; let failed = 0;
    for (const bill of toSend) {
      if (bulkAbortRef.current) break;
      const tb = filteredBills.filter((b) => b.tenantId === bill.tenantId);
      const totalOwed = tb.reduce((s, b) => s + b.amount, 0);
      const overdueCount = tb.filter((b) => b.status === "OVERDUE").length;
      try {
        const res = await fetch("/api/admin/bills/reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: bill.tenantId, email: bill.tenantEmail, isBulk: true,
            billDetails: { type: "SUMMARY", amount: totalOwed, monthLabel: "All outstanding", label: `${tb.length} unpaid bills (${overdueCount} overdue)` },
          }),
        });
        if (res.ok) {
          setSentReminders((prev) => { const n = new Set(prev); tb.forEach((b) => n.add(b.id)); return n; });
          sent++;
        } else { failed++; }
      } catch { failed++; }
      setBulkProgress({ done: sent + failed, total: toSend.length });
      await new Promise((r) => setTimeout(r, 300));
    }
    setSendingBulk(false);
    if (failed === 0) notify("success", "Bulk Done!", `Reminders sent to ${sent} tenant${sent !== 1 ? "s" : ""}.`);
    else              notify("error",   "Partial",   `Sent ${sent}, failed ${failed}.`);
  };

  // ── Breakdown for record modal ─────────────────────────────────────────────────
  const generateBreakdown = async (tenant: Tenant, freshPaid: Set<string>) => {
    setLoadingBreakdown(true);
    try {
      const leaseStart = new Date(tenant.leaseStartDate);
      leaseStart.setDate(1); leaseStart.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setDate(1); today.setHours(0, 0, 0, 0);

      const months: Date[] = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        if (d < leaseStart) break;
        months.push(d);
      }
      months.reverse();

      // BUG FIX: pass propertyId
      const utils = await fetchUtilData(tenant.id, tenant.propertyId);

      const groups: MonthGroup[] = months.map((monthDate) => {
        const year = monthDate.getFullYear(); const monthNum = monthDate.getMonth() + 1;
        const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const wd = utils.water.find((r) => r.month === monthNum && r.year === year);
        const gd = utils.garbage.find((g) => g.month === monthNum && g.year === year);

        const comps: Component[] = [];
        const addComp = (type: string, label: string, amount: number, isRealData: boolean) => {
          if (amount <= 0) return;
          const keyType = type === "RECURRING"
            ? `RECURRING_${label.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`
            : type;
          const key = genKey(tenant.id, keyType, year, monthNum);
          comps.push({ key, type, label, amount, year, monthNum, monthLabel, isPaid: freshPaid.has(key), isSelected: false, isRealData });
        };

        addComp("RENT", "Monthly Rent", tenant.rentAmount, true);
        if (wd) addComp("WATER", `Water (${wd.units} units)`, wd.amount, true);
        if (gd) addComp("GARBAGE", "Garbage Collection", gd.amount, true);
        utils.recurring.forEach((rc) => {
          const rcStart = new Date(rc.startDate); rcStart.setDate(1);
          if (monthDate >= rcStart) addComp("RECURRING", rc.name, rc.amount, true);
        });

        const total = comps.reduce((s, c) => s + c.amount, 0);
        const paid  = comps.filter((c) => c.isPaid).reduce((s, c) => s + c.amount, 0);
        return { label: monthLabel, year, monthNum, components: comps, total, paid, outstanding: total - paid };
      });

      setBreakdown(groups);
      const expand = new Set(groups.filter((g) => g.outstanding > 0).map((g) => g.label));
      if (expand.size === 0 && groups.length > 0) expand.add(groups[groups.length - 1].label);
      setExpandedMonths(expand);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const handleRecPropChange = (propId: string) => {
    setRecPropFilter(propId);
    setRecFilteredTenants(propId ? tenants.filter((t) => t.propertyId === propId) : tenants);
    setSelectedTenant(null); setBreakdown([]);
  };

  const handleTenantChange = async (tenantId: string) => {
    if (!tenantId) { setSelectedTenant(null); setBreakdown([]); return; }
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) { setSelectedTenant(tenant); await generateBreakdown(tenant, paidSet); }
  };

  const toggleComponent = (key: string) => {
    setBreakdown((prev) => prev.map((m) => ({
      ...m,
      components: m.components.map((c) => c.key !== key || c.isPaid ? c : { ...c, isSelected: !c.isSelected }),
    })));
  };

  const toggleMonthAll = (monthLabel: string) => {
    setBreakdown((prev) => prev.map((m) => {
      if (m.label !== monthLabel) return m;
      const unpaid = m.components.filter((c) => !c.isPaid);
      const allSel = unpaid.length > 0 && unpaid.every((c) => c.isSelected);
      return { ...m, components: m.components.map((c) => c.isPaid ? c : { ...c, isSelected: !allSel }) };
    }));
  };

  const toggleExpand = (label: string) => {
    setExpandedMonths((prev) => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; });
  };

  const selectedComponents = breakdown.flatMap((m) => m.components.filter((c) => c.isSelected));
  const totalSelected = selectedComponents.reduce((s, c) => s + c.amount, 0);

  // ── Record payment ────────────────────────────────────────────────────────────
  const handleRecordPayment = async () => {
    if (!selectedTenant || selectedComponents.length === 0) {
      notify("error", "Nothing selected", "Select at least one component.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        tenantId: selectedTenant.id,
        amount: totalSelected,
        paymentMethod,
        paymentDate,
        referenceNumber: reference || undefined,
        notes: recordNotes || undefined,
        paymentComponents: selectedComponents.map((c) => ({
          componentKey: c.key, type: c.type, label: c.label, amount: c.amount,
          year: c.year, monthNum: c.monthNum, monthLabel: c.monthLabel,
        })),
      };
      const res = await fetch("/api/admin/payments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");

      const newPay: RecordedPayment = {
        id:                 result.payment?.id || `pay_${Date.now()}`,
        tenantId:           selectedTenant.id,
        tenantName:         selectedTenant.fullName,
        tenantUnit:         selectedTenant.unitNumber,
        tenantProperty:     selectedTenant.propertyName,
        amount:             totalSelected,
        method:             paymentMethod,
        date:               paymentDate,
        status:             "COMPLETED",
        verificationStatus: "APPROVED",
        ref:                result.payment?.referenceNumber || `PAY-${Date.now()}`,
        notes:              recordNotes,
        components:         body.paymentComponents,
      };
      setPayments((prev) => [newPay, ...prev]);
      const newPaid = new Set(paidSet);
      selectedComponents.forEach((c) => newPaid.add(c.key));
      setPaidSet(newPaid);
      setGeneratedBills((prev) => prev.filter((b) => !selectedComponents.some((c) => c.key === b.componentKey)));
      await generateBreakdown(selectedTenant, newPaid);
      notify("success", "Payment Recorded!", `${fmt(totalSelected)} for ${selectedTenant.fullName}.`);
      setReference(""); setRecordNotes(""); setPaymentMethod("CASH");
      setPaymentDate(new Date().toISOString().split("T")[0]);
    } catch (e: any) {
      notify("error", "Payment Failed", e.message || "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const closeRecordModal = () => {
    setShowRecordModal(false); setSelectedTenant(null); setRecPropFilter("");
    setRecFilteredTenants(tenants); setBreakdown([]); setExpandedMonths(new Set());
    setPaymentMethod("CASH"); setPaymentDate(new Date().toISOString().split("T")[0]);
    setReference(""); setRecordNotes("");
  };

  useEffect(() => { loadAll(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
          <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-white font-semibold">Loading Payments</p>
        <p className="text-gray-500 text-sm">Fetching tenant records…</p>
      </div>
    </div>
  );

  const selectedPropName = scopeProp ? properties.find((p) => p.id === scopeProp)?.name : null;
  const tenantOpts: SelectOption[] = [
    { value: "", label: "Select tenant…" },
    ...recFilteredTenants.map((t) => ({ value: t.id, label: `${t.fullName} (${t.unitNumber})` })),
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payment Management</h1>
            <p className="text-gray-400 text-sm mt-1">
              {scopedPayments.length} payments · {scopedTenants.length} tenants · {properties.length} properties
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1">
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <CustomSelect
                value={scopeProp}
                onChange={(v) => { setScopeProp(v); setBillsGenerated(false); setGeneratedBills([]); }}
                options={propOpts}
                className="min-w-[160px]"
              />
            </div>
            <button onClick={loadAll} className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition text-sm">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={() => setShowRecordModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold shadow-lg shadow-purple-900/30 text-sm transition">
              <DollarSign className="h-4 w-4" /> Record Payment
            </button>
          </div>
        </div>

        {selectedPropName && (
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg w-fit text-sm text-purple-300">
            <Building className="h-4 w-4" />
            Scoped to: <span className="font-semibold">{selectedPropName}</span>
            <button onClick={() => { setScopeProp(""); setBillsGenerated(false); setGeneratedBills([]); }} className="ml-1 hover:text-white transition">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Revenue</p>
              <div className="p-1.5 bg-green-500/10 rounded-lg"><TrendingUp className="h-4 w-4 text-green-400" /></div>
            </div>
            <p className="text-2xl font-bold">{fmt(stats.totalRevenue)}</p>
            <p className="text-gray-500 text-xs">{stats.totalPayments} transaction{stats.totalPayments !== 1 ? "s" : ""}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">This Month</p>
              <div className="p-1.5 bg-blue-500/10 rounded-lg"><Calendar className="h-4 w-4 text-blue-400" /></div>
            </div>
            <p className="text-2xl font-bold">{fmt(stats.thisMonthRev)}</p>
            <div className="flex items-center gap-1.5">
              {stats.change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 text-green-400" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
              <p className={`text-xs font-medium ${stats.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                {Math.abs(stats.change).toFixed(1)}% vs last month
              </p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Outstanding</p>
              <div className="p-1.5 bg-red-500/10 rounded-lg"><AlertTriangle className="h-4 w-4 text-red-400" /></div>
            </div>
            <p className="text-2xl font-bold">{fmt(stats.totalOut)}</p>
            <p className="text-xs font-medium text-red-400/80">{stats.unpaidThisMo} tenant{stats.unpaidThisMo !== 1 ? "s" : ""} unpaid this month</p>
            {stats.totalOut > 0 && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500/60 via-red-400/30 to-transparent" />}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Top Method</p>
              <div className="p-1.5 bg-purple-500/10 rounded-lg"><CreditCard className="h-4 w-4 text-purple-400" /></div>
            </div>
            <p className="text-2xl font-bold">{methodLabel(stats.topMethod)}</p>
            <div className="space-y-1">
              <p className="text-gray-500 text-xs">{stats.thisMoCount} payments · {stats.topMethodPct}% of total</p>
              {stats.topMethodPct > 0 && (
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-700" style={{ width: `${stats.topMethodPct}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
          {(["payments", "bills"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
            >
              {tab === "payments" ? <><Receipt className="h-4 w-4" />Payments</> : <><FileText className="h-4 w-4" />Bills &amp; Invoices</>}
            </button>
          ))}
        </div>

        {/* ══ PAYMENTS TAB ══ */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tenant, unit, reference…"
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none placeholder-gray-600"
                />
              </div>
              <button
                onClick={() => setShowFilters((p) => !p)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${showFilters ? "bg-purple-600 border-purple-500 text-white" : "bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600"}`}
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-white text-purple-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">{activeFiltersCount}</span>
                )}
              </button>
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => { setFilterProperty(""); setFilterMethod(""); setFilterStatus(""); setFilterDateFrom(""); setFilterDateTo(""); }}
                  className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition"
                >
                  <XCircle className="h-4 w-4" /> Clear
                </button>
              )}
              <p className="text-gray-500 text-sm ml-auto">{filteredPayments.length} of {payments.length}</p>
            </div>

            {showFilters && (
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5 font-medium">Property</label>
                  <CustomSelect value={filterProperty} onChange={setFilterProperty} options={propOpts} />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5 font-medium">Method</label>
                  <CustomSelect value={filterMethod} onChange={setFilterMethod} options={[
                    { value: "", label: "All methods" }, { value: "CASH", label: "Cash" },
                    { value: "MPESA", label: "M-Pesa" }, { value: "M_PESA", label: "M-Pesa (alt)" },
                    { value: "BANK_TRANSFER", label: "Bank Transfer" }, { value: "CHEQUE", label: "Cheque" },
                  ]} />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5 font-medium">Status</label>
                  <CustomSelect value={filterStatus} onChange={setFilterStatus} options={[
                    { value: "", label: "All statuses" }, { value: "COMPLETED", label: "Completed" },
                    { value: "PENDING", label: "Pending" }, { value: "FAILED", label: "Failed" },
                  ]} />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5 font-medium">From</label>
                  <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                    style={{ colorScheme: "dark" }} />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5 font-medium">To</label>
                  <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                    style={{ colorScheme: "dark" }} />
                </div>
              </div>
            )}

            {filteredPayments.length === 0 ? (
              <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-xl">
                <Receipt className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No payments found</p>
                <p className="text-gray-600 text-sm mt-1">
                  {searchQuery || activeFiltersCount > 0 ? "Try adjusting your filters." : "Click \"Record Payment\" to get started."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredPayments.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setDetailPayment(p)}
                    className="group bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/40 cursor-pointer"
                  >
                    <div className={`h-0.5 ${p.status === "COMPLETED" ? "bg-gradient-to-r from-green-500 to-emerald-400" : p.status === "PENDING" ? "bg-gradient-to-r from-yellow-500 to-amber-400" : "bg-gradient-to-r from-red-500 to-rose-400"}`} />
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-300 font-bold text-sm">
                              {p.tenantName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-semibold truncate">{p.tenantName}</p>
                            <p className="text-gray-500 text-xs truncate">{p.tenantUnit} · {p.tenantProperty}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-bold text-lg">{fmt(p.amount)}</p>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "COMPLETED" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                            {p.status === "COMPLETED" ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {p.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1.5"><MethodIcon method={p.method} />{methodLabel(p.method)}</span>
                        <span className="w-px h-3 bg-gray-700" />
                        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{fmtDate(p.date)}</span>
                        <span className="w-px h-3 bg-gray-700" />
                        <span className="font-mono text-gray-600 truncate max-w-[100px]">{p.ref.replace(/^PAY-\d+-/, "").substring(0, 12)}</span>
                      </div>
                      {p.components.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {p.components.slice(0, 4).map((c, i) => (
                            <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${pillClass(c.type)}`}>{c.label}</span>
                          ))}
                          {p.components.length > 4 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">+{p.components.length - 4} more</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
                        <span className="text-xs text-gray-600">{p.components.length} component{p.components.length !== 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1 text-xs text-purple-400 group-hover:text-purple-300 transition font-medium">
                          View details <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ BILLS TAB ══ */}
        {activeTab === "bills" && (
          <div className="space-y-5">
            {!billsGenerated ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 flex flex-col items-center gap-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Generate Bills &amp; Invoices</h3>
                  <p className="text-gray-400 text-sm mt-1 max-w-lg">
                    Scans every tenant's lease history and surfaces all outstanding balances —
                    rent, water, garbage and recurring charges. Rent appears instantly; utilities load in the background.
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center text-sm">
                  <div className="flex items-center gap-2 text-gray-500 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
                    <Users className="h-4 w-4" /> {scopeProp ? scopedTenants.length : tenants.length} tenants to scan
                  </div>
                  <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 font-medium">{fmt(stats.totalOut)}</span>
                    <span className="text-gray-500">est. outstanding</span>
                  </div>
                </div>
                <button
                  onClick={handleGenerateBills}
                  disabled={generatingBills}
                  className="flex items-center gap-2.5 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingBills
                    ? <><Loader2 className="h-5 w-5 animate-spin" /> Scanning records…</>
                    : <><Zap className="h-5 w-5" /> Generate Bills{selectedPropName ? ` — ${selectedPropName}` : ""}</>}
                </button>
              </div>
            ) : (
              <>
                {/* Bill summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Bills",       val: billStats.total,         colour: "text-white",      bg: "bg-gray-900 border-gray-800" },
                    { label: "Overdue",           val: billStats.overdue,       colour: "text-red-400",    bg: "bg-red-500/5 border-red-500/20" },
                    { label: "Unpaid (Current)",  val: billStats.unpaid,        colour: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/20" },
                    { label: "Total Outstanding", val: fmt(billStats.totalAmt), colour: "text-white",      bg: "bg-purple-500/5 border-purple-500/20" },
                  ].map((s) => (
                    <div key={s.label} className={`border rounded-xl p-4 flex items-center gap-3 ${s.bg}`}>
                      <p className={`text-2xl font-bold ${s.colour}`}>{s.val}</p>
                      <p className="text-gray-400 text-sm leading-snug">{s.label}</p>
                    </div>
                  ))}
                </div>

                {generatingBills && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-300">
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                    Enriching with water, garbage &amp; recurring charges…
                  </div>
                )}

                {/* Action bar */}
                <div className="flex items-center gap-3 flex-wrap">
                  {sendingBulk ? (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-orange-600/20 border border-orange-500/30 rounded-xl text-sm text-orange-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending {bulkProgress.done}/{bulkProgress.total}…</span>
                      <button onClick={() => { bulkAbortRef.current = true; }} className="ml-2 text-xs underline hover:text-white transition">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={handleBulkSend}
                      disabled={uniqueBulkTenants === 0}
                      className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-orange-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <SendHorizonal className="h-4 w-4" /> Send All Reminders
                      {uniqueBulkTenants > 0 && (
                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          {uniqueBulkTenants} tenant{uniqueBulkTenants !== 1 ? "s" : ""}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => { setGeneratedBills([]); setBillsGenerated(false); setSentReminders(new Set()); }}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition text-sm"
                  >
                    <RefreshCw className="h-4 w-4" /> Regenerate
                  </button>
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      value={billSearch} onChange={(e) => setBillSearch(e.target.value)}
                      placeholder="Search tenant or unit…"
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-9 py-2.5 text-sm focus:border-purple-500 focus:outline-none placeholder-gray-600"
                    />
                    {billSearch && (
                      <button onClick={() => setBillSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <CustomSelect
                    value={billFilterStatus}
                    onChange={(v) => setBillFilterStatus(v as any)}
                    options={[{ value: "", label: "All statuses" }, { value: "OVERDUE", label: "Overdue" }, { value: "UNPAID", label: "Unpaid" }]}
                    className="min-w-[130px]"
                  />
                  <CustomSelect
                    value={billFilterType}
                    onChange={setBillFilterType}
                    options={[
                      { value: "", label: "All types" }, { value: "RENT", label: "Rent" },
                      { value: "WATER", label: "Water" }, { value: "GARBAGE", label: "Garbage" },
                      { value: "RECURRING", label: "Recurring" },
                    ]}
                    className="min-w-[120px]"
                  />
                  <p className="text-gray-500 text-sm ml-auto">{filteredBills.length} bills</p>
                </div>

                {filteredBills.length === 0 ? (
                  <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
                    <CheckCircle className="h-12 w-12 text-green-500/60 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No outstanding bills match your filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredBills.map((bill) => {
                      const wasSent = sentReminders.has(bill.id);
                      return (
                        <div key={bill.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl overflow-hidden transition-all">
                          <div className={`h-0.5 ${bill.status === "OVERDUE" ? "bg-red-500" : "bg-yellow-400"}`} />
                          <div className="p-5 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
                                  <span className="text-gray-300 font-bold text-sm">
                                    {bill.tenantName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-semibold truncate">{bill.tenantName}</p>
                                  <p className="text-gray-500 text-xs truncate">{bill.tenantUnit} · {bill.tenantProperty}</p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-white font-bold text-lg">{fmt(bill.amount)}</p>
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${bill.status === "OVERDUE" ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                                  {bill.status === "OVERDUE" ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                  {bill.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${pillClass(bill.type)}`}>
                                {bill.type === "RECURRING" && <Repeat className="h-3 w-3" />}
                                {bill.type}
                              </span>
                              <span className="text-gray-400">{bill.label}</span>
                              <span className="text-gray-700">·</span>
                              <span className="text-gray-500">{bill.monthLabel}</span>
                              {bill.isRealData && (
                                <span className="inline-flex items-center gap-0.5 text-cyan-400/60">
                                  <Droplets className="h-3 w-3" /> live
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 truncate">{bill.tenantEmail || "⚠ No email on file"}</p>
                            {wasSent && (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-400/70 bg-emerald-500/5 rounded-lg px-3 py-2 border border-emerald-500/15">
                                <MailCheck className="h-3.5 w-3.5" /> Reminder sent this session
                              </div>
                            )}
                            <button
                              onClick={() => setReminderBill(bill)}
                              disabled={!bill.tenantEmail}
                              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition
                                ${wasSent
                                  ? "border-gray-700 bg-gray-800/60 text-gray-500"
                                  : "border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300"}
                                disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              <Bell className="h-3.5 w-3.5" /> {wasSent ? "Send Again" : "Send Reminder"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ══ RECORD PAYMENT MODAL ══ */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold">Record Payment</h2>
                {selectedTenant && (
                  <p className="text-purple-400 text-sm mt-0.5">
                    {selectedTenant.fullName} · {selectedTenant.unitNumber} · {selectedTenant.propertyName}
                  </p>
                )}
              </div>
              <button onClick={closeRecordModal} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5 font-medium">Filter by Property</label>
                  <CustomSelect
                    value={recPropFilter}
                    onChange={handleRecPropChange}
                    options={[{ value: "", label: "All properties" }, ...properties.map((p) => ({ value: p.id, label: p.name }))]}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5 font-medium">Tenant <span className="text-red-400">*</span></label>
                  <CustomSelect value={selectedTenant?.id || ""} onChange={handleTenantChange} options={tenantOpts} />
                </div>
              </div>

              {loadingBreakdown ? (
                <div className="flex items-center justify-center py-10 text-gray-400 gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-500" /> Loading outstanding balances…
                </div>
              ) : breakdown.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold text-sm">Outstanding Balances (last 6 months)</h3>
                    <div className="flex gap-4 text-xs">
                      <span className="text-red-400 font-medium">{fmt(breakdown.reduce((s, m) => s + m.outstanding, 0))} due</span>
                      <span className="text-green-400">{fmt(breakdown.reduce((s, m) => s + m.paid, 0))} paid</span>
                    </div>
                  </div>

                  {breakdown.map((month) => {
                    const isExpanded = expandedMonths.has(month.label);
                    const unpaid = month.components.filter((c) => !c.isPaid);
                    const allSel = unpaid.length > 0 && unpaid.every((c) => c.isSelected);
                    const someSel = unpaid.some((c) => c.isSelected);
                    return (
                      <div key={month.label} className="border border-gray-700 rounded-xl overflow-hidden">
                        <div
                          className="flex items-center justify-between p-3.5 cursor-pointer bg-gray-800/60 hover:bg-gray-800 transition"
                          onClick={() => toggleExpand(month.label)}
                        >
                          <div className="flex items-center gap-3">
                            {month.outstanding > 0 ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleMonthAll(month.label); }}
                                className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: allSel ? "#7c3aed" : someSel ? "#4c1d95" : "transparent", borderColor: allSel || someSel ? "#7c3aed" : "#374151" }}
                              >
                                {allSel && <span className="text-white text-xs">✓</span>}
                                {someSel && !allSel && <span className="text-purple-300 text-xs">–</span>}
                              </button>
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                            )}
                            <span className="text-white text-sm font-medium">{month.label}</span>
                            {month.outstanding === 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Fully Paid</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {month.outstanding > 0 && <span className="text-red-400 text-xs font-medium">{fmt(month.outstanding)} due</span>}
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-700 divide-y divide-gray-800">
                            {month.components.map((comp) => (
                              <div
                                key={comp.key}
                                className={`flex items-center justify-between px-4 py-3 transition ${comp.isPaid ? "opacity-50 cursor-default" : "hover:bg-gray-800/40 cursor-pointer"} ${comp.isSelected ? "bg-purple-500/10" : ""}`}
                                onClick={() => toggleComponent(comp.key)}
                              >
                                <div className="flex items-center gap-3">
                                  {comp.isPaid ? (
                                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                                  ) : (
                                    <div
                                      className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                                      style={{ backgroundColor: comp.isSelected ? "#7c3aed" : "transparent", borderColor: comp.isSelected ? "#7c3aed" : "#374151" }}
                                    >
                                      {comp.isSelected && <span className="text-white text-xs">✓</span>}
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-white text-sm flex items-center gap-1.5">
                                      {comp.type === "RECURRING" && <Repeat className="h-3.5 w-3.5 text-orange-400" />}
                                      {comp.label}
                                    </p>
                                    {comp.isRealData && comp.type !== "RECURRING" && (
                                      <p className="text-xs text-cyan-400 flex items-center gap-1"><Droplets className="h-3 w-3" /> live data</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-white text-sm font-medium">{fmt(comp.amount)}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${comp.isPaid ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                                    {comp.isPaid ? "PAID" : "PENDING"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : selectedTenant ? (
                <div className="text-center py-10 text-gray-500 text-sm">No outstanding balances in the last 6 months.</div>
              ) : null}

              {selectedTenant && (
                <div className="space-y-4 pt-2 border-t border-gray-800">
                  <h3 className="text-white font-semibold text-sm">Payment Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1.5 font-medium">Method</label>
                      <CustomSelect
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        options={[
                          { value: "CASH",          label: "Cash" },
                          { value: "BANK_TRANSFER",  label: "Bank Transfer" },
                          { value: "M_PESA",         label: "M-Pesa" },
                          { value: "CHEQUE",         label: "Cheque" },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1.5 font-medium">Date</label>
                      <input
                        type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1.5 font-medium">Reference</label>
                      <input
                        type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                        placeholder="TXN12345"
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none placeholder-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1.5 font-medium">Notes</label>
                      <input
                        type="text" value={recordNotes} onChange={(e) => setRecordNotes(e.target.value)}
                        placeholder="Optional"
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none placeholder-gray-700"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-700 flex-shrink-0">
              {selectedComponents.length > 0 ? (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 text-sm">{selectedComponents.length} component{selectedComponents.length !== 1 ? "s" : ""} selected</span>
                  <span className="text-white font-bold text-xl">{fmt(totalSelected)}</span>
                </div>
              ) : (
                <p className="text-center text-gray-600 text-sm mb-4">Select components above to continue</p>
              )}
              <div className="flex gap-3">
                <button onClick={closeRecordModal} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm">Cancel</button>
                <button
                  onClick={handleRecordPayment}
                  disabled={saving || selectedComponents.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition font-semibold disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  {saving
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Recording…</>
                    : <><DollarSign className="h-4 w-4" />{selectedComponents.length > 0 ? `Record ${fmt(totalSelected)}` : "Record Payment"}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAYMENT DETAIL MODAL ══ */}
      {detailPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-300 font-bold text-sm">
                    {detailPayment.tenantName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold">{detailPayment.tenantName}</h2>
                  <p className="text-gray-500 text-xs mt-0.5">{detailPayment.tenantUnit} · {detailPayment.tenantProperty}</p>
                </div>
              </div>
              <button onClick={() => setDetailPayment(null)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20 rounded-xl">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Total Recorded</p>
                  <p className="text-white font-bold text-3xl">{fmt(detailPayment.amount)}</p>
                </div>
                <div className="text-right space-y-1.5">
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 font-medium">
                    <CheckCircle className="h-3.5 w-3.5" /> {detailPayment.status}
                  </span>
                  <p className="text-gray-500 text-xs">{detailPayment.verificationStatus}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Method",     value: methodLabel(detailPayment.method), icon: <CreditCard className="h-3.5 w-3.5 text-gray-500" /> },
                  { label: "Date",       value: fmtDateFull(detailPayment.date),   icon: <Calendar   className="h-3.5 w-3.5 text-gray-500" /> },
                  { label: "Reference",  value: detailPayment.ref,                 icon: <Receipt     className="h-3.5 w-3.5 text-gray-500" /> },
                  { label: "Components", value: `${detailPayment.components.length} charge${detailPayment.components.length !== 1 ? "s" : ""}`, icon: <BarChart3 className="h-3.5 w-3.5 text-gray-500" /> },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-gray-800/60 rounded-lg border border-gray-700/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">{item.icon}{item.label}</div>
                    <p className="text-white text-sm font-medium truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {detailPayment.notes && (
                <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                  <p className="text-amber-400/70 text-xs mb-1 font-medium">Notes</p>
                  <p className="text-gray-300 text-sm">{detailPayment.notes}</p>
                </div>
              )}

              {detailPayment.components.length > 0 && (() => {
                const payDate = new Date(detailPayment.date);
                const periods = Array.from(new Set(detailPayment.components.map((c) => c.monthLabel)));
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-gray-800">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                      <h3 className="text-white font-semibold text-sm">Audit Trail</h3>
                      <span className="text-xs text-gray-500 ml-auto">Paid on {fmtDate(detailPayment.date)}</span>
                    </div>
                    {periods.map((period) => {
                      const comps = detailPayment.components.filter((c) => c.monthLabel === period);
                      const periodTotal = comps.reduce((s, c) => s + c.amount, 0);
                      const firstComp = comps[0];
                      const dueDate = firstComp ? new Date(firstComp.year, firstComp.monthNum - 1, 1) : null;
                      const daysOverdue = dueDate ? Math.floor((payDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                      const isOnTime = daysOverdue <= 0;
                      const isLate   = daysOverdue > 0 && daysOverdue <= 30;
                      const isOver   = daysOverdue > 30;
                      return (
                        <div key={period} className="border border-gray-700 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/70">
                            <div className="flex items-center gap-2.5">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-white font-medium text-sm">{period}</span>
                              {dueDate && <span className="text-gray-600 text-xs">due {fmtDate(dueDate)}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              {isOnTime && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400"><CheckCircle className="h-3 w-3" /> On time</span>}
                              {isLate   && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400"><Clock className="h-3 w-3" /> {daysOverdue}d late</span>}
                              {isOver   && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400"><AlertTriangle className="h-3 w-3" /> {daysOverdue}d overdue</span>}
                              <span className="text-white font-semibold text-sm">{fmt(periodTotal)}</span>
                            </div>
                          </div>
                          <div className="divide-y divide-gray-800/60">
                            {comps.map((comp, i) => (
                              <div key={i} className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${pillClass(comp.type)}`}>{comp.type}</span>
                                      <span className="text-gray-200 text-sm truncate">{comp.label}</span>
                                    </div>
                                    <p className="text-gray-600 text-xs mt-0.5">Billing: {comp.monthLabel} · Settled: {fmtDate(detailPayment.date)}</p>
                                  </div>
                                </div>
                                <span className="text-white text-sm font-semibold ml-4 flex-shrink-0">{fmt(comp.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between px-4 py-3.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-purple-400" />
                        <span className="text-purple-300 font-semibold text-sm">Total Paid</span>
                        <span className="text-gray-500 text-xs">via {methodLabel(detailPayment.method)}</span>
                      </div>
                      <span className="text-white font-bold text-xl">{fmt(detailPayment.amount)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-6 border-t border-gray-700 flex-shrink-0">
              <button onClick={() => setDetailPayment(null)} className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ REMINDER CONFIRM MODAL ══ */}
      {reminderBill && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-lg font-bold">Send Payment Reminder</h2>
              <button onClick={() => setReminderBill(null)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <div className="p-2.5 bg-orange-500/15 rounded-lg"><Bell className="h-5 w-5 text-orange-400" /></div>
                <div>
                  <p className="text-white font-semibold">{reminderBill.tenantName}</p>
                  <p className="text-gray-400 text-sm">{reminderBill.tenantUnit} · {reminderBill.tenantProperty}</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Bill",       value: reminderBill.label },
                  { label: "Period",     value: reminderBill.monthLabel },
                  { label: "Amount Due", value: fmt(reminderBill.amount), colour: "text-red-400 font-bold" },
                  { label: "Status",     value: reminderBill.status, colour: reminderBill.status === "OVERDUE" ? "text-red-400 font-medium" : "text-yellow-400 font-medium" },
                  { label: "Email to",   value: reminderBill.tenantEmail || "⚠ No email on file", colour: !reminderBill.tenantEmail ? "text-red-400" : "text-gray-200" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0">
                    <span className="text-gray-500 text-sm">{row.label}</span>
                    <span className={`text-sm ${row.colour || "text-white"}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button onClick={() => setReminderBill(null)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition">Cancel</button>
              <button
                onClick={() => handleSendReminder(reminderBill)}
                disabled={sendingReminder || !reminderBill.tenantEmail}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sendingReminder ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : <><Send className="h-4 w-4" />Send Reminder</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationModal
        isOpen={notification.open}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
