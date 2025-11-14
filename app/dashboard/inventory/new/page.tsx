import { requireRole } from "@/lib/auth-helpers";
import InventoryForm from "@/components/inventory/inventory-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewInventoryPage() {
  // Only ADMIN and STOREKEEPER can create
  await requireRole(["ADMIN", "STOREKEEPER"]);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <Link
        href="/dashboard/inventory"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Inventory
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Add New Inventory Item</h1>
        <p className="text-gray-500 mt-1">
          Add a new item to your maintenance and renovation supplies
        </p>
      </div>

      <InventoryForm />
    </div>
  );
}
