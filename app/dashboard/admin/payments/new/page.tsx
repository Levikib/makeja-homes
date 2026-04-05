"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function NewPaymentPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ tenantId: "", amount: "", paymentMethod: "CASH", paymentDate: new Date().toISOString().split("T")[0], notes: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/properties").then(r => r.json()),
      fetch("/api/tenants").then(r => r.json()),
    ]).then(([p, t]) => {
      setProperties(Array.isArray(p) ? p : (p.properties ?? []));
      setTenants(Array.isArray(t) ? t : (t.tenants ?? []));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      router.push("/dashboard/admin/payments");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/payments">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        </Link>
        <h1 className="text-3xl font-bold text-white">Record Payment</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4 max-w-lg">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Tenant</label>
          <select value={formData.tenantId} onChange={e => setFormData({...formData, tenantId: e.target.value})} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" required>
            <option value="">-- Select tenant --</option>
            {tenants.map((t: any) => (
              <option key={t.id} value={t.id}>{t.users?.firstName} {t.users?.lastName} — {t.units?.unitNumber}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Amount (KSH)</label>
          <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
          <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white">
            <option value="CASH">Cash</option>
            <option value="MPESA">M-Pesa</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Payment Date</label>
          <input type="date" value={formData.paymentDate} onChange={e => setFormData({...formData, paymentDate: e.target.value})} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
          <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" rows={3} />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">{saving ? "Saving..." : "Record Payment"}</Button>
          <Link href="/dashboard/admin/payments">
            <Button type="button" variant="outline" className="border-gray-700 text-gray-300 hover:text-white">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
