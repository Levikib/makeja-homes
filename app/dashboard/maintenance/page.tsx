import { requireRole } from "@/lib/auth-helpers";
import MaintenanceTable from "@/components/maintenance/maintenance-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function MaintenancePage() {
  // ADMIN, MANAGER, TECHNICAL, and CARETAKER can access this page
  await requireRole(["ADMIN", "MANAGER", "TECHNICAL", "CARETAKER"]);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Requests</h1>
          <p className="text-gray-500 mt-1">
            View and manage all maintenance and renovation requests
          </p>
        </div>
        <Link href="/dashboard/maintenance/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      <MaintenanceTable showFilters={true} />
    </div>
  );
}
