import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import MaintenanceForm from "@/components/maintenance/maintenance-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function getTenantData(userId: string) {
  const tenant = await prisma.tenants.findFirst({
    where: { userId },
    include: {
      units: {
        include: {
          properties: true,
        },
      },
    },
  });
  return tenant;
}

export default async function TenantNewMaintenancePage() {
  const userResult = await requireRole(["TENANT"]);

  const user = userResult!;
  const tenant = await getTenantData(user.id);

  if (!tenant?.unitId) {
    redirect("/dashboard/tenant/maintenance");
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <Link
        href="/dashboard/tenant/maintenance"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to My Requests
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Maintenance Request</h1>
        <p className="text-gray-500 mt-1">
          Submit a maintenance request for your unit
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Unit {tenant.units?.unitNumber ?? "N/A"} at {tenant.units?.properties?.name ?? ""}
        </p>
      </div>

      <MaintenanceForm
        mode="create"
        userRole="TENANT"
        userUnitId={tenant.unitId}
      />
    </div>
  );
}
