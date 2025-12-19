import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PropertyForm from "@/components/properties/property-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "MANAGER"]);

  const property = await prisma.properties.findUnique({
    where: { id: params.id },
  });

  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/properties">
          <Button variant="ghost" size="sm" className="text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
            Edit Property
          </h1>
          <p className="text-gray-400 mt-1">
            Update {property.name} details
          </p>
        </div>
      </div>

      <PropertyForm mode="edit" property={property} />
    </div>
  );
}
