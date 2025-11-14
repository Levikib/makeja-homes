import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MaintenanceWorkflowButtons from "@/components/maintenance/maintenance-workflow-buttons";

async function getMaintenanceRequest(id: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/maintenance/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching maintenance request:", error);
    return null;
  }
}

export default async function MaintenanceDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole(["ADMIN", "MANAGER", "TECHNICAL", "CARETAKER", "TENANT"]);

  const request = await getMaintenanceRequest(params.id);

  if (!request) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: "outline", label: "Pending" },
      APPROVED: { variant: "secondary", label: "Approved" },
      IN_PROGRESS: { variant: "default", label: "In Progress" },
      COMPLETED: { variant: "default", label: "Completed" },
      CANCELLED: { variant: "outline", label: "Cancelled" },
    };
    const config = statusMap[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: number) => {
    const priorityMap: Record<number, { variant: any; label: string }> = {
      1: { variant: "destructive", label: "High" },
      2: { variant: "default", label: "Medium" },
      3: { variant: "secondary", label: "Low" },
    };
    const config = priorityMap[priority] || { variant: "secondary", label: "Unknown" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <Link
        href={user.role === "TENANT" ? "/dashboard/tenant/maintenance" : "/dashboard/maintenance"}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Maintenance
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{request.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(request.status)}
            {getPriorityBadge(request.priority)}
          </div>
        </div>

        {user.role !== "TENANT" && (
          <MaintenanceWorkflowButtons
            requestId={request.id}
            status={request.status}
            userRole={user.role}
          />
        )}
      </div>

      {/* Request Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Unit</label>
              <p className="mt-1">
                <Link
                  href={`/dashboard/units/${request.unit.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {request.unit.unitNumber}
                </Link>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Property</label>
              <p className="mt-1">
                <Link
                  href={`/dashboard/properties/${request.unit.property.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {request.unit.property.name}
                </Link>
              </p>
              <p className="text-sm text-gray-500">{request.unit.property.address}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="mt-1 whitespace-pre-wrap">{request.description}</p>
            </div>

            {request.notes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="mt-1 whitespace-pre-wrap">{request.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>People & Costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Requested By</label>
              <p className="mt-1">
                {request.createdBy.firstName} {request.createdBy.lastName}
              </p>
              <p className="text-sm text-gray-500">{request.createdBy.role}</p>
            </div>

            {request.approvedBy && (
              <div>
                <label className="text-sm font-medium text-gray-500">Approved By</label>
                <p className="mt-1">
                  {request.approvedBy.firstName} {request.approvedBy.lastName}
                </p>
                {request.approvedAt && (
                  <p className="text-sm text-gray-500">
                    {new Date(request.approvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {request.unit.currentTenant && (
              <div>
                <label className="text-sm font-medium text-gray-500">Current Tenant</label>
                <p className="mt-1">
                  {request.unit.currentTenant.user.firstName}{" "}
                  {request.unit.currentTenant.user.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  {request.unit.currentTenant.user.email}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Estimated Cost
                </label>
                <p className="mt-1 text-lg font-semibold">
                  {request.estimatedCost
                    ? `KSh${request.estimatedCost.toLocaleString()}`
                    : "Not specified"}
                </p>
              </div>

              {request.actualCost && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Actual Cost
                  </label>
                  <p className="mt-1 text-lg font-semibold">
                    KSh{request.actualCost.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="mt-1">
                {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>

            {request.requestedStartDate && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Requested Start
                </label>
                <p className="mt-1">
                  {new Date(request.requestedStartDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {request.actualStartDate && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Actual Start
                </label>
                <p className="mt-1">
                  {new Date(request.actualStartDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {request.requestedEndDate && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Requested End
                </label>
                <p className="mt-1">
                  {new Date(request.requestedEndDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {request.actualEndDate && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Actual End
                </label>
                <p className="mt-1">
                  {new Date(request.actualEndDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      {(request.beforeImages?.length > 0 || request.afterImages?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {request.beforeImages && request.beforeImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Before Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {request.beforeImages.map((img: string, index: number) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-gray-400">Image {index + 1}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {request.afterImages && request.afterImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>After Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {request.afterImages.map((img: string, index: number) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-gray-400">Image {index + 1}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
