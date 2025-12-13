import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import RefundDepositClient from "./RefundDepositClient";

export default async function RefundDepositPage({
  searchParams,
}: {
  searchParams: { tenantId?: string };
}) {
  await requireRole(["ADMIN", "MANAGER"]);

  // Get all properties
  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
    },
    orderBy: { name: "asc" },
  });

  // Get all units
  const units = await prisma.units.findMany({
    where: { 
      deletedAt: null,
    },
    select: {
      id: true,
      unitNumber: true,
      status: true,
      propertyId: true,
      properties: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { unitNumber: "asc" },
  });

  // Fetch tenants for each unit
  const unitsWithTenants = await Promise.all(
    units.map(async (unit) => {
      const tenant = await prisma.tenants.findFirst({
        where: { unitId: unit.id },
        include: {
          users: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return {
        ...unit,
        tenant: tenant,
      };
    })
  );

  // Filter only expired leases
  const unitsWithExpiredLeases = unitsWithTenants.filter(
    u => u.tenant && u.tenant.leaseEndDate <= new Date()
  );

  const propertiesWithLocation = properties.map(p => ({
    id: p.id,
    name: p.name,
    location: p.city || p.address || "N/A",
  }));

  // Get pre-selected tenant if tenantId provided
  let preSelectedTenant = null;
  if (searchParams.tenantId) {
    const tenant = await prisma.tenants.findUnique({
      where: { id: searchParams.tenantId },
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        units: {
          select: {
            id: true,
            unitNumber: true,
            propertyId: true,
            properties: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    if (tenant) {
      preSelectedTenant = {
        ...tenant.units,
        tenant: tenant,
      };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/deposits">
          <Button variant="ghost" size="sm" className="text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deposits
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            💸 Process Deposit Refund
          </h1>
          <p className="text-gray-400 mt-1">Calculate refund after damage deductions</p>
        </div>
      </div>

      <RefundDepositClient 
        properties={propertiesWithLocation} 
        units={unitsWithExpiredLeases}
        preSelected={preSelectedTenant}
      />
    </div>
  );
}
