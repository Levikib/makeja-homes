import { requireRole } from "@/lib/auth-helpers";
import UnitForm from "@/components/units/unit-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getUnit(id: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/units/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching unit:", error);
    return null;
  }
}

export default async function EditUnitPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["ADMIN", "MANAGER"]);

  const unit = await getUnit(params.id);

  if (!unit) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <Link
        href={`/dashboard/units/${params.id}`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Unit
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Unit</h1>
        <p className="text-gray-500 mt-1">Update unit information</p>
      </div>

      <UnitForm unitId={params.id} initialData={unit} />
    </div>
  );
}
