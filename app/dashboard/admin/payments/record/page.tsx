import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import RecordPaymentClient from "./RecordPaymentClient";

export default async function RecordPaymentPage() {
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

  // Get ALL units (occupied + vacant)
  const allUnits = await prisma.units.findMany({
    where: { 
      deletedAt: null,
    },
    select: {
      id: true,
      unitNumber: true,
      rentAmount: true,
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

  // Fetch tenant for each unit
  const unitsWithTenants = await Promise.all(
    allUnits.map(async (unit) => {
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

  const propertiesWithLocation = properties.map(p => ({
    id: p.id,
    name: p.name,
    location: p.city || p.address || "N/A",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/payments">
          <Button variant="ghost" size="sm" className="text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payments
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            💰 Record Payment
          </h1>
          <p className="text-gray-400 mt-1">Record a manual payment transaction</p>
        </div>
      </div>

      <RecordPaymentClient 
        properties={propertiesWithLocation} 
        units={unitsWithTenants} 
      />
    </div>
  );
}
