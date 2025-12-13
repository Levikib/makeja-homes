import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Wrench,
  Building2,
  Home,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react";

export default async function MaintenanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["ADMIN", "MANAGER", "CARETAKER", "TENANT"]);

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: params.id },
    include: {
      unit: {
        include: {
          property: true,
          tenant: {
            include: {
              user: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          phoneNumber: true,
          email: true,
        },
      },
    },
  });

  if (!request) {
    notFound();
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "HIGH":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "LOW":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "ASSIGNED":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "IN_PROGRESS":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "AWAITING_PARTS":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "COMPLETED":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "CLOSED":
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  return (
    <div className="space-y-8 p-8 min-h-screen relative">
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div>
          <Link
            href="/dashboard/admin/maintenance"
            className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Maintenance
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-gray-400 mb-2">{request.requestNumber}</div>
              <h1 className="text-4xl font-bold gradient-text mb-3">{request.title}</h1>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                    request.priority
                  )}`}
                >
                  {request.priority === "URGENT" && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                  {request.priority}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    request.status
                  )}`}
                >
                  {request.status.replace(/_/g, " ")}
                </span>
                {request.category && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {request.category}
                  </span>
                )}
              </div>
            </div>
            <Link href={`/dashboard/admin/maintenance/${request.id}/edit`}>
              <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Request
              </button>
            </Link>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="h-6 w-6 text-purple-400" />
                Description
              </h2>
              <p className="text-gray-300 whitespace-pre-wrap">{request.description}</p>
            </div>

            {/* Location */}
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Building2 className="h-6 w-6 text-purple-400" />
                Location
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Property</p>
                  <Link
                    href={`/dashboard/properties/${request.unit.property.id}`}
                    className="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    {request.unit.property.name}
                  </Link>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Unit</p>
                  <p className="text-white font-medium">Unit {request.unit.unitNumber}</p>
                </div>

                {request.unit.tenant && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Tenant</p>
                    <Link
                      href={`/dashboard/admin/tenants/${request.unit.tenant.id}`}
                      className="text-purple-400 hover:text-purple-300 font-medium"
                    >
                      {request.unit.tenant.user.firstName} {request.unit.tenant.user.lastName}
                    </Link>
                    <p className="text-sm text-gray-400 mt-1">
                      {request.unit.tenant.user.email}
                    </p>
                    {request.unit.tenant.user.phoneNumber && (
                      <p className="text-sm text-gray-400">
                        {request.unit.tenant.user.phoneNumber}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Completion Notes */}
            {request.completionNotes && (
              <div className="glass-card p-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  Completion Notes
                </h2>
                <p className="text-gray-300 whitespace-pre-wrap">{request.completionNotes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Metadata */}
          <div className="space-y-6">
            {/* Assignment */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-purple-400" />
                Assignment
              </h2>

              {request.assignedTo ? (
                <div>
                  <p className="font-medium text-white">
                    {request.assignedTo.firstName} {request.assignedTo.lastName}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">{request.assignedTo.role}</p>
                  {request.assignedTo.email && (
                    <p className="text-sm text-gray-400 mt-2">{request.assignedTo.email}</p>
                  )}
                  {request.assignedTo.phoneNumber && (
                    <p className="text-sm text-gray-400">{request.assignedTo.phoneNumber}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Not yet assigned</p>
              )}
            </div>

            {/* Dates */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-400" />
                Timeline
              </h2>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Created</p>
                  <p className="text-white">
                    {new Date(request.createdAt).toLocaleDateString()} at{" "}
                    {new Date(request.createdAt).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    by {request.createdBy.firstName} {request.createdBy.lastName}
                  </p>
                </div>

                {request.completedAt && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Completed</p>
                    <p className="text-green-400">
                      {new Date(request.completedAt).toLocaleDateString()} at{" "}
                      {new Date(request.completedAt).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Cost */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-400" />
                Cost
              </h2>

              <div className="space-y-3">
                {request.estimatedCost && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Estimated</p>
                    <p className="text-yellow-400 text-lg font-bold">
                      KSH {request.estimatedCost.toLocaleString()}
                    </p>
                  </div>
                )}

                {request.actualCost && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Actual</p>
                    <p className="text-green-400 text-lg font-bold">
                      KSH {request.actualCost.toLocaleString()}
                    </p>
                  </div>
                )}

                {!request.estimatedCost && !request.actualCost && (
                  <p className="text-gray-400">No cost information</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
