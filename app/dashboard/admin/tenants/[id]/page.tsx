import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/currency";
import Link from "next/link";
import { ArrowLeft, Edit, Mail, Phone, MapPin, Briefcase, User, AlertCircle } from "lucide-react";

export default async function TenantDetailsPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "MANAGER"]);

  const tenant = await prisma.tenant.findUnique({
    where: {
      id: params.id,
      deletedAt: null,
    },
    include: {
      user: true,
      unit: {
        include: {
          property: true,
        },
      },
      leases: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
        },
      },
      payments: {
        where: { deletedAt: null },
        orderBy: { paymentDate: "desc" },
        take: 10,
      },
    },
  });

  if (!tenant) {
    notFound();
  }

  // Calculate stats
  const totalPaid = await prisma.payment.aggregate({
    where: {
      tenantId: tenant.id,
      status: "COMPLETED",
      deletedAt: null,
    },
    _sum: { amount: true },
  });

  const pendingPayments = await prisma.payment.aggregate({
    where: {
      tenantId: tenant.id,
      status: "PENDING",
      deletedAt: null,
    },
    _sum: { amount: true },
  });

  const isActive = tenant.unit && !tenant.moveOutDate;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin/tenants"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tenants
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {tenant.user.firstName} {tenant.user.lastName}
            </h1>
            <p className="text-gray-500 mt-1">
              Tenant ID: {tenant.id.slice(0, 8)}...
            </p>
          </div>
          <div className="flex gap-2">
            {isActive ? (
              <Badge variant="default" className="bg-green-600">Active</Badge>
            ) : tenant.moveOutDate ? (
              <Badge variant="secondary">Moved Out</Badge>
            ) : (
              <Badge variant="outline">No Unit</Badge>
            )}
            <Link href={`/dashboard/admin/tenants/${tenant.id}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Current Unit</CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.unit ? (
              <div>
                <div className="text-2xl font-bold">{tenant.unit.unitNumber}</div>
                <p className="text-xs text-gray-500">{tenant.unit.property.name}</p>
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-400">-</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid._sum.amount?.toNumber() || 0)}
            </div>
            <p className="text-xs text-gray-500">{tenant.payments.length} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(pendingPayments._sum.amount?.toNumber() || 0)}
            </div>
            <p className="text-xs text-gray-500">Outstanding balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Move-in Date</CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.moveInDate ? (
              <div>
                <div className="text-2xl font-bold">
                  {new Date(tenant.moveInDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(tenant.moveInDate).toLocaleDateString('en-KE', { year: 'numeric' })}
                </p>
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-400">-</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="leases">Leases ({tenant.leases.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({tenant.payments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-gray-600">{tenant.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-gray-600">{tenant.user.phoneNumber}</p>
                  </div>
                </div>
                {tenant.unit && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Current Address</p>
                      <p className="text-sm text-gray-600">
                        {tenant.unit.property.name} - {tenant.unit.unitNumber}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tenant.nationalId && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">National ID</p>
                      <p className="text-sm text-gray-600">{tenant.nationalId}</p>
                    </div>
                  </div>
                )}
                {tenant.dateOfBirth && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Date of Birth</p>
                      <p className="text-sm text-gray-600">
                        {new Date(tenant.dateOfBirth).toLocaleDateString('en-KE')}
                      </p>
                    </div>
                  </div>
                )}
                {tenant.occupation && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Occupation</p>
                      <p className="text-sm text-gray-600">{tenant.occupation}</p>
                      {tenant.employer && (
                        <p className="text-xs text-gray-500">at {tenant.employer}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {tenant.emergencyContactName && (
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{tenant.emergencyContactName}</p>
                      {tenant.emergencyContactRelation && (
                        <p className="text-xs text-gray-500">{tenant.emergencyContactRelation}</p>
                      )}
                    </div>
                  </div>
                  {tenant.emergencyContactPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-600">{tenant.emergencyContactPhone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="leases">
          <Card>
            <CardHeader>
              <CardTitle>Lease History</CardTitle>
              <CardDescription>All leases for this tenant</CardDescription>
            </CardHeader>
            <CardContent>
              {tenant.leases.length > 0 ? (
                <div className="space-y-3">
                  {tenant.leases.map((lease) => (
                    <div key={lease.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{lease.unit.property.name} - {lease.unit.unitNumber}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(lease.startDate).toLocaleDateString('en-KE')} - {new Date(lease.endDate).toLocaleDateString('en-KE')}
                        </p>
                      </div>
                      <Badge variant={lease.status === "ACTIVE" ? "default" : "secondary"}>
                        {lease.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No leases found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Recent payments from this tenant</CardDescription>
            </CardHeader>
            <CardContent>
              {tenant.payments.length > 0 ? (
                <div className="space-y-3">
                  {tenant.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount.toNumber())}</p>
                        <p className="text-sm text-gray-600">
                          {payment.paymentType} - {new Date(payment.paymentDate).toLocaleDateString('en-KE')}
                        </p>
                      </div>
                      <Badge variant={payment.status === "COMPLETED" ? "default" : "secondary"}>
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No payments found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
