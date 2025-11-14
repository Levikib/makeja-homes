import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Home, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default async function UnitDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

  const unit = await getUnit(params.id);

  if (!unit) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      VACANT: { variant: "secondary", label: "Vacant" },
      OCCUPIED: { variant: "default", label: "Occupied" },
      MAINTENANCE: { variant: "outline", label: "Maintenance" },
      RESERVED: { variant: "outline", label: "Reserved" },
    };
    const config = statusMap[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const stats = unit.stats || {};

  return (
    <div className="container mx-auto py-6 px-4">
      <Link
        href={`/dashboard/properties/${unit.property.id}`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to {unit.property.name}
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Unit {unit.unitNumber}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Link
              href={`/dashboard/properties/${unit.property.id}`}
              className="text-gray-600 hover:underline"
            >
              {unit.property.name}
            </Link>
            <span className="text-gray-400">•</span>
            {getStatusBadge(unit.status)}
          </div>
        </div>
        <Link href={`/dashboard/units/${unit.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Unit
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {unit.rentAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              KSh {stats.totalPaymentsReceived?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalPaymentsCount || 0} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              KSh {stats.pendingPaymentsAmount?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.pendingPaymentsCount || 0} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deposit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {unit.depositAmount?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unit Details */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="tenant">Current Tenant</TabsTrigger>
          <TabsTrigger value="leases">Lease History</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unit Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Unit Type
                  </label>
                  <p className="mt-1">
                    {unit.type === "TENANCY"
                      ? "Residential"
                      : unit.type === "STAFF"
                      ? "Staff"
                      : "Commercial"}
                  </p>
                </div>

                {unit.floor && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Floor
                    </label>
                    <p className="mt-1">{unit.floor}</p>
                  </div>
                )}

                {unit.bedrooms !== null && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Bedrooms
                    </label>
                    <p className="mt-1">{unit.bedrooms}</p>
                  </div>
                )}

                {unit.bathrooms !== null && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Bathrooms
                    </label>
                    <p className="mt-1">{unit.bathrooms}</p>
                  </div>
                )}

                {unit.squareFootage && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Square Footage
                    </label>
                    <p className="mt-1">{unit.squareFootage} sq ft</p>
                  </div>
                )}
              </div>

              {unit.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Description
                  </label>
                  <p className="mt-1">{unit.description}</p>
                </div>
              )}

              {unit.features && unit.features.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Features
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {unit.features.map((feature: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant">
          <Card>
            <CardHeader>
              <CardTitle>Current Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              {unit.currentTenant ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Name
                      </label>
                      <p className="mt-1">
                        {unit.currentTenant.user.firstName}{" "}
                        {unit.currentTenant.user.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <p className="mt-1">{unit.currentTenant.user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Phone
                      </label>
                      <p className="mt-1">
                        {unit.currentTenant.user.phoneNumber || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Move-in Date
                      </label>
                      <p className="mt-1">
                        {unit.currentTenant.moveInDate
                          ? new Date(
                              unit.currentTenant.moveInDate
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Home className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No current tenant</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leases">
          <Card>
            <CardHeader>
              <CardTitle>Lease History</CardTitle>
            </CardHeader>
            <CardContent>
              {unit.leases && unit.leases.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Monthly Rent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unit.leases.map((lease: any) => (
                      <TableRow key={lease.id}>
                        <TableCell>
                          {lease.tenant.user.firstName}{" "}
                          {lease.tenant.user.lastName}
                        </TableCell>
                        <TableCell>
                          {new Date(lease.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(lease.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          KSh {lease.monthlyRent.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              lease.status === "ACTIVE"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {lease.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No lease history
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {unit.payments && unit.payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unit.payments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {payment.tenant.user.firstName}{" "}
                          {payment.tenant.user.lastName}
                        </TableCell>
                        <TableCell>{payment.paymentType}</TableCell>
                        <TableCell>
                          KSh {payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "COMPLETED"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No payment history
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {unit.renovationRequests &&
              unit.renovationRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Estimated Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unit.renovationRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.title}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {request.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.priority === 1
                                ? "default"
                                : "secondary"
                            }
                          >
                            {request.priority === 1
                              ? "High"
                              : request.priority === 2
                              ? "Medium"
                              : "Low"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.status}</Badge>
                        </TableCell>
                        <TableCell>
                          KSh {request.estimatedCost?.toLocaleString() || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No maintenance requests
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
