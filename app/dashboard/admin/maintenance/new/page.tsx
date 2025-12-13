import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import NewMaintenanceClient from "./NewMaintenanceClient";

export default async function NewMaintenancePage() {
  await requireRole(["ADMIN", "MANAGER", "CARETAKER", "TENANT"]);

  const session = await getServerSession(authOptions);

  // Get all properties
  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  // Get all units
  const units = await prisma.units.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      unitNumber: true,
      propertyId: true,
    },
    orderBy: { unitNumber: "asc" },
  });

  return <NewMaintenanceClient properties={properties} units={units} userId={session?.user?.id || ""} />;
}
