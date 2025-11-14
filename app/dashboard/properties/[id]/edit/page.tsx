import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import PropertyForm from "@/components/properties/property-form";

interface EditPropertyPageProps {
  params: {
    id: string;
  };
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  await requireRole(["ADMIN", "MANAGER"]);

  const property = await prisma.property.findUnique({
    where: { id: params.id },
  });

  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Property</h1>
        <p className="text-gray-500 mt-1">
          Update property information and details
        </p>
      </div>

      <PropertyForm property={property} mode="edit" />
    </div>
  );
}
