"use client";

import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

export default function PurchaseOrdersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            📦 Purchase Orders
          </h1>
          <p className="text-gray-400 mt-1">Manage inventory purchase orders</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Order
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search purchase orders..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
          <option>All Status</option>
        </select>
      </div>

      {/* Content */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
            <span className="text-3xl">📦</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Purchase Orders</h3>
          <p className="text-gray-400 mb-4">Purchase order management will be displayed here</p>
          <p className="text-sm text-gray-500">
            Search: "" | Status: all
          </p>
        </div>
      </div>
    </div>
  );
}
