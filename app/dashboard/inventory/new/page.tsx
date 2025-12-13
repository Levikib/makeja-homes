import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import NewInventoryClient from "./NewInventoryClient";

export default async function NewInventoryPage() {
  await requireRole(["ADMIN", "MANAGER", "STOREKEEPER"]);

  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <NewInventoryClient properties={properties} />;
}
