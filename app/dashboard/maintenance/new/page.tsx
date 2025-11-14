import { requireRole } from "@/lib/auth-helpers";
import MaintenanceForm from "@/components/maintenance/maintenance-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewMaintenancePage({
  searchParams,
}: {
  searchParams: { unitId?: string };
}) {
  await requireRole(["ADMIN", "MANAGER", "TECHNICAL", "CARETAKER"]);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <Link
        href="/dashboard/maintenance"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Maintenance
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Maintenance Request</h1>
        <p className="text-gray-500 mt-1">
          Submit a new maintenance or renovation request
        </p>
      </div>

      <MaintenanceForm unitIdFromUrl={searchParams.unitId} />
    </div>
  );
}
