import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import NewLeaseClient from "./NewLeaseClient";

export default async function NewLeasePage() {
  await requireRole(["ADMIN", "MANAGER"]);

  // Get all properties for the cascading dropdown
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

  // Get all occupied units
  const occupiedUnits = await prisma.units.findMany({
    where: { 
      deletedAt: null,
      status: "OCCUPIED",
    },
    select: {
      id: true,
      unitNumber: true,
      rentAmount: true,
      depositAmount: true,
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

  // For each unit, fetch the tenant separately
  const unitsWithTenants = await Promise.all(
    occupiedUnits.map(async (unit) => {
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
        tenants: tenant ? [tenant] : [],
      };
    })
  );

  // Transform properties to include location string
  const propertiesWithLocation = properties.map(p => ({
    id: p.id,
    name: p.name,
    location: p.city || p.address || "N/A",
  }));

  console.log("=== LEASE FORM DEBUG ===");
  console.log("Properties:", propertiesWithLocation.length);
  console.log("Units with tenants:", unitsWithTenants.length);
  console.log("Sample unit:", unitsWithTenants[0]);
  console.log("========================");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/leases">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leases
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              📄 Create New Lease Agreement
            </h1>
            <p className="text-gray-400 mt-1">Generate a formal lease agreement for a tenant</p>
          </div>
        </div>
      </div>

      <NewLeaseClient properties={propertiesWithLocation} units={unitsWithTenants} />
    </div>
  );
}
