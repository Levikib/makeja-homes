import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import EditInventoryClient from "./EditInventoryClient";

export default async function EditInventoryPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "MANAGER", "STOREKEEPER"]);

  const item = await prisma.inventory_items.findUnique({
    where: { id: params.id },
  });

  if (!item) {
    notFound();
  }

  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <EditInventoryClient item={item} properties={properties} />;
}
