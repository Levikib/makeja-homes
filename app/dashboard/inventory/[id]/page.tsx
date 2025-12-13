import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Package, DollarSign, AlertTriangle } from "lucide-react";

export default async function InventoryItemPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "MANAGER", "STOREKEEPER"]);

  const item = await prisma.inventory_items.findUnique({
    where: { id: params.id },
  });

  if (!item) {
    notFound();
  }

  const property = await prisma.properties.findUnique({
    where: { id: item.propertyId },
    select: { name: true },
  });

  const isLowStock = item.quantity <= item.reorderLevel && item.quantity > 0;
  const isOutOfStock = item.quantity === 0;
  const totalValue = item.quantity * item.unitCost;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/inventory">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-600 bg-clip-text text-transparent">
              {item.name}
            </h1>
            <p className="text-gray-400 mt-1">{property?.name}</p>
          </div>
        </div>
        <Link href={`/dashboard/inventory/${item.id}/edit`}>
          <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Edit className="w-4 h-4 mr-2" />
            Edit Item
          </Button>
        </Link>
      </div>

      {/* Stock Status Alert */}
      {isOutOfStock && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-red-400 font-semibold">Out of Stock</h3>
            <p className="text-sm text-gray-300">This item needs to be restocked immediately</p>
          </div>
        </div>
      )}

      {isLowStock && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
          <div>
            <h3 className="text-yellow-400 font-semibold">Low Stock Warning</h3>
            <p className="text-sm text-gray-300">
              Stock is below reorder level ({item.reorderLevel} {item.unit})
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Current Stock</h3>
            <Package className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {item.quantity} {item.unit}
          </p>
          <p className="text-xs text-indigo-400">Available</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total Value</h3>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">KSH {totalValue.toLocaleString()}</p>
          <p className="text-xs text-green-400">@ {item.unitCost}/unit</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Reorder Level</h3>
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {item.reorderLevel} {item.unit}
          </p>
          <p className="text-xs text-yellow-400">Minimum stock</p>
        </div>
      </div>

      {/* Item Details */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Item Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-400 mb-1">Category</p>
            <p className="text-white font-medium">{item.category}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Unit</p>
            <p className="text-white font-medium">{item.unit}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Unit Cost</p>
            <p className="text-white font-medium">KSH {item.unitCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Property</p>
            <p className="text-white font-medium">{property?.name}</p>
          </div>
          {item.description && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-400 mb-1">Description</p>
              <p className="text-white">{item.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
