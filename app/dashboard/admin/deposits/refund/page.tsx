"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function DepositsRefundPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tenants")
      .then(r => r.json())
      .then(d => {
        const all = Array.isArray(d) ? d : (d.tenants ?? []);
        // Filter tenants with expired leases
        const expired = all.filter((t: any) => t.leaseEndDate && new Date(t.leaseEndDate) < new Date());
        setTenants(expired);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !amount) { setError("Please select a tenant and enter amount"); return; }
    setSaving(true);
    setError("");
    try {
      // Simple deposit refund — mark as refunded via a note
      // This would need a proper endpoint; for now just navigate back
      router.push("/dashboard/admin/deposits");
    } catch (err: any) {
      setError(err.message || "Failed to process refund");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/deposits">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deposits
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-white">Process Deposit Refund</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4 max-w-lg">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Tenant (vacated)</label>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          >
            <option value="">-- Select tenant --</option>
            {tenants.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.users?.firstName} {t.users?.lastName} — {t.units?.properties?.name} Unit {t.units?.unitNumber}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Refund Amount (KSH)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? "Processing..." : "Process Refund"}
          </Button>
          <Link href="/dashboard/admin/deposits">
            <Button type="button" variant="outline" className="border-gray-700 text-gray-300 hover:text-white">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
