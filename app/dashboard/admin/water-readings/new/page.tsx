"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function NewWaterReadingPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [allUnits, setAllUnits] = useState<any[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ propertyId: "", unitId: "", currentReading: "", readingDate: new Date().toISOString().split("T")[0], notes: "" });

  useEffect(() => {
    fetch("/api/properties/all")
      .then(r => r.json())
      .then(d => {
        setProperties((d.properties ?? []).map((p: any) => ({ id: p.id, name: p.name })));
        setAllUnits((d.properties ?? []).flatMap((p: any) => (p.units ?? []).map((u: any) => ({ id: u.id, unitNumber: u.unitNumber, propertyId: p.id }))));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (formData.propertyId) {
      setFilteredUnits(allUnits.filter(u => u.propertyId === formData.propertyId));
      setFormData(f => ({ ...f, unitId: "" }));
    }
  }, [formData.propertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/water-readings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      router.push("/dashboard/admin/water-readings");
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
        <Link href="/dashboard/admin/water-readings">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        </Link>
        <h1 className="text-3xl font-bold text-white">New Water Reading</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4 max-w-lg">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Property</label>
          <select value={formData.propertyId} onChange={e => setFormData({...formData, propertyId: e.target.value})} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" required>
            <option value="">-- Select property --</option>
            {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Unit</label>
          <select value={formData.unitId} onChange={e => setFormData({...formData, unitId: e.target.value})} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" required disabled={!formData.propertyId}>
            <option value="">-- Select unit --</option>
            {filteredUnits.map((u: any) => <option key={u.id} value={u.id}>Unit {u.unitNumber}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Current Reading (m³)</label>
          <input type="number" step="0.01" value={formData.currentReading} onChange={e => setFormData({...formData, currentReading: e.target.value})} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Reading Date</label>
          <input type="date" value={formData.readingDate} onChange={e => setFormData({...formData, readingDate: e.target.value})} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
          <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" rows={3} />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Saving..." : "Save Reading"}</Button>
          <Link href="/dashboard/admin/water-readings">
            <Button type="button" variant="outline" className="border-gray-700 text-gray-300 hover:text-white">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
