"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Wrench,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Play,
  Pause,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  completionNotes: string | null;
  createdAt: Date;
  completedAt: Date | null;
  unit: {
    id: string;
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
    tenant: {
      user: {
        firstName: string;
        lastName: string;
      };
    } | null;
  };
  createdBy: {
    firstName: string;
    lastName: string;
    role: string;
  };
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

interface Property {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface MaintenanceTableProps {
  requests: MaintenanceRequest[];
  properties: Property[];
  staff: Staff[];
}

export default function MaintenanceTable({
  requests,
  properties,
  staff,
}: MaintenanceTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  // Filter requests with safety checks
  const filteredRequests = useMemo(() => {
    // Safety check - if requests is undefined or not an array, return empty array
    if (!requests || !Array.isArray(requests)) {
      return [];
    }

    return requests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }

      if (priorityFilter !== "all" && request.priority !== priorityFilter) {
        return false;
      }

      if (propertyFilter !== "all" && request.unit.property.id !== propertyFilter) {
        return false;
      }

      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned" && request.assignedTo) {
          return false;
        } else if (assigneeFilter !== "unassigned" && request.assignedTo?.id !== assigneeFilter) {
          return false;
        }
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNumber = request.requestNumber.toLowerCase().includes(query);
        const matchesTitle = request.title.toLowerCase().includes(query);
        const matchesUnit = request.unit.unitNumber.toLowerCase().includes(query);
        const matchesProperty = request.unit.property.name.toLowerCase().includes(query);

        if (!matchesNumber && !matchesTitle && !matchesUnit && !matchesProperty) {
          return false;
        }
      }

