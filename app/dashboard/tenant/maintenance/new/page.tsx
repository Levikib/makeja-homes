import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import MaintenanceForm from "@/components/maintenance/maintenance-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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

export default async function TenantNewMaintenancePage() {
  const user = await requireRole(["TENANT"]);

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
          Unit {tenant.unit?.unitNumber} at {tenant.unit?.property.name}
        </p>
      </div>

      <MaintenanceForm
        userRole="TENANT"
        userUnitId={tenant.unitId}
      />
    </div>
  );
}
