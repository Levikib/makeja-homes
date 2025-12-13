import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import MaintenanceClient from "./MaintenanceClient";

export default async function MaintenancePage() {
  try {
    await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

    const properties = await prisma.properties.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // ✅ CORRECT field names
    const requests = await prisma.maintenance_requests.findMany({
      include: {
        units: {
          select: {
            unitNumber: true,
            properties: {
              select: { id: true, name: true },
            },
          },
        },
        users_maintenance_requests_createdByIdTousers: {
          select: { firstName: true, lastName: true, email: true },
        },
        users_maintenance_requests_assignedToIdTousers: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const openRequests = requests.filter(r => r.status === "OPEN");
    const inProgressRequests = requests.filter(r => r.status === "IN_PROGRESS");
    const completedRequests = requests.filter(r => r.status === "COMPLETED");
    const totalCost = requests
      .filter(r => r.status === "COMPLETED")
      .reduce((sum, r) => sum + (r.actualCost || 0), 0);

    const stats = {
      openCount: openRequests.length,
      inProgressCount: inProgressRequests.length,
      completedCount: completedRequests.length,
      totalCost,
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">
              🔧 Maintenance
            </h1>
            <p className="text-gray-400 mt-1">Manage property maintenance and repairs</p>
          </div>
          <Link href="/dashboard/maintenance/new">
            <Button className="bg-gradient-to-r from-orange-600 to-red-600">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
        </div>
        <MaintenanceClient requests={requests} properties={properties} stats={stats} />
      </div>
    );
  } catch (error) {
    console.error("Error loading maintenance page:", error);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">
              🔧 Maintenance
            </h1>
            <p className="text-gray-400 mt-1">Manage property maintenance and repairs</p>
          </div>
          <Link href="/dashboard/maintenance/new">
            <Button className="bg-gradient-to-r from-orange-600 to-red-600">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-gray-300">{error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </div>
    );
  }
}
