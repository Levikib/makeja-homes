import { prisma } from "@/lib/prisma";

/**
 * Syncs unit status based on active leases
 * - OCCUPIED: Has ACTIVE lease
 * - RESERVED: Has PENDING lease
 * - VACANT: No active/pending leases (unless manually set to MAINTENANCE)
 */
export async function syncUnitStatus(unitId: string) {
  // Get unit with active/pending leases
  const unit = await prisma.units.findUnique({
    where: { id: unitId },
    include: {
      lease_agreements: {
        where: {
          OR: [
            { status: "ACTIVE" },
            { status: "PENDING" }
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!unit) return;

  // Don't auto-update if manually set to MAINTENANCE
  if (unit.status === "MAINTENANCE") return;

  let newStatus: "VACANT" | "OCCUPIED" | "RESERVED" | "MAINTENANCE" = "VACANT";

  if (unit.lease_agreements.length > 0) {
    const lease = unit.lease_agreements[0];
    if (lease.status === "ACTIVE") {
      newStatus = "OCCUPIED";
    } else if (lease.status === "PENDING") {
      newStatus = "RESERVED";
    }
  }

  // Update unit status if changed
  if (unit.status !== newStatus) {
    await prisma.units.update({
      where: { id: unitId },
      data: { status: newStatus, updatedAt: new Date() },
    });
  }

  return newStatus;
}

/**
 * Syncs all units in a property
 */
export async function syncPropertyUnitStatuses(propertyId: string) {
  const units = await prisma.units.findMany({
    where: { propertyId },
    select: { id: true },
  });

  for (const unit of units) {
    await syncUnitStatus(unit.id);
  }
}
