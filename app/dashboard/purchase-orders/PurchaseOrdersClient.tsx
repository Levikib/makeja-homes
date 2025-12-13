"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  ShoppingCart, Clock, CheckCircle, Package, Search, Filter, X, 
  MapPin, DollarSign, Calendar, Eye, User
} from "lucide-react";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  status: string;
  totalAmount: number;
  orderDate: Date;
  expectedDelivery: Date | null;
  receivedDate: Date | null;
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
  totalOrders: number;
  pendingCount: number;
  approvedCount: number;
  receivedCount: number;
  totalValue: number;
}

interface PurchaseOrdersClientProps {
  orders: PurchaseOrder[];
  properties: Property[];
  stats: Stats;
}

const statusColors = {
  DRAFT: "text-gray-400 bg-gray-500/10 border-gray-500/30",
  PENDING: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  APPROVED: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  RECEIVED: "text-green-400 bg-green-500/10 border-green-500/30",
  CANCELLED: "text-red-400 bg-red-500/10 border-red-500/30",
};

export default function PurchaseOrdersClient({ orders, properties, stats }: PurchaseOrdersClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        searchQuery === "" ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplier.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProperty =
        selectedProperty === "all" || order.propertyId === selectedProperty;

      const matchesStatus =
        selectedStatus === "all" || order.status === selectedStatus;

      return matchesSearch && matchesProperty && matchesStatus;
    });
  }, [orders, searchQuery, selectedProperty, selectedStatus]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedProperty("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters = searchQuery !== "" || selectedProperty !== "all" || selectedStatus !== "all";

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-600/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total Orders</h3>
            <ShoppingCart className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.totalOrders}</p>
          <p className="text-xs text-blue-400">All time</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Pending</h3>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.pendingCount}</p>
          <p className="text-xs text-yellow-400">Awaiting approval</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Approved</h3>
            <CheckCircle className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.approvedCount}</p>
          <p className="text-xs text-blue-400">In transit</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Received</h3>
            <Package className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.receivedCount}</p>
          <p className="text-xs text-green-400">Completed</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total Value</h3>
            <DollarSign className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">KSH {stats.totalValue.toLocaleString()}</p>
          <p className="text-xs text-purple-400">All orders</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Order number, supplier..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Showing <span className="text-blue-400 font-semibold">{filteredOrders.length}</span> of{" "}
            <span className="text-white font-semibold">{orders.length}</span> orders
          </p>
        </div>
      </div>

      {/* Purchase Orders Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No purchase orders found</h2>
          <p className="text-gray-400 mb-6">
            {hasActiveFilters
              ? "Try adjusting your filters"
              : "Create your first purchase order to get started"}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-blue-600 text-blue-400 rounded-lg hover:bg-blue-600/10 transition-colors"
            >
              Clear Filters
            </button>
          ) : (
            <Link href="/dashboard/purchase-orders/new">
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-colors flex items-center gap-2 mx-auto">
                <ShoppingCart className="w-4 h-4" />
                Create First Order
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const daysAgo = Math.floor(
              (new Date().getTime() - new Date(order.orderDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={order.id}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:shadow-lg hover:border-blue-500/50 transition-all"
              >
                {/* Header with Status */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{order.orderNumber}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {order.properties.name}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                    {order.status}
                  </span>
                </div>

                {/* Supplier */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-700">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-400">{order.supplier}</span>
                </div>

                {/* Order Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Ordered
                    </span>
                    <span className="text-white">
                      {daysAgo === 0 ? "Today" : `${daysAgo} days ago`}
                    </span>
                  </div>
                  {order.expectedDelivery && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Expected
                      </span>
                      <span className="text-white">
                        {new Date(order.expectedDelivery).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total Amount */}
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-400 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-blue-400">
                    KSH {order.totalAmount.toLocaleString()}
                  </p>
                </div>

                {/* View Details Button */}
                <Link href={`/dashboard/purchase-orders/${order.id}`}>
                  <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-colors flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
