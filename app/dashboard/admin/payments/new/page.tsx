import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import NewPaymentClient from "./NewPaymentClient";

export default async function NewPaymentPage() {
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

  console.log("=== PAYMENT FORM DEBUG (SERVER) ===");
  console.log("Occupied units found:", occupiedUnits.length);
  console.log("First unit sample:", occupiedUnits[0]);

  // Fetch tenant for each unit
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

      if (tenant) {
        console.log(`Unit ${unit.unitNumber} has tenant:`, tenant.users.firstName, tenant.users.lastName);
      }

      return {
        ...unit,
        tenant: tenant,
      };
    })
  );

  // Only include units that have tenants
  const unitsWithActiveTenants = unitsWithTenants.filter(u => u.tenant !== null);

  const propertiesWithLocation = properties.map(p => ({
    id: p.id,
    name: p.name,
    location: p.city || p.address || "N/A",
  }));

  console.log("Properties:", propertiesWithLocation.length);
  console.log("Units with active tenants:", unitsWithActiveTenants.length);
  console.log("Sample tenant unit:", unitsWithActiveTenants[0]);
  console.log("===================================");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/payments">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Payments
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
              💰 Record New Payment
            </h1>
            <p className="text-gray-400 mt-1">Record a rent payment from a tenant</p>
          </div>
        </div>
      </div>

      {/* Debug info on page */}
      <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4">
        <p className="text-yellow-400 text-sm font-semibold mb-2">🐛 Server Debug Info</p>
        <div className="text-xs text-yellow-200 space-y-1">
          <p>Properties loaded: <strong>{propertiesWithLocation.length}</strong></p>
          <p>Units with tenants: <strong>{unitsWithActiveTenants.length}</strong></p>
          {unitsWithActiveTenants.length > 0 && (
            <p>Sample tenant: <strong>{unitsWithActiveTenants[0].tenant?.users.firstName} {unitsWithActiveTenants[0].tenant?.users.lastName}</strong></p>
          )}
        </div>
      </div>

      <NewPaymentClient properties={propertiesWithLocation} units={unitsWithActiveTenants} />
    </div>
  );
}
