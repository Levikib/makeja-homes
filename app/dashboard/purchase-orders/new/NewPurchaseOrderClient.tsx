"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, X, ShoppingCart, Package, AlertCircle } from "lucide-react";

interface Property {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unitOfMeasure: string;
  unitCost: number | any;
  supplier?: string;
  supplierContact?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierPrice?: number | any;
  quantity?: number | any;
  minimumQuantity?: number | any;
}

type LineItemSource = "inventory" | "custom";

interface LineItem {
  _id: string; // local key
  source: LineItemSource;
  inventoryItemId: string;
  itemName: string;
  description: string;
  quantity: number;
  unitCost: number;
  unit: string;
  total: number;
  // For custom items only
  addToInventory: boolean;
  customCategory: string;
  customReorderLevel: string;
  customSupplier: string;
  customSupplierContact: string;
  customSupplierPhone: string;
  customSupplierEmail: string;
}

interface NewPurchaseOrderClientProps {
  properties: Property[];
  inventoryItems: InventoryItem[];
}

const CATEGORIES = [
  "PLUMBING", "ELECTRICAL", "HVAC", "CLEANING",
  "TOOLS", "FURNITURE", "APPLIANCES", "SAFETY", "LANDSCAPING", "OTHER",
];

const UNITS = ["pieces", "units", "meters", "liters", "kg", "boxes", "rolls", "sets", "pairs", "bags"];

let localId = 0;
const nextId = () => `li_${++localId}`;

function makeItem(source: LineItemSource, inv?: InventoryItem): LineItem {
  return {
    _id: nextId(),
    source,
    inventoryItemId: inv?.id ?? "",
    itemName: inv?.name ?? "",
    description: "",
    quantity: 1,
    unitCost: Number(inv?.supplierPrice ?? inv?.unitCost) || 0,
    unit: inv?.unitOfMeasure ?? "units",
    total: Number(inv?.supplierPrice ?? inv?.unitCost) || 0,
    addToInventory: false,
    customCategory: "PLUMBING",
    customReorderLevel: "5",
    customSupplier: "",
    customSupplierContact: "",
    customSupplierPhone: "",
    customSupplierEmail: "",
  };
}

