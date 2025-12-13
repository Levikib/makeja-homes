import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Plus } from "lucide-react";
import PurchaseOrdersClient from "./PurchaseOrdersClient";

export default async function PurchaseOrdersPage() {
  await requireRole(["ADMIN", "MANAGER", "STOREKEEPER"]);

  // Get all properties for filtering
  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Get all purchase orders
  const orders = await prisma.purchase_orders.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Manually fetch property data
  const ordersWithProperties = await Promise.all(
    orders.map(async (order) => {
      const property = await prisma.properties.findUnique({
        where: { id: order.propertyId },
        select: { id: true, name: true },
      });
      return {
        ...order,
        properties: property || { id: order.propertyId, name: "Unknown" },
      };
    })
  );

  // Calculate stats
  const totalOrders = ordersWithProperties.length;
  const pendingOrders = ordersWithProperties.filter(o => o.status === "PENDING");
  const approvedOrders = ordersWithProperties.filter(o => o.status === "APPROVED");
  const receivedOrders = ordersWithProperties.filter(o => o.status === "RECEIVED");
  const totalValue = ordersWithProperties.reduce((sum, o) => sum + o.totalAmount, 0);

  const stats = {
    totalOrders,
    pendingCount: pendingOrders.length,
    approvedCount: approvedOrders.length,
    receivedCount: receivedOrders.length,
    totalValue,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-600 bg-clip-text text-transparent">
            🛒 Purchase Orders
          </h1>
          <p className="text-gray-400 mt-1">Manage inventory purchase orders</p>
        </div>
        <Link href="/dashboard/purchase-orders/new">
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Order
          </button>
        </Link>
      </div>

      <PurchaseOrdersClient orders={ordersWithProperties} properties={properties} stats={stats} />
    </div>
  );
}
