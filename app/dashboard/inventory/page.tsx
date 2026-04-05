"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory")
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading inventory...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Inventory</h1>
        <Link href="/dashboard/inventory/new">
          <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
            <Plus className="w-4 h-4 mr-2" />Add Item
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No inventory items found</p>
        </div>
      ) : (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-gray-400">Item</th>
                <th className="text-left p-4 text-gray-400">Category</th>
                <th className="text-right p-4 text-gray-400">Qty</th>
                <th className="text-right p-4 text-gray-400">Unit Cost</th>
                <th className="text-left p-4 text-gray-400">Property</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="p-4">
                    <p className="text-white font-medium">{item.name}</p>
                    {item.description && <p className="text-gray-400 text-xs">{item.description}</p>}
                  </td>
                  <td className="p-4 text-gray-300">{item.category}</td>
                  <td className="p-4 text-right">
                    <span className={`font-medium ${item.quantity <= (item.minimumQuantity || 0) ? "text-red-400" : "text-white"}`}>
                      {item.quantity} {item.unitOfMeasure}
                    </span>
                  </td>
                  <td className="p-4 text-right text-gray-300">KSH {(item.unitCost || 0).toLocaleString()}</td>
                  <td className="p-4 text-gray-400">{item.properties?.name || "—"}</td>
                  <td className="p-4">
                    <Link href={`/dashboard/inventory/${item.id}`}>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
