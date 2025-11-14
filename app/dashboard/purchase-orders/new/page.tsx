import { requireRole } from "@/lib/auth-helpers";
import PurchaseOrderForm from "@/components/purchase-orders/purchase-order-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewPurchaseOrderPage() {
  // Only ADMIN and STOREKEEPER can create
  await requireRole(["ADMIN", "STOREKEEPER"]);

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <Link
        href="/dashboard/purchase-orders"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Purchase Orders
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Purchase Order</h1>
        <p className="text-gray-500 mt-1">
          Create a new order for inventory restocking
        </p>
      </div>

      <PurchaseOrderForm />
    </div>
  );
}
