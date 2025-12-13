import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Plus } from "lucide-react";
import PropertyClient from "./PropertyClient";

export default async function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["ADMIN", "MANAGER"]);

  const property = await prisma.properties.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      units: {
        where: { deletedAt: null },
        include: {
          tenants: {
            where: {
              leaseEndDate: {
                gte: new Date(), // Only current tenants (lease not expired)
              },
            },
            include: {
              users: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: {
              leaseStartDate: "desc", // Most recent first
            },
          },
        },
        orderBy: { unitNumber: "asc" },
      },
    },
  });

  if (!property) notFound();

  // Calculate stats
  const totalUnits = property.units.length;
  const occupiedUnits = property.units.filter((u) => u.status === "OCCUPIED").length;
  const vacantUnits = property.units.filter((u) => u.status === "VACANT").length;
  const maintenanceUnits = property.units.filter((u) => u.status === "MAINTENANCE").length;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
  const totalRent = property.units
    .filter((u) => u.status === "OCCUPIED")
    .reduce((sum, u) => sum + u.rentAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/properties">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{property.name}</h1>
            <p className="text-gray-400">{property.location}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/dashboard/properties/${property.id}/units/new`}>
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Unit
            </Button>
          </Link>
          <Link href={`/dashboard/properties/${property.id}/edit`}>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Edit className="w-4 h-4 mr-2" />
              Edit Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-700/30 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Total Units</p>
          <p className="text-3xl font-bold text-white">{totalUnits}</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Occupied</p>
          <p className="text-3xl font-bold text-white">{occupiedUnits}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-700/30 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Vacant</p>
          <p className="text-3xl font-bold text-white">{vacantUnits}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border border-orange-700/30 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Maintenance</p>
          <p className="text-3xl font-bold text-white">{maintenanceUnits}</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-700/30 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Occupancy Rate</p>
          <p className="text-3xl font-bold text-white">{occupancyRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Property Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-gray-400 text-xs">Location</p>
            <p className="text-white font-semibold">{property.location}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Total Units</p>
            <p className="text-white font-semibold">{property.totalUnits}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Property Type</p>
            <p className="text-white font-semibold">{property.type || "N/A"}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Monthly Revenue</p>
            <p className="text-green-400 font-bold text-lg">
              KSH {totalRent.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Units List */}
      <PropertyClient propertyId={property.id} units={property.units} />
    </div>
  );
}
