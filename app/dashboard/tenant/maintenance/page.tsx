import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import MaintenanceTable from "@/components/maintenance/maintenance-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

async function getTenantData(userId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { userId },
    include: {
      unit: {
        include: {
          property: true,
        },
      },
    },
  });
  return tenant;
}

export default async function TenantMaintenancePage() {
  const user = await requireRole(["TENANT"]);

  const tenant = await getTenantData(user.id);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Maintenance Requests</h1>
          <p className="text-gray-500 mt-1">
            {tenant?.unit
              ? `Unit ${tenant.unit.unitNumber} at ${tenant.unit.property.name}`
              : "View and manage your maintenance requests"}
          </p>
        </div>
        {tenant?.unitId && (
          <Link href="/dashboard/tenant/maintenance/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </Link>
        )}
      </div>

      {!tenant?.unitId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-yellow-800">
            You don't have a unit assigned yet. Please contact the property manager.
          </p>
        </div>
      ) : (
        <MaintenanceTable unitId={tenant.unitId} showFilters={true} />
      )}
    </div>
  );
}
