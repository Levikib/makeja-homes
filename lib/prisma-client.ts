import { PrismaClient } from "@prisma/client";

// Create a global Prisma instance
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Export with corrected model names for easy access
export const db = {
  // Use lowercase model names from database
  properties: prisma.properties,
  units: prisma.units,
  users: prisma.users,
  tenants: prisma.tenants,
  leaseAgreements: prisma.lease_agreements,
  payments: prisma.payments,
  maintenanceRequests: prisma.maintenance_requests,
  inventoryItems: prisma.inventory_items,
  inventoryMovements: prisma.inventory_movements,
  activityLogs: prisma.activity_logs,
  damageAssessments: prisma.damage_assessments,
  damageItems: prisma.damage_items,
  securityDeposits: prisma.security_deposits,
  vacateNotices: prisma.vacate_notices,
};
