import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Plus, Archive } from "lucide-react";
import PropertyClient from "./PropertyClient";

export default async function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

  // Remove deletedAt filter to allow viewing archived properties
  const property = await prisma.properties.findUnique({
    where: { id: params.id },
    include: {
      units: {
        // Show all units (archived and active)
        include: {
          tenants: {
            where: {
              leaseEndDate: {
                gte: new Date(),
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
              leaseStartDate: "desc",
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

  const isArchived = property.deletedAt !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/properties">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{property.name}</h1>
              {isArchived && (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full border border-red-500/30 flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Archived
                </span>
              )}
            </div>
            <p className="text-gray-400">{property.address}</p>
          </div>
        </div>
        {!isArchived && (
          <div className="flex gap-3">
            <Link href={`/dashboard/properties/${property.id}/units/new`}>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Unit
              </Button>
            </Link>
            <Link href={`/dashboard/admin/properties/${property.id}/edit`}>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Edit className="w-4 h-4 mr-2" />
                Edit Property
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Archived Warning Banner */}
      {isArchived && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Archive className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-400 font-semibold">Archived Property</h3>
              <p className="text-gray-300 text-sm mt-1">
                This property is archived and shown for reference only. All associated units, tenants, and leases are also archived.
                Restore the property to make changes or add new units.
              </p>
            </div>
          </div>
        </div>
      )}

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
        <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-700/30 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Maintenance</p>
          <p className="text-3xl font-bold text-white">{maintenanceUnits}</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-700/30 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Occupancy Rate</p>
          <p className="text-3xl font-bold text-white">{occupancyRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Revenue Card */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-green-400 mb-2">Monthly Revenue</h3>
        <p className="text-4xl font-bold text-white">KSH {totalRent.toLocaleString()}</p>
        <p className="text-gray-400 text-sm mt-1">From {occupiedUnits} occupied units</p>
      </div>

      {/* Units List */}
      <PropertyClient propertyId={property.id} units={property.units} isArchived={isArchived} />
    </div>
  );
}
