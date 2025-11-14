"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Eye, CheckCircle, XCircle, PlayCircle, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  unit: {
    unitNumber: string;
    property: {
      name: string;
    };
  };
  createdBy: {
    firstName: string;
    lastName: string;
    role: string;
  };
  approvedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface MaintenanceTableProps {
  unitId?: string;
  propertyId?: string;
  showFilters?: boolean;
}

export default function MaintenanceTable({
  unitId,
  propertyId,
  showFilters = true,
}: MaintenanceTableProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    fetchRequests();
  }, [unitId, propertyId, statusFilter, priorityFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let url = "/api/maintenance?";

      if (unitId) url += `unitId=${unitId}&`;
      if (propertyId) url += `propertyId=${propertyId}&`;
      if (statusFilter !== "all") url += `status=${statusFilter}&`;
      if (priorityFilter !== "all") url += `priority=${priorityFilter}&`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setRequests(data.data);
      } else {
        setError(data.error || "Failed to fetch maintenance requests");
      }
    } catch (err) {
      setError("An error occurred while fetching maintenance requests");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this request?")) return;

    try {
      const response = await fetch(`/api/maintenance/${id}/approve`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        fetchRequests();
      } else {
        alert(data.error || "Failed to approve request");
      }
    } catch (err) {
      alert("An error occurred while approving the request");
      console.error(err);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    try {
      const response = await fetch(`/api/maintenance/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (data.success) {
        fetchRequests();
      } else {
        alert(data.error || "Failed to reject request");
      }
    } catch (err) {
      alert("An error occurred while rejecting the request");
      console.error(err);
    }
  };

  const handleStart = async (id: string) => {
    if (!confirm("Start work on this maintenance request?")) return;

    try {
      const response = await fetch(`/api/maintenance/${id}/start`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        fetchRequests();
      } else {
        alert(data.error || "Failed to start request");
      }
    } catch (err) {
      alert("An error occurred while starting the request");
      console.error(err);
    }
  };

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500">Loading maintenance requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <Button onClick={fetchRequests} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex gap-4">
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="1">High</SelectItem>
                <SelectItem value="2">Medium</SelectItem>
                <SelectItem value="3">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No maintenance requests found
          </h3>
          <p className="text-gray-500 mb-4">
            {statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by creating a maintenance request"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Unit/Property</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Estimated Cost</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/maintenance/${request.id}`}
                      className="font-medium hover:underline"
                    >
                      {request.title}
                    </Link>
                    <div className="text-xs text-gray-500 mt-1 max-w-md truncate">
                      {request.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{request.unit.unitNumber}</div>
                      <div className="text-gray-500">{request.unit.property.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {request.createdBy.firstName} {request.createdBy.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {request.createdBy.role}
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.estimatedCost
                      ? `KSh ${request.estimatedCost.toLocaleString()}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/dashboard/maintenance/${request.id}`)
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {request.status === "PENDING" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleApprove(request.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleReject(request.id)}
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {request.status === "APPROVED" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleStart(request.id)}
                            >
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Start Work
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
