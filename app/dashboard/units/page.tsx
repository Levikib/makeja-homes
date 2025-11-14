import { requireRole } from "@/lib/auth-helpers";
import UnitsTable from "@/components/units/units-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function UnitsPage() {
  // ADMIN, MANAGER, and CARETAKER can access this page
  await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">All Units</h1>
          <p className="text-gray-500 mt-1">
            View and manage all units across all properties
          </p>
        </div>
        <Link href="/dashboard/units/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
          </Button>
        </Link>
      </div>

      <UnitsTable />
    </div>
  );
}