      return true;
    });
  }, [requests, searchQuery, statusFilter, priorityFilter, propertyFilter, assigneeFilter]);

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
      case "CANCELLED":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "ASSIGNED":
        return <UserPlus className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <Play className="h-4 w-4" />;
      case "AWAITING_PARTS":
        return <Pause className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "CLOSED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleAssign = async (requestId: string, staffId: string) => {
    try {
      const response = await fetch(`/api/maintenance/${requestId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: staffId }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to assign request");
      }
    } catch (error) {
      console.error("Failed to assign request:", error);
      alert("Failed to assign request");
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/maintenance/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status");
    }
  };

  const handleDelete = async (requestId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/maintenance/${requestId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete request");
      }
    } catch (error) {
      console.error("Failed to delete request:", error);
      alert("Failed to delete request");
    }
  };

  // Stats with safety checks
  const totalRequests = requests?.length || 0;
  const pendingRequests = requests?.filter((r) => r.status === "PENDING").length || 0;
  const inProgressRequests = requests?.filter((r) => r.status === "IN_PROGRESS").length || 0;
  const completedRequests = requests?.filter((r) => r.status === "COMPLETED" || r.status === "CLOSED").length || 0;

  return (
    <div className="space-y-8 p-8 min-h-screen relative">
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold gradient-text mb-2 flex items-center gap-3">
              <Wrench className="h-12 w-12 text-purple-500 animate-pulse" />
              Maintenance Requests
            </h1>
            <p className="text-gray-400 text-lg">
              Track and manage property maintenance
            </p>
          </div>
          <Link href="/dashboard/admin/maintenance/new">
            <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all flex items-center gap-2 shadow-lg">
              <Plus className="h-5 w-5" />
              <span className="font-medium">New Request</span>
            </button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Total Requests</p>
              <Wrench className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{totalRequests}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Pending</p>
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-yellow-400">{pendingRequests}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">In Progress</p>
              <Play className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-purple-400">{inProgressRequests}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Completed</p>
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-green-400">{completedRequests}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900/50 border-purple-500/20 text-white"
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="AWAITING_PARTS">Awaiting Parts</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20">
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Property Filter */}
            <div>
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20">
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties && Array.isArray(properties) && properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Filter */}
            <div>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20">
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {staff && Array.isArray(staff) && staff.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-400">
            Showing {filteredRequests.length} of {totalRequests} requests
          </div>
        </div>

        {/* Requests Grid */}
        {filteredRequests.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Wrench className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">
              No Maintenance Requests Found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first maintenance request"}
            </p>
            {!searchQuery && statusFilter === "all" && priorityFilter === "all" && (
              <Link href="/dashboard/admin/maintenance/new">
                <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all inline-flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Request
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRequests.map((request, index) => (
              <div
                key={request.id}
                className="glass-card p-6 hover:scale-105 transition-all relative"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Priority Badge - Top Right */}
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getPriorityColor(
                      request.priority
                    )}`}
                  >
                    {request.priority === "URGENT" && <AlertTriangle className="h-3 w-3" />}
                    {request.priority}
                  </span>
                </div>

                {/* Header */}
                <div className="mb-4 pr-20">
                  <div className="text-xs text-gray-400 mb-1">{request.requestNumber}</div>
                  <h3 className="text-xl font-bold text-white mb-1">{request.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2">{request.description}</p>
                </div>

                {/* Property & Unit */}
                <div className="mb-4 pb-4 border-b border-purple-500/20">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="font-medium">{request.unit.property.name}</span>
                    <span className="text-gray-500">•</span>
                    <span>Unit {request.unit.unitNumber}</span>
                  </div>
                  {request.unit.tenant && (
                    <div className="text-xs text-gray-400 mt-1">
                      Tenant: {request.unit.tenant.user.firstName} {request.unit.tenant.user.lastName}
                    </div>
                  )}
                </div>

                {/* Status & Assignment */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {getStatusIcon(request.status)}
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Assigned To</p>
                    {request.assignedTo ? (
                      <div className="text-sm text-gray-300">
                        {request.assignedTo.firstName} {request.assignedTo.lastName}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">Unassigned</div>
                    )}
                  </div>
                </div>

                {/* Cost Info */}
                {(request.estimatedCost || request.actualCost) && (
                  <div className="mb-4 pb-4 border-b border-purple-500/20">
                    <div className="flex items-center gap-4 text-sm">
                      {request.estimatedCost && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <DollarSign className="h-4 w-4" />
                          Est: KSH {request.estimatedCost.toLocaleString()}
                        </div>
                      )}
                      {request.actualCost && (
                        <div className="flex items-center gap-1 text-green-400">
                          <DollarSign className="h-4 w-4" />
                          Actual: KSH {request.actualCost.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/admin/maintenance/${request.id}`} className="flex-1">
                    <button className="w-full px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors text-sm font-medium text-purple-300 flex items-center justify-center gap-2">
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </Link>

                  {request.status === "PENDING" && !request.assignedTo && staff && Array.isArray(staff) && staff.length > 0 && (
                    <div className="flex-1">
                      <Select
                        onValueChange={(value) => handleAssign(request.id, value)}
                      >
                        <SelectTrigger className="w-full bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30">
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-purple-500/20">
                          {staff.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.firstName} {person.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {request.status === "ASSIGNED" && (
                    <button
                      onClick={() => handleStatusUpdate(request.id, "IN_PROGRESS")}
                      className="flex-1 px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors text-sm font-medium text-purple-300 flex items-center justify-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </button>
                  )}

                  {request.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => handleStatusUpdate(request.id, "COMPLETED")}
                      className="flex-1 px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors text-sm font-medium text-green-300 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Complete
                    </button>
                  )}

                  <Link href={`/dashboard/admin/maintenance/${request.id}/edit`}>
                    <button className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors">
                      <Edit className="h-4 w-4 text-blue-300" />
                    </button>
                  </Link>

                  <button
                    onClick={() => handleDelete(request.id, request.title)}
                    className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-red-300" />
                  </button>
                </div>

                {/* Created Info */}
                <div className="mt-4 pt-4 border-t border-purple-500/20 text-xs text-gray-500">
                  Created by {request.createdBy.firstName} {request.createdBy.lastName} on{" "}
                  {new Date(request.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
