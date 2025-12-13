import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import NewWaterReadingClient from "./NewWaterReadingClient";

export default async function NewWaterReadingPage() {
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

  // SKIP last reading query for now - just set to 0
  const unitsWithLastReading = units.map(unit => ({
    ...unit,
    lastReading: 0,
  }));

  const propertiesWithLocation = properties.map(p => ({
    id: p.id,
    name: p.name,
    location: p.city || p.address || "N/A",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/water-readings">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Water Readings
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-600 bg-clip-text text-transparent">
              💧 Add Water Reading
            </h1>
            <p className="text-gray-400 mt-1">Record a new water meter reading</p>
          </div>
        </div>
      </div>

      <NewWaterReadingClient properties={propertiesWithLocation} units={unitsWithLastReading} />
    </div>
  );
}
