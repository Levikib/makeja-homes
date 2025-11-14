import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import TenantForm from "@/components/tenants/tenant-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditTenantPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "MANAGER"]);

  const tenant = await prisma.tenant.findUnique({
    where: {
      id: params.id,
      deletedAt: null,
    },
    include: {
      user: true,
      unit: {
        include: {
          property: true,
        },
      },
    },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/admin/tenants/${tenant.id}`}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tenant Details
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Edit Tenant: {tenant.user.firstName} {tenant.user.lastName}
        </h1>
        <p className="text-gray-500 mt-1">
          Update tenant information and unit assignment
        </p>
      </div>

      <TenantForm tenant={tenant} mode="edit" />
    </div>
  );
}
