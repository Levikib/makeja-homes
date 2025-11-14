import { requireRole } from "@/lib/auth-helpers";
import UnitForm from "@/components/units/unit-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewUnitPage({
  searchParams,
}: {
  searchParams: { propertyId?: string };
}) {
  await requireRole(["ADMIN", "MANAGER"]);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <Link
        href={
          searchParams.propertyId
            ? `/dashboard/properties/${searchParams.propertyId}`
            : "/dashboard/units"
        }
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Add New Unit</h1>
        <p className="text-gray-500 mt-1">Create a new unit in the property</p>
      </div>

      <UnitForm propertyIdFromUrl={searchParams.propertyId} />
    </div>
  );
}
