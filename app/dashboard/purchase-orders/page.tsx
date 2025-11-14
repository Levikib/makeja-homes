import { requireRole } from "@/lib/auth-helpers";
import PurchaseOrdersTable from "@/components/purchase-orders/purchase-orders-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function PurchaseOrdersPage() {
  // ADMIN and STOREKEEPER can access
  await requireRole(["ADMIN", "STOREKEEPER"]);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-gray-500 mt-1">
            Manage inventory purchase orders and track deliveries
          </p>
        </div>
        <Link href="/dashboard/purchase-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Order
          </Button>
        </Link>
      </div>

      <PurchaseOrdersTable />
    </div>
  );
}
