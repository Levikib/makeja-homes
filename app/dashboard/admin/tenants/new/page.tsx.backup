import { requireRole } from "@/lib/auth-helpers";
import TenantForm from "@/components/tenants/tenant-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewTenantPage() {
  await requireRole(["ADMIN", "MANAGER"]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin/tenants"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tenants
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add New Tenant</h1>
        <p className="text-gray-500 mt-1">
          Create a new tenant profile and assign to a unit
        </p>
      </div>

      <TenantForm mode="create" />
    </div>
  );
}
