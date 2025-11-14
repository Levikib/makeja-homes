import { requireRole } from "@/lib/auth-helpers";
import InventoryForm from "@/components/inventory/inventory-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getInventoryItem(id: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/inventory/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return null;
  }
}

export default async function EditInventoryPage({
  params,
}: {
  params: { id: string };
}) {
  // Only ADMIN and STOREKEEPER can edit
  await requireRole(["ADMIN", "STOREKEEPER"]);

  const item = await getInventoryItem(params.id);

  if (!item) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <Link
        href={`/dashboard/inventory/${params.id}`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Item
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Inventory Item</h1>
        <p className="text-gray-500 mt-1">Update item information</p>
      </div>

      <InventoryForm itemId={params.id} initialData={item} />
    </div>
  );
}
