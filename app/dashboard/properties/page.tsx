import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Eye } from "lucide-react";

export default async function PropertiesPage() {
  await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    include: {
      units: {
        where: { deletedAt: null },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          🏢 Properties
        </h1>
        <Link href="/dashboard/properties/new">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => {
          const occupiedUnits = property.units.filter((u) => u.status === "OCCUPIED").length;
          const occupancyRate = property.units.length > 0
            ? ((occupiedUnits / property.units.length) * 100).toFixed(1)
            : 0;

          return (
            <div
              key={property.id}
              className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="p-6 space-y-4">
                {/* Title - Fixed height */}
                <div className="h-14 flex items-start">
                  <h3 className="text-xl font-semibold text-white line-clamp-2">{property.name}</h3>
                </div>

                {/* Address - Fixed height */}
                <div className="h-10">
                  <p className="text-gray-400 text-sm line-clamp-2">
                    📍 {property.address}, {property.city}
                  </p>
                </div>

                {/* Stats - Consistent spacing */}
                <div className="grid grid-cols-3 gap-3 py-3 border-t border-gray-700">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{property.units.length}</p>
                    <p className="text-gray-400 text-xs">Units</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{occupiedUnits}</p>
                    <p className="text-gray-400 text-xs">Occupied</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-400">{occupancyRate}%</p>
                    <p className="text-gray-400 text-xs">Rate</p>
                  </div>
                </div>

                {/* Action button */}
                <Link href={`/dashboard/properties/${property.id}`} className="block">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
