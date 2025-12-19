import { requireRole } from "@/lib/auth-helpers";
import PropertyForm from "@/components/properties/property-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewPropertyPage() {
  await requireRole(["ADMIN", "MANAGER"]);

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
            Add New Property
          </h1>
          <p className="text-gray-400 mt-1">
            Create a new property in the system
          </p>
        </div>
      </div>

      <PropertyForm mode="create" />
    </div>
  );
}
