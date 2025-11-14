import { requireRole } from "@/lib/auth-helpers";
import LeaseForm from "@/components/leases/lease-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewLeasePage() {
  await requireRole(["ADMIN", "MANAGER"]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin/leases"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Leases
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create New Lease</h1>
        <p className="text-gray-500 mt-1">
          Create a lease agreement for a tenant and unit
        </p>
      </div>

      <LeaseForm />
    </div>
  );
}
