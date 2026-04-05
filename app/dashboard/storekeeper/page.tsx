"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, AlertTriangle, ShoppingCart, Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function StorekeeperDashboard() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Storekeeper Dashboard</h1>
        <p className="text-gray-400 mt-1">Inventory and purchase orders</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link href="/dashboard/inventory">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition cursor-pointer">
            <div className="flex items-center gap-2 mb-2"><Package className="w-5 h-5 text-blue-400" /><span className="text-gray-400 text-sm">Inventory</span></div>
            <p className="text-white font-medium">View all items</p>
          </div>
        </Link>
        <Link href="/dashboard/inventory/new">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition cursor-pointer">
            <div className="flex items-center gap-2 mb-2"><Plus className="w-5 h-5 text-green-400" /><span className="text-gray-400 text-sm">New Item</span></div>
            <p className="text-white font-medium">Add inventory item</p>
          </div>
        </Link>
        <Link href="/dashboard/purchase-orders">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition cursor-pointer">
            <div className="flex items-center gap-2 mb-2"><ShoppingCart className="w-5 h-5 text-purple-400" /><span className="text-gray-400 text-sm">Purchase Orders</span></div>
            <p className="text-white font-medium">View orders</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
