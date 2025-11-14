import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Home, User, FileText, DollarSign, Wrench, Calendar, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface UnitDetailsProps {
  params: {
    id: string;
    unitId: string;
  };
}

export default async function UnitDetailsPage({ params }: UnitDetailsProps) {
  await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

  const unit = await prisma.unit.findUnique({
    where: { id: params.unitId },
    include: {
      property: true,
      tenant: {
        include: {
          user: true,
          leases: {
            orderBy: { createdAt: "desc" },
            include: {
              payments: {
                orderBy: { paymentDate: "desc" },
              },
            },
          },
          payments: {
            orderBy: { paymentDate: "desc" },
            take: 10,
          },
        },
      },
      leases: {
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            include: {
              user: true,
            },
          },
        },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 10,
        include: {
          tenant: {
            include: {
              user: true,
            },
          },
        },
      },
      renovationRequests: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!unit) {
    notFound();
  }

  const activeLease = unit.leases.find((l) => l.status === "ACTIVE");
  const getStatusColor = (status: string) => {
    switch (status) {
      case "OCCUPIED":
        return "bg-green-100 text-green-800";
      case "VACANT":
        return "bg-gray-100 text-gray-800";
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800";
      case "RESERVED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/properties" className="hover:text-gray-700">
          Properties
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/properties/${unit.property.id}`}
          className="hover:text-gray-700"
        >
          {unit.property.name}
        </Link>
        <span>/</span>
        <span>Unit {unit.unitNumber}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Home className="h-8 w-8" />
            Unit {unit.unitNumber}
          </h1>
          <p className="text-gray-500 mt-1">{unit.property.name}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/properties/${unit.property.id}/units/${unit.id}/edit`}>
            <Button variant="outline">Edit Unit</Button>
          </Link>
          {!unit.tenant && unit.status === "VACANT" && (
            <Link href={`/dashboard/tenants/new?unitId=${unit.id}`}>
              <Button>Assign Tenant</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Unit Info Card */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4">Unit Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${getStatusColor(unit.status)}`}>
              {unit.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Type</p>
            <p className="font-medium mt-1">{unit.type.replace(/_/g, " ")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Floor</p>
            <p className="font-medium mt-1">{unit.floor || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Monthly Rent</p>
            <p className="font-medium mt-1">{formatCurrency(unit.rentAmount || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Deposit</p>
            <p className="font-medium mt-1">{formatCurrency(unit.depositAmount || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Bedrooms / Bathrooms</p>
            <p className="font-medium mt-1">{unit.bedrooms || 0} / {unit.bathrooms || 0}</p>
          </div>
        </div>

        {unit.description && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-1">Description</p>
            <p className="text-gray-700">{unit.description}</p>
          </div>
        )}

        {unit.features && unit.features.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">Features</p>
            <div className="flex flex-wrap gap-2">
              {unit.features.map((feature) => (
                <span
                  key={feature}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tenant Information */}
      {unit.tenant ? (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5" />
              Current Tenant
            </h2>
            <Link href={`/dashboard/tenants/${unit.tenant.id}`}>
              <Button variant="outline" size="sm">
                View Full Profile
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium mt-1">
                {unit.tenant.user.firstName} {unit.tenant.user.lastName}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium mt-1">{unit.tenant.user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium mt-1">{unit.tenant.user.phoneNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Move-in Date</p>
                <p className="font-medium mt-1">
                  {unit.tenant.moveInDate
                    ? new Date(unit.tenant.moveInDate).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <User className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Tenant Assigned</h3>
          <p className="text-yellow-700 mb-4">This unit is currently vacant</p>
          <Link href={`/dashboard/tenants/new?unitId=${unit.id}`}>
            <Button>Assign Tenant</Button>
          </Link>
        </div>
      )}

      {/* Active Lease */}
      {activeLease && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Active Lease
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Lease Number</p>
              <p className="font-medium mt-1">{activeLease.leaseNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium mt-1">
                {new Date(activeLease.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-medium mt-1">
                {new Date(activeLease.endDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Monthly Rent</p>
              <p className="font-medium mt-1">{formatCurrency(activeLease.monthlyRent)}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href={`/dashboard/leases/${activeLease.id}`}>
              <Button variant="outline" size="sm">
                View Full Lease
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Recent Payments
        </h2>
        {unit.payments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No payment history</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tenant</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {unit.payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.tenant.user.firstName} {payment.tenant.user.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm">{payment.paymentType}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Maintenance Requests */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Maintenance History
        </h2>
        {unit.renovationRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No maintenance requests</p>
        ) : (
          <div className="space-y-3">
            {unit.renovationRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{request.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    request.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                    request.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {request.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
