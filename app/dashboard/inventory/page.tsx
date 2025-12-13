import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import InventoryClient from "./InventoryClient";

export default async function InventoryPage() {
  await requireRole(["ADMIN", "MANAGER", "STOREKEEPER"]);

  // Get all properties for filtering
  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Get all inventory items - FIX: Don't include relation, join manually
  const items = await prisma.inventory_items.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Manually fetch property data for each item
  const itemsWithProperties = await Promise.all(
    items.map(async (item) => {
      const property = await prisma.properties.findUnique({
        where: { id: item.propertyId },
        select: { id: true, name: true },
      });
      return {
        ...item,
        properties: property || { id: item.propertyId, name: "Unknown" },
      };
    })
  );

  // Calculate stats
  const totalItems = itemsWithProperties.length;
  const totalValue = itemsWithProperties.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  const lowStockItems = itemsWithProperties.filter(item => item.quantity <= item.reorderLevel);
  const outOfStockItems = itemsWithProperties.filter(item => item.quantity === 0);

  const stats = {
    totalItems,
    totalValue,
    lowStockCount: lowStockItems.length,
    outOfStockCount: outOfStockItems.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-600 bg-clip-text text-transparent">
            📦 Inventory
          </h1>
          <p className="text-gray-400 mt-1">Manage property inventory and supplies</p>
        </div>
        <Link href="/dashboard/inventory/new">
          <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </Link>
      </div>

      <InventoryClient items={itemsWithProperties} properties={properties} stats={stats} />
    </div>
  );
}