export default function NewPurchaseOrderClient({ properties, inventoryItems }: NewPurchaseOrderClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Order header
  const [supplier, setSupplier] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // --- Line item helpers ---
  const addFromInventory = () => {
    if (!inventoryItems.length) return;
    const item = makeItem("inventory", inventoryItems[0]);
    setLineItems(prev => [...prev, item]);
  };

  const addCustom = () => {
    const item = makeItem("custom");
    setLineItems(prev => [...prev, item]);
    setExpandedItem(item._id);
  };

  const removeItem = (id: string) => setLineItems(prev => prev.filter(i => i._id !== id));

  const updateItem = (id: string, patch: Partial<LineItem>) => {
    setLineItems(prev => prev.map(item => {
      if (item._id !== id) return item;
      const updated = { ...item, ...patch };

      // Recompute total when qty or unitCost changes
      if ("quantity" in patch || "unitCost" in patch) {
        updated.total = (updated.quantity || 0) * (updated.unitCost || 0);
      }
      // When inventory item changes, pull its data
      if ("inventoryItemId" in patch && patch.inventoryItemId) {
        const inv = inventoryItems.find(i => i.id === patch.inventoryItemId);
        if (inv) {
          updated.itemName = inv.name;
          updated.unitCost = Number(inv.supplierPrice ?? inv.unitCost) || 0;
          updated.unit = inv.unitOfMeasure || "units";
          updated.total = updated.quantity * updated.unitCost;
          // Auto-fill order supplier if blank
          if (!supplier && inv.supplier) setSupplier(inv.supplier);
          if (!supplierContact && inv.supplierContact) setSupplierContact(inv.supplierContact);
          if (!supplierPhone && inv.supplierPhone) setSupplierPhone(inv.supplierPhone);
          if (!supplierEmail && inv.supplierEmail) setSupplierEmail(inv.supplierEmail);
        }
      }
      return updated;
    }));
  };

  const totalAmount = lineItems.reduce((s, i) => s + i.total, 0);
  const customItemsToAdd = lineItems.filter(i => i.source === "custom" && i.addToInventory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplier.trim()) { alert("Supplier name is required"); return; }
    if (!propertyId) { alert("Please select a property"); return; }
    if (lineItems.length === 0) { alert("Add at least one line item"); return; }
    for (const item of lineItems) {
      if (!item.itemName.trim()) { alert("Each line item needs a name"); return; }
      if (item.quantity <= 0) { alert(`Quantity for "${item.itemName}" must be greater than 0`); return; }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: supplier.trim(),
          supplierContact: supplierContact || null,
          supplierEmail: supplierEmail || null,
          supplierPhone: supplierPhone || null,
          propertyId,
          orderDate,
          expectedDelivery: expectedDelivery || null,
          notes: notes || null,
          lineItems: lineItems.map(item => ({
            inventoryItemId: item.source === "inventory" ? item.inventoryItemId : null,
            itemName: item.itemName.trim(),
            description: item.description || null,
            quantity: item.quantity,
            unitCost: item.unitCost,
            unit: item.unit || "units",
            // Pass custom item inventory metadata when addToInventory is true
            addToInventory: item.source === "custom" && item.addToInventory,
            newInventoryData: item.source === "custom" && item.addToInventory ? {
              category: item.customCategory,
              reorderLevel: parseInt(item.customReorderLevel) || 5,
              supplier: item.customSupplier || supplier || null,
              supplierContact: item.customSupplierContact || supplierContact || null,
              supplierPhone: item.customSupplierPhone || supplierPhone || null,
              supplierEmail: item.customSupplierEmail || supplierEmail || null,
              propertyId,
            } : null,
          })),
        }),
      });

      if (res.ok) {
        const order = await res.json();
        router.push(`/dashboard/purchase-orders/${order.id}`);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || err.message}`);
      }
    } catch {
      alert("Failed to create purchase order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all text-sm";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide";

  const lowStock = (inv: InventoryItem) =>
    Number(inv.quantity) <= Number(inv.minimumQuantity ?? 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchase-orders"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-all">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-400" />
            New Purchase Order
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Procure inventory items or request new stock</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Supplier + Order details */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Order Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Supplier <span className="text-red-400">*</span></label>
              <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)}
                placeholder="e.g., Nairobi Building Supplies" className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Contact Person</label>
              <input type="text" value={supplierContact} onChange={e => setSupplierContact(e.target.value)}
                placeholder="Contact name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Supplier Phone</label>
              <input type="tel" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)}
                placeholder="+254 7xx xxx xxx" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Supplier Email</label>
              <input type="email" value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)}
                placeholder="supplier@email.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Property <span className="text-red-400">*</span></label>
              <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={inputCls} required>
                <option value="">Select property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Order Date <span className="text-red-400">*</span></label>
              <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Expected Delivery</label>
              <input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Additional instructions..." className={inputCls} />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Line Items</h2>
            <div className="flex items-center gap-2">
              {inventoryItems.length > 0 && (
                <button type="button" onClick={addFromInventory}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-xl text-xs font-medium transition-all">
                  <Package className="w-3.5 h-3.5" />
                  From Inventory
                </button>
              )}
              <button type="button" onClick={addCustom}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-all">
                <Plus className="w-3.5 h-3.5" />
                Custom Item
              </button>
            </div>
          </div>

          {lineItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-xl">
              <ShoppingCart className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">No items yet</p>
              <p className="text-gray-600 text-xs mt-1">Add from existing inventory or enter a custom item</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lineItems.map(item => (
                <div key={item._id} className="bg-gray-900/60 border border-gray-700/60 rounded-xl overflow-hidden">
                  {/* Main row */}
                  <div className="p-4">
                    <div className="grid grid-cols-12 gap-3 items-start">
                      {/* Item selector / name */}
                      <div className="col-span-12 md:col-span-4">
                        <label className="block text-xs text-gray-500 mb-1">
                          {item.source === "inventory" ? "Inventory Item" : "Item Name"} <span className="text-red-400">*</span>
                        </label>
                        {item.source === "inventory" ? (
                          <select value={item.inventoryItemId}
                            onChange={e => updateItem(item._id, { inventoryItemId: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            {inventoryItems.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name}
                                {lowStock(inv) ? " ⚠ Low" : ""}
                                {" — "}
                                {inv.unitOfMeasure}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input type="text" value={item.itemName}
                            onChange={e => updateItem(item._id, { itemName: e.target.value })}
                            placeholder="Item name" required
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        )}
                      </div>

                      {/* Qty */}
                      <div className="col-span-4 md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input type="number" value={item.quantity}
                          onChange={e => updateItem(item._id, { quantity: parseFloat(e.target.value) || 0 })}
                          min="0.01" step="0.01"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>

                      {/* Unit */}
                      <div className="col-span-4 md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Unit</label>
                        {item.source === "inventory" ? (
                          <input type="text" value={item.unit} readOnly
                            className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700 rounded-lg text-gray-400 text-sm" />
                        ) : (
                          <select value={item.unit} onChange={e => updateItem(item._id, { unit: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        )}
                      </div>

                      {/* Unit cost */}
                      <div className="col-span-4 md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Unit Cost (KSH)</label>
                        <input type="number" value={item.unitCost}
                          onChange={e => updateItem(item._id, { unitCost: parseFloat(e.target.value) || 0 })}
                          min="0" step="0.01"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>

                      {/* Total */}
                      <div className="col-span-12 md:col-span-2 flex items-end justify-between gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Total</label>
                          <p className="text-white font-semibold text-sm pt-1.5">KSH {item.total.toLocaleString()}</p>
                        </div>
                        <button type="button" onClick={() => removeItem(item._id)}
                          className="mb-1 p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mt-3">
                      <input type="text" value={item.description}
                        onChange={e => updateItem(item._id, { description: e.target.value })}
                        placeholder="Description / notes for this item (optional)"
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 text-xs placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                  </div>

                  {/* Custom item — "Add to Inventory" toggle */}
                  {item.source === "custom" && (
                    <div className="border-t border-gray-700/60 bg-gray-900/30">
                      <button type="button"
                        onClick={() => {
                          updateItem(item._id, { addToInventory: !item.addToInventory });
                          setExpandedItem(item.addToInventory ? null : item._id);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-800/40 transition-colors">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                          ${item.addToInventory ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                          {item.addToInventory && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <Package className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className={item.addToInventory ? "text-emerald-400 font-medium" : "text-gray-400"}>
                          Add this item to inventory when order is received
                        </span>
                        {item.addToInventory && <AlertCircle className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                      </button>

                      {item.addToInventory && (
                        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Category</label>
                            <select value={item.customCategory}
                              onChange={e => updateItem(item._id, { customCategory: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Reorder Level</label>
                            <input type="number" value={item.customReorderLevel} min="0"
                              onChange={e => updateItem(item._id, { customReorderLevel: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Supplier Name</label>
                            <input type="text" value={item.customSupplier || supplier}
                              onChange={e => updateItem(item._id, { customSupplier: e.target.value })}
                              placeholder="Defaults to order supplier"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Supplier Contact</label>
                            <input type="text" value={item.customSupplierContact || supplierContact}
                              onChange={e => updateItem(item._id, { customSupplierContact: e.target.value })}
                              placeholder="Contact name"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Supplier Phone</label>
                            <input type="tel" value={item.customSupplierPhone || supplierPhone}
                              onChange={e => updateItem(item._id, { customSupplierPhone: e.target.value })}
                              placeholder="+254..."
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Supplier Email</label>
                            <input type="email" value={item.customSupplierEmail || supplierEmail}
                              onChange={e => updateItem(item._id, { customSupplierEmail: e.target.value })}
                              placeholder="email@supplier.com"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Custom items to be inventoried summary */}
          {customItemsToAdd.length > 0 && (
            <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <Package className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-emerald-300">
                <span className="font-semibold">{customItemsToAdd.length} item{customItemsToAdd.length !== 1 ? "s" : ""}</span> will be added to inventory when this order is received:{" "}
                {customItemsToAdd.map(i => i.itemName).join(", ")}
              </p>
            </div>
          )}

          {/* Order total */}
          {lineItems.length > 0 && (
            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-3">
              <span className="text-sm text-gray-400">{lineItems.length} item{lineItems.length !== 1 ? "s" : ""} · Order Total</span>
              <span className="text-2xl font-bold text-blue-400">KSH {totalAmount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/purchase-orders">
            <button type="button" className="px-4 py-2.5 border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-800 transition-all text-sm">
              Cancel
            </button>
          </Link>
          <button type="submit" disabled={isSubmitting || lineItems.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl transition-all text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/30 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {isSubmitting ? "Creating..." : "Create Purchase Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
