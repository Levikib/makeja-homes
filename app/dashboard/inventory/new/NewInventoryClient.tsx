"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Package, Truck } from "lucide-react";

interface Property {
  id: string;
  name: string;
}

interface NewInventoryClientProps {
  properties: Property[];
}

const CATEGORIES = [
  "PLUMBING", "ELECTRICAL", "HVAC", "CLEANING",
  "TOOLS", "FURNITURE", "APPLIANCES", "SAFETY", "LANDSCAPING", "OTHER",
];

const UNITS = [
  { value: "pieces", label: "Pieces" },
  { value: "units", label: "Units" },
  { value: "meters", label: "Meters" },
  { value: "liters", label: "Liters" },
  { value: "kg", label: "Kilograms" },
  { value: "boxes", label: "Boxes" },
  { value: "rolls", label: "Rolls" },
  { value: "sets", label: "Sets" },
  { value: "pairs", label: "Pairs" },
  { value: "bags", label: "Bags" },
];

export default function NewInventoryClient({ properties }: NewInventoryClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<"item" | "supplier">("item");

  // Item fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("PLUMBING");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pieces");
  const [unitCost, setUnitCost] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [sku, setSku] = useState("");

  // Supplier fields
  const [supplier, setSupplier] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPrice, setSupplierPrice] = useState("");

  const totalValue = quantity && unitCost
    ? parseFloat(quantity) * parseFloat(unitCost)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !category || !quantity || !unit || !unitCost || !reorderLevel) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
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

      if (response.ok) {
        router.push("/dashboard/inventory");
      } else {
        const err = await response.json();
        alert(`Error: ${err.error || err.message}`);
      }
    } catch {
      alert("Failed to create inventory item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none transition-all";
  const labelCls = "block text-sm font-medium text-gray-300 mb-1.5";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventory" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-all">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-400" />
            Add Inventory Item
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Add stock to your inventory with supplier details</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-gray-800/50 rounded-xl border border-gray-700 w-fit">
        <button
          type="button"
          onClick={() => setTab("item")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === "item" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
        >
          Item Details
        </button>
        <button
          type="button"
          onClick={() => setTab("supplier")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${tab === "supplier" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
        >
          <Truck className="w-3.5 h-3.5" />
          Supplier Info
          {supplier && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {tab === "item" && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-5">
            {/* Name + SKU */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Item Name <span className="text-red-400">*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g., PVC Pipe 2 inch" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>SKU / Code <span className="text-gray-500 text-xs">(Optional)</span></label>
                <input type="text" value={sku} onChange={e => setSku(e.target.value)}
                  placeholder="e.g., PVC-2IN" className={inputCls} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Description <span className="text-gray-500 text-xs">(Optional)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Additional details..." rows={2} className={inputCls} />
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
                <label className={labelCls}>Property <span className="text-gray-500 text-xs">(Optional)</span></label>
                <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={inputCls}>
                  <option value="">All properties / General</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quantity + Unit */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className={labelCls}>Quantity <span className="text-red-400">*</span></label>
                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                  placeholder="0" min="0" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Unit <span className="text-red-400">*</span></label>
                <select value={unit} onChange={e => setUnit(e.target.value)} className={inputCls}>
                  {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Unit Cost (KSH) <span className="text-red-400">*</span></label>
                <input type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)}
                  placeholder="0.00" min="0" step="0.01" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Reorder Level <span className="text-red-400">*</span></label>
                <input type="number" value={reorderLevel} onChange={e => setReorderLevel(e.target.value)}
                  placeholder="10" min="0" className={inputCls} required />
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
            <p className="text-sm text-gray-500">Supplier details are used to auto-fill purchase orders when this item needs restocking.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Supplier Name</label>
                <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)}
                  placeholder="e.g., Nairobi Building Supplies" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact Person</label>
                <input type="text" value={supplierContact} onChange={e => setSupplierContact(e.target.value)}
                  placeholder="e.g., John Kamau" className={inputCls} />
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
                <p className="text-xs text-gray-500 mt-1">May differ from your internal unit cost</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center mt-6">
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
                Add Supplier
              </button>
            )}
            <button type="submit" disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl transition-all text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {isSubmitting ? "Saving..." : "Add to Inventory"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
