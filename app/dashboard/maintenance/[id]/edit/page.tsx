import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import MaintenanceForm from "@/components/maintenance/maintenance-form";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";

export default async function EditMaintenancePage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

  const request = await prisma.maintenance_requests.findUnique({
    where: { id: params.id },
    include: {
      unit: {
        include: {
          property: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!request) {
    notFound();
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link
          href="/dashboard/admin/maintenance"
          className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Maintenance
        </Link>
        <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
          <Edit className="h-10 w-10 text-purple-500" />
          Edit Maintenance Request
        </h1>
        <p className="text-gray-400 text-lg">{request.requestNumber}</p>
      </div>

      <MaintenanceForm request={request} mode="edit" />
    </div>
  );
}
