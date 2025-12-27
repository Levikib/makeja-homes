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

  // Fetch staff members from arrays (only active users)
  const managers = property.managerIds?.length 
    ? await prisma.users.findMany({
        where: { 
          id: { in: property.managerIds },
          isActive: true 
        },
        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true }
      })
    : [];

  const caretakers = property.caretakerIds?.length
    ? await prisma.users.findMany({
        where: { 
          id: { in: property.caretakerIds },
          isActive: true 
        },
        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true }
      })
    : [];

  const storekeepers = property.storekeeperIds?.length
    ? await prisma.users.findMany({
        where: { 
          id: { in: property.storekeeperIds },
          isActive: true 
        },
        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true }
      })
    : [];

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


      {/* Staff Section */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/30 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Property Staff
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Managers */}
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-semibold text-purple-300">Managers ({managers.length})</span>
            </div>
            {managers.length > 0 ? (
              <div className="space-y-3">
                {managers.map((manager) => (
                  <div key={manager.id} className="border-b border-purple-700/30 last:border-0 pb-2 last:pb-0">
                    <p className="text-white font-medium">
                      {manager.firstName} {manager.lastName}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">{manager.email}</p>
                    {manager.phoneNumber && (
                      <p className="text-sm text-gray-400">{manager.phoneNumber}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Not assigned</p>
            )}
          </div>

          {/* Caretakers */}
          <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-semibold text-blue-300">Caretakers ({caretakers.length})</span>
            </div>
            {caretakers.length > 0 ? (
              <div className="space-y-3">
                {caretakers.map((caretaker) => (
                  <div key={caretaker.id} className="border-b border-blue-700/30 last:border-0 pb-2 last:pb-0">
                    <p className="text-white font-medium">
                      {caretaker.firstName} {caretaker.lastName}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">{caretaker.email}</p>
                    {caretaker.phoneNumber && (
                      <p className="text-sm text-gray-400">{caretaker.phoneNumber}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Not assigned</p>
            )}
          </div>

          {/* Storekeepers */}
          <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm font-semibold text-green-300">Storekeepers ({storekeepers.length})</span>
            </div>
            {storekeepers.length > 0 ? (
              <div className="space-y-3">
                {storekeepers.map((storekeeper) => (
                  <div key={storekeeper.id} className="border-b border-green-700/30 last:border-0 pb-2 last:pb-0">
                    <p className="text-white font-medium">
                      {storekeeper.firstName} {storekeeper.lastName}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">{storekeeper.email}</p>
                    {storekeeper.phoneNumber && (
                      <p className="text-sm text-gray-400">{storekeeper.phoneNumber}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Not assigned</p>
            )}
          </div>
        </div>
      </div>
      {/* Units List */}
      <PropertyClient propertyId={property.id} units={property.units} isArchived={isArchived} />
    </div>
  );
}
