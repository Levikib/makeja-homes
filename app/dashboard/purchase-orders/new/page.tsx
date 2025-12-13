import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import NewPurchaseOrderClient from "./NewPurchaseOrderClient";

export default async function NewPurchaseOrderPage() {
  await requireRole(["ADMIN", "MANAGER", "STOREKEEPER"]);

  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Get inventory items for line items
  const inventoryItems = await prisma.inventory_items.findMany({
    select: {
      id: true,
      name: true,
      unitOfMeasure: true,
      unitCost: true,
    },
    orderBy: { name: "asc" },
  });

  return <NewPurchaseOrderClient properties={properties} inventoryItems={inventoryItems} />;
}
