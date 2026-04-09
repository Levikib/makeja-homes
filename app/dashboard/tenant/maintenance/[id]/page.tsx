"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wrench, Clock, CheckCircle, AlertTriangle, X, ArrowLeft,
  User, Calendar, Tag, FileText, Loader2
} from "lucide-react";

type MaintenanceStatus = "PENDING" | "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "AWAITING_PARTS" | "COMPLETED" | "CLOSED" | "CANCELLED";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  priority: Priority;
  category: string | null;
  status: MaintenanceStatus;
  estimatedCost: number | null;
  actualCost: number | null;
  completionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  assignedFirstName: string | null;
  assignedLastName: string | null;
}

const statusConfig: Record<MaintenanceStatus, { label: string; color: string; icon: React.ReactNode; step: number }> = {
  PENDING:        { label: "Pending Review",  color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",   icon: <Clock className="h-4 w-4" />,         step: 0 },
  OPEN:           { label: "Approved",        color: "bg-blue-500/10 text-blue-400 border-blue-500/30",         icon: <CheckCircle className="h-4 w-4" />,    step: 1 },
  ASSIGNED:       { label: "Assigned",        color: "bg-blue-500/10 text-blue-400 border-blue-500/30",         icon: <User className="h-4 w-4" />,           step: 2 },
  IN_PROGRESS:    { label: "In Progress",     color: "bg-purple-500/10 text-purple-400 border-purple-500/30",   icon: <Wrench className="h-4 w-4" />,         step: 3 },
  AWAITING_PARTS: { label: "Awaiting Parts",  color: "bg-orange-500/10 text-orange-400 border-orange-500/30",  icon: <AlertTriangle className="h-4 w-4" />,  step: 3 },
  COMPLETED:      { label: "Completed",       color: "bg-green-500/10 text-green-400 border-green-500/30",      icon: <CheckCircle className="h-4 w-4" />,    step: 4 },
  CLOSED:         { label: "Closed",          color: "bg-gray-500/10 text-gray-400 border-gray-500/30",         icon: <CheckCircle className="h-4 w-4" />,    step: 4 },
  CANCELLED:      { label: "Cancelled",       color: "bg-red-500/10 text-red-400 border-red-500/30",            icon: <X className="h-4 w-4" />,              step: -1 },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  LOW:    { label: "Low",    color: "text-gray-400" },
  MEDIUM: { label: "Medium", color: "text-yellow-400" },
  HIGH:   { label: "High",   color: "text-orange-400" },
  URGENT: { label: "Urgent", color: "text-red-400" },
};

const timelineSteps = [
  { label: "Submitted",   step: 0 },
  { label: "Approved",    step: 1 },
  { label: "Assigned",    step: 2 },
  { label: "In Progress", step: 3 },
  { label: "Completed",   step: 4 },
];

export default function TenantMaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/tenant/maintenance/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.request) setRequest(data.request);
        else setError(data.error || "Request not found");
      })
      .catch(() => setError("Failed to load request"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error || "Request not found"}
        </div>
      </div>
    );
  }

  const status = statusConfig[request.status] ?? statusConfig.PENDING;
  const priority = priorityConfig[request.priority] ?? priorityConfig.MEDIUM;
  const isCancelled = request.status === "CANCELLED";
  const currentStep = status.step;
  const assignedName = request.assignedFirstName
    ? `${request.assignedFirstName} ${request.assignedLastName ?? ""}`.trim()
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard/tenant/maintenance")}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Maintenance
      </button>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{request.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{request.requestNumber}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium shrink-0 ${status.color}`}>
            {status.icon}
            {status.label}
          </div>
        </div>
      </div>

      {/* Progress Timeline */}
      {!isCancelled && (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between relative">
              {/* connector line */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-700 z-0" />
              {timelineSteps.map((ts, i) => {
                const done = currentStep >= ts.step;
                const active = currentStep === ts.step;
                return (
                  <div key={i} className="flex flex-col items-center gap-2 z-10 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                      ${done
                        ? "bg-purple-600 border-purple-600 text-white"
                        : "bg-gray-800 border-gray-600 text-gray-500"
                      } ${active ? "ring-2 ring-purple-400/50" : ""}`}
                    >
                      {done ? <CheckCircle className="h-4 w-4" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                    <span className={`text-xs text-center leading-tight ${done ? "text-purple-300" : "text-gray-500"}`}>
                      {ts.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isCancelled && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <X className="h-4 w-4 shrink-0" />
          This request was not accepted.
          {request.completionNotes && <span className="ml-1 text-gray-400">{request.completionNotes}</span>}
        </div>
      )}

      {/* Details */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-400" />
            Request Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">DESCRIPTION</p>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{request.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1"><Tag className="h-3 w-3" /> CATEGORY</p>
              <p className="text-gray-300 text-sm capitalize">{request.category?.replace(/_/g, " ") || "General"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">PRIORITY</p>
              <p className={`text-sm font-medium ${priority.color}`}>{priority.label}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> SUBMITTED</p>
              <p className="text-gray-300 text-sm">
                {new Date(request.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            {assignedName && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1"><User className="h-3 w-3" /> ASSIGNED TO</p>
                <p className="text-gray-300 text-sm">{assignedName}</p>
              </div>
            )}
            {request.completedAt && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">COMPLETED</p>
                <p className="text-gray-300 text-sm">
                  {new Date(request.completedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completion Notes */}
      {request.completionNotes && !isCancelled && (
        <Card className="bg-green-500/5 border-green-500/30">
          <CardContent className="pt-5">
            <p className="text-xs text-green-400 font-medium mb-2">COMPLETION NOTES</p>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{request.completionNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Pending help text */}
      {!["COMPLETED", "CLOSED", "CANCELLED"].includes(request.status) && (
        <p className="text-gray-500 text-xs text-center">
          Your request is being processed. You'll receive an email when the status changes.
        </p>
      )}
    </div>
  );
}
