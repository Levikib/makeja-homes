"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Package, Truck, TrendingUp } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  quantity: number | any;
  unitOfMeasure?: string;
  unit?: string;
  unitCost: number | any;
  minimumQuantity?: number | any;
  reorderLevel?: number | any;
  propertyId?: string | null;
  sku?: string | null;
  supplier?: string | null;
  supplierContact?: string | null;
  supplierPhone?: string | null;
  supplierEmail?: string | null;
  supplierPrice?: number | any;
}

interface Property {
  id: string;
  name: string;
}

interface EditInventoryClientProps {
  item: InventoryItem;
  properties: Property[];
}

const CATEGORIES = [
  "PLUMBING", "ELECTRICAL", "HVAC", "CLEANING",
  "TOOLS", "FURNITURE", "APPLIANCES", "SAFETY", "LANDSCAPING", "OTHER",
];

const UNITS = ["pieces", "units", "meters", "liters", "kg", "boxes", "rolls", "sets", "pairs", "bags"];

export default function EditInventoryClient({ item, properties }: EditInventoryClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<"item" | "supplier">("item");

  const unitVal = item.unitOfMeasure ?? item.unit ?? "units";
  const reorderVal = String(Number(item.minimumQuantity ?? item.reorderLevel ?? 0));

  // Item fields
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [category, setCategory] = useState(item.category);
  const [quantity, setQuantity] = useState(String(Number(item.quantity)));
  const [unit, setUnit] = useState(unitVal);
  const [unitCost, setUnitCost] = useState(String(Number(item.unitCost)));
  const [reorderLevel, setReorderLevel] = useState(reorderVal);
  const [propertyId, setPropertyId] = useState(item.propertyId ?? "");
  const [sku, setSku] = useState(item.sku ?? "");

  // Supplier fields
  const [supplier, setSupplier] = useState(item.supplier ?? "");
  const [supplierContact, setSupplierContact] = useState(item.supplierContact ?? "");
  const [supplierPhone, setSupplierPhone] = useState(item.supplierPhone ?? "");
  const [supplierEmail, setSupplierEmail] = useState(item.supplierEmail ?? "");
  const [supplierPrice, setSupplierPrice] = useState(item.supplierPrice ? String(Number(item.supplierPrice)) : "");

  const origQty = Number(item.quantity);
  const currentQty = parseFloat(quantity) || 0;
  const diff = currentQty - origQty;
  const totalValue = currentQty && unitCost ? currentQty * parseFloat(unitCost) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !quantity || !unit || !unitCost || !reorderLevel) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          category,
          quantity: parseInt(quantity),
          unit,
          unitCost: parseFloat(unitCost),
          reorderLevel: parseInt(reorderLevel),
          propertyId: propertyId || null,
          sku: sku || null,
          supplier: supplier || null,
          supplierContact: supplierContact || null,
          supplierPhone: supplierPhone || null,
          supplierEmail: supplierEmail || null,
          supplierPrice: supplierPrice ? parseFloat(supplierPrice) : null,
        }),
      });

      if (res.ok) {
        router.push("/dashboard/inventory");
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || err.message}`);
      }
    } catch {
      alert("Failed to update inventory item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none transition-all text-sm";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventory"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-all">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-400" />
            Edit Inventory Item
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{item.name}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-gray-800/50 rounded-xl border border-gray-700 w-fit">
        <button type="button" onClick={() => setTab("item")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === "item" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>
          Item Details
        </button>
        <button type="button" onClick={() => setTab("supplier")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${tab === "supplier" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>
          <Truck className="w-3.5 h-3.5" />
          Supplier Info
          {supplier && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {tab === "item" && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-5">
            {/* Quantity change banner */}
            {diff !== 0 && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
                diff > 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-300"
              }`}>
                <TrendingUp className={`w-4 h-4 flex-shrink-0 ${diff < 0 ? "rotate-180" : ""}`} />
                Quantity {diff > 0 ? "increasing" : "decreasing"} by{" "}
                <strong>{Math.abs(diff)}</strong> {unit} — an adjustment movement will be recorded automatically.
              </div>
            )}

            {/* Name + SKU */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Item Name <span className="text-red-400">*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>SKU / Code</label>
                <input type="text" value={sku} onChange={e => setSku(e.target.value)}
                  placeholder="Optional" className={inputCls} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={2} className={inputCls} />
            </div>

            {/* Category + Property */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Category <span className="text-red-400">*</span></label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Property</label>
                <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={inputCls}>
                  <option value="">All properties / General</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {/* Qty + Unit + Cost + Reorder */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className={labelCls}>Quantity <span className="text-red-400">*</span></label>
                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                  min="0" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Unit <span className="text-red-400">*</span></label>
                <select value={unit} onChange={e => setUnit(e.target.value)} className={inputCls}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Unit Cost (KSH) <span className="text-red-400">*</span></label>
                <input type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)}
                  min="0" step="0.01" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Reorder Level <span className="text-red-400">*</span></label>
                <input type="number" value={reorderLevel} onChange={e => setReorderLevel(e.target.value)}
                  min="0" className={inputCls} required />
              </div>
            </div>

            {/* Value preview */}
            {totalValue !== null && totalValue > 0 && (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-3">
                <span className="text-sm text-gray-400">Total stock value</span>
                <span className="text-xl font-bold text-emerald-400">KSH {totalValue.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {tab === "supplier" && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-5">
            <p className="text-sm text-gray-500">Supplier details auto-fill purchase orders when this item needs restocking.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Supplier Name</label>
                <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)}
                  placeholder="e.g., Nairobi Building Supplies" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact Person</label>
                <input type="text" value={supplierContact} onChange={e => setSupplierContact(e.target.value)}
                  placeholder="Contact name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)}
                  placeholder="+254 7xx xxx xxx" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)}
                  placeholder="supplier@email.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Supplier Price (KSH)</label>
                <input type="number" value={supplierPrice} onChange={e => setSupplierPrice(e.target.value)}
                  placeholder="Price per unit from supplier" min="0" step="0.01" className={inputCls} />
                <p className="text-xs text-gray-600 mt-1">May differ from your internal unit cost</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <Link href="/dashboard/inventory">
            <button type="button" className="px-4 py-2.5 border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-800 transition-all text-sm">
              Cancel
            </button>
          </Link>
          <div className="flex items-center gap-3">
            {tab === "item" && (
              <button type="button" onClick={() => setTab("supplier")}
                className="px-4 py-2.5 border border-emerald-700/50 text-emerald-400 rounded-xl hover:bg-emerald-900/20 transition-all text-sm flex items-center gap-2">
                <Truck className="w-4 h-4" />
                {supplier ? "Edit Supplier" : "Add Supplier"}
              </button>
            )}
            <button type="submit" disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl transition-all text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
