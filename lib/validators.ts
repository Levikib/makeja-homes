import { prisma } from "@/lib/prisma";

/**
 * Validation utilities for maintaining data integrity
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Check if a unit can be set to OCCUPIED status
 */
export async function canSetUnitOccupied(unitId: string): Promise<{ valid: boolean; reason?: string }> {
  const unit = await prisma.units.findUnique({
    where: { id: unitId },
    include: {
      tenants: {
        include: {
          leases: {
            where: {
              AND: [
                { startDate: { lte: new Date() } },
                { endDate: { gte: new Date() } },
                { deletedAt: null }
              ]
            }
          }
        }
      }
    }
  });

  if (!unit) {
    return { valid: false, reason: "Unit not found" };
  }

  const hasActiveLease = unit.tenants.some(t => t.leases.length > 0);
  
  if (!hasActiveLease) {
    return { valid: false, reason: "Cannot set unit to OCCUPIED without an active lease" };
  }

  return { valid: true };
}

/**
 * Check if a unit can be set to RESERVED status
 */
export async function canSetUnitReserved(unitId: string): Promise<{ valid: boolean; reason?: string }> {
  const unit = await prisma.units.findUnique({
    where: { id: unitId },
    include: {
      tenants: {
        include: {
          leases: {
            where: {
              AND: [
                { startDate: { gt: new Date() } },
                { deletedAt: null }
              ]
            }
          }
        }
      }
    }
  });

  if (!unit) {
    return { valid: false, reason: "Unit not found" };
  }

  const hasFutureLease = unit.tenants.some(t => t.leases.length > 0);
  
  if (!hasFutureLease) {
    return { valid: false, reason: "Cannot set unit to RESERVED without a future-dated lease" };
  }

  return { valid: true };
}

/**
 * Check if a unit has any active leases
 */
export async function hasActiveLease(unitId: string): Promise<boolean> {
  const count = await prisma.leases.count({
    where: {
      unitId,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      deletedAt: null
    }
  });

  return count > 0;
}

/**
 * Check if a tenant can be assigned to a unit
 */
export async function canAssignTenantToUnit(tenantId: string, unitId: string): Promise<{ valid: boolean; reason?: string }> {
  // Check if tenant already has an active lease
  const existingActiveLease = await prisma.leases.findFirst({
    where: {
      tenantId,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      deletedAt: null
    }
  });

  if (existingActiveLease) {
    return { valid: false, reason: "Tenant already has an active lease in another unit" };
  }

  // Check if unit already has an active lease
  const unitActiveLease = await prisma.leases.findFirst({
    where: {
      unitId,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      deletedAt: null
    }
  });

  if (unitActiveLease) {
    return { valid: false, reason: "Unit already has an active lease" };
  }

  return { valid: true };
}

/**
 * Validate lease dates
 */
export function validateLeaseDates(startDate: Date, endDate: Date): { valid: boolean; reason?: string } {
  if (startDate >= endDate) {
    return { valid: false, reason: "Lease end date must be after start date" };
  }

  // Check if lease is at least 1 month
  const monthDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthDiff < 1) {
    return { valid: false, reason: "Lease must be at least 1 month long" };
  }

  return { valid: true };
}

/**
 * Get unit status based on leases
 */
export async function calculateUnitStatus(unitId: string): Promise<"VACANT" | "OCCUPIED" | "RESERVED" | "MAINTENANCE"> {
  const now = new Date();
  
  // Check for active lease (current)
  const activeLease = await prisma.leases.findFirst({
    where: {
      unitId,
      startDate: { lte: now },
      endDate: { gte: now },
      deletedAt: null
    }
  });

  if (activeLease) {
    return "OCCUPIED";
  }

  // Check for future lease (reserved)
  const futureLease = await prisma.leases.findFirst({
    where: {
      unitId,
      startDate: { gt: now },
      deletedAt: null
    }
  });

  if (futureLease) {
    return "RESERVED";
  }

  // Check if unit is in maintenance (you can add maintenance records table later)
  const unit = await prisma.units.findUnique({
    where: { id: unitId },
    select: { status: true }
  });

  if (unit?.status === "MAINTENANCE") {
    return "MAINTENANCE";
  }

  return "VACANT";
}
