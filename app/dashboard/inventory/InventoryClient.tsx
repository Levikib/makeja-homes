"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Package, DollarSign, AlertTriangle, XCircle, Search, Filter, X, 
  MapPin, Eye, Edit 
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  reorderLevel: number;
  propertyId: string;
  properties: {
    id: string;
    name: string;
  };
}

interface Property {
  id: string;
  name: string;
}

interface Stats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface InventoryClientProps {
  items: InventoryItem[];
  properties: Property[];
  stats: Stats;
}

export default function InventoryClient({ items, properties, stats }: InventoryClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesProperty =
        selectedProperty === "all" || item.propertyId === selectedProperty;

      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && item.quantity <= item.reorderLevel && item.quantity > 0) ||
        (stockFilter === "out" && item.quantity === 0);

      return matchesSearch && matchesProperty && matchesCategory && matchesStock;
    });
  }, [items, searchQuery, selectedProperty, selectedCategory, stockFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedProperty("all");
    setSelectedCategory("all");
    setStockFilter("all");
  };

  const hasActiveFilters = 
    searchQuery !== "" || 
    selectedProperty !== "all" || 
    selectedCategory !== "all" || 
    stockFilter !== "all";

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total Items</h3>
            <Package className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.totalItems}</p>
          <p className="text-xs text-indigo-400">In inventory</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total Value</h3>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">KSH {stats.totalValue.toLocaleString()}</p>
          <p className="text-xs text-green-400">Current stock</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Low Stock</h3>
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.lowStockCount}</p>
          <p className="text-xs text-yellow-400">Need reorder</p>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-pink-600/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Out of Stock</h3>
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.outOfStockCount}</p>
          <p className="text-xs text-red-400">Urgent</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              size="sm"
              variant="ghost"
              className="ml-auto text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Item name..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Property
            </label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Package className="w-4 h-4 inline mr-1" />
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="HVAC">HVAC</option>
              <option value="CLEANING">Cleaning</option>
              <option value="TOOLS">Tools</option>
              <option value="FURNITURE">Furniture</option>
              <option value="APPLIANCES">Appliances</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Stock Level
            </label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Levels</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Showing <span className="text-indigo-400 font-semibold">{filteredItems.length}</span> of{" "}
            <span className="text-white font-semibold">{items.length}</span> items
          </p>
        </div>
      </div>

      {/* Inventory Items Cards */}
      {filteredItems.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No inventory items found</h2>
          <p className="text-gray-400 mb-6">
            {hasActiveFilters
              ? "Try adjusting your filters"
              : "Add your first inventory item to get started"}
          </p>
          {hasActiveFilters ? (
            <Button onClick={clearFilters} variant="outline" className="border-indigo-600 text-indigo-400">
              Clear Filters
            </Button>
          ) : (
            <Link href="/dashboard/inventory/new">
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
                <Package className="w-4 h-4 mr-2" />
                Add First Item
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isLowStock = item.quantity <= item.reorderLevel && item.quantity > 0;
            const isOutOfStock = item.quantity === 0;
            const totalValue = item.quantity * item.unitCost;

            return (
              <div
                key={item.id}
                className={`bg-gray-800/50 border rounded-xl p-6 hover:shadow-lg transition-all ${
                  isOutOfStock
                    ? "border-red-500/30 hover:border-red-500/50"
                    : isLowStock
                    ? "border-yellow-500/30 hover:border-yellow-500/50"
                    : "border-gray-700 hover:border-indigo-500/50"
                }`}
              >
                {/* Header with Stock Status */}
                <div className="flex items-start justify-between mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    {item.category}
                  </span>
                  {isOutOfStock ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                      OUT OF STOCK
                    </span>
                  ) : isLowStock ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                      LOW STOCK
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
                      IN STOCK
                    </span>
                  )}
                </div>

                {/* Item Name and Property */}
                <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                <p className="text-sm text-gray-400 flex items-center gap-1 mb-3">
                  <MapPin className="w-3 h-3" />
                  {item.properties.name}
                </p>

                {/* Description */}
                {item.description && (
                  <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Quantity Info */}
                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Quantity</p>
                      <p className="text-xl font-bold text-indigo-400">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Reorder Level</p>
                      <p className="text-xl font-bold text-purple-400">
                        {item.reorderLevel} {item.unit}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cost Info */}
                <div className="space-y-2 mb-4 pb-4 border-b border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Unit Cost</span>
                    <span className="text-white font-medium">KSH {item.unitCost.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total Value</span>
                    <span className="text-green-400 font-bold">KSH {totalValue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link href={`/dashboard/inventory/${item.id}`} className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  <Link href={`/dashboard/inventory/${item.id}/edit`}>
                    <Button variant="outline" className="border-gray-600">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
