import { requireRole } from "@/lib/auth-helpers";
import PropertyForm from "@/components/properties/property-form";

export default async function NewPropertyPage() {
  await requireRole(["ADMIN", "MANAGER"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Property</h1>
        <p className="text-gray-500 mt-1">
          Create a new property/building in the system
        </p>
      </div>

      <PropertyForm mode="create" />
    </div>
  );
}
