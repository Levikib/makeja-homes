import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PropertyForm from "@/components/properties/property-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign } from "lucide-react";

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "MANAGER"]);

  const property = await prisma.properties.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      type: true,
      description: true,
      paystackActive: true,
      paystackSubaccountCode: true,
    },
  });

  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/properties">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
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
        
        {/* Link to Payment Settings */}
        <Link href={`/dashboard/admin/properties/${property.id}/payment-settings`}>
          <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Payment Settings
          </Button>
        </Link>
      </div>

      {/* Payment Status Notice */}
      {property.paystackActive && property.paystackSubaccountCode ? (
        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
          <p className="text-sm text-green-400 flex items-center gap-2">
            ✅ <strong>Paystack Payment Active</strong> - Tenants can pay online via M-Pesa, Card, or Bank Transfer
          </p>
        </div>
      ) : (
        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <p className="text-sm text-yellow-400">
            💡 <strong>Payment Configuration:</strong> To set up Paystack or manual payment methods, 
            click the <strong>"Payment Settings"</strong> button above after saving property details.
          </p>
        </div>
      )}

      {/* Property Form */}
      <PropertyForm mode="edit" property={property} />
    </div>
  );
}