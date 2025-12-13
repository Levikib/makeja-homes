import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import UnitForm from "@/components/units/unit-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditUnitPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["ADMIN", "MANAGER"]);

  const unit = await prisma.unit.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      property: true,
    },
  });

  if (!unit) {
    notFound();
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link
          href={`/dashboard/properties/${unit.propertyId}`}
          className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Property
        </Link>
        <h1 className="text-3xl font-bold gradient-text">
          Edit Unit {unit.unitNumber}
        </h1>
        <p className="text-gray-400 mt-1">
          Update unit details for {unit.property.name}
        </p>
      </div>

      <UnitForm unit={unit} mode="edit" propertyId={unit.propertyId} />
    </div>
  );
}
