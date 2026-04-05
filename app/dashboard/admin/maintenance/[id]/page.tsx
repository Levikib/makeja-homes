"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

function getPriorityColor(p: string) {
  if (p === "URGENT" || p === "EMERGENCY") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (p === "HIGH") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (p === "MEDIUM") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-blue-500/20 text-blue-400 border-blue-500/30";
}

function getStatusColor(s: string) {
  if (s === "COMPLETED") return "bg-green-500/20 text-green-400";
  if (s === "IN_PROGRESS") return "bg-blue-500/20 text-blue-400";
  if (s === "PENDING") return "bg-yellow-500/20 text-yellow-400";
  return "bg-gray-500/20 text-gray-400";
}

export default function MaintenanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [req, setReq] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/maintenance/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setReq(data); setLoading(false); })
      .catch(() => { setLoading(false); router.push("/dashboard/admin/maintenance"); });
  }, [params.id]);

  if (loading) return <div className="text-white p-6">Loading...</div>;
  if (!req) return null;

  const unit = req.units ?? {};
  const prop = unit.properties ?? {};
  const tenants = unit.tenants ?? [];
  const createdBy = req.users_maintenance_requests_createdByIdTousers;
  const assignedTo = req.users_maintenance_requests_assignedToIdTousers;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/maintenance">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{req.title}</h1>
            <div className="flex gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(req.status)}`}>{req.status}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs border ${getPriorityColor(req.priority)}`}>{req.priority}</span>
            </div>
          </div>
        </div>
        <Link href={`/dashboard/admin/maintenance/${params.id}/edit`}>
          <Button className="bg-blue-600 hover:bg-blue-700">Edit</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
          <p className="text-gray-300">{req.description}</p>
          {req.category && <p className="text-gray-400 text-sm mt-2">Category: {req.category}</p>}
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Location</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-400">Property:</span> <span className="text-white ml-2">{prop.name}</span></div>
            <div><span className="text-gray-400">Unit:</span> <span className="text-white ml-2">{unit.unitNumber}</span></div>
            {tenants[0] && (
              <div><span className="text-gray-400">Tenant:</span> <span className="text-white ml-2">{tenants[0].users?.firstName} {tenants[0].users?.lastName}</span></div>
            )}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Assignment</h2>
          <div className="space-y-2 text-sm">
            {createdBy && <div><span className="text-gray-400">Reported by:</span> <span className="text-white ml-2">{createdBy.firstName} {createdBy.lastName}</span></div>}
            {assignedTo ? (
              <div><span className="text-gray-400">Assigned to:</span> <span className="text-white ml-2">{assignedTo.firstName} {assignedTo.lastName} ({assignedTo.role})</span></div>
            ) : (
              <div className="text-yellow-400 text-sm">Not yet assigned</div>
            )}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Cost</h2>
          <div className="space-y-2 text-sm">
            {req.estimatedCost != null && <div><span className="text-gray-400">Estimated:</span> <span className="text-white ml-2">KSH {Number(req.estimatedCost).toLocaleString()}</span></div>}
            {req.actualCost != null && <div><span className="text-gray-400">Actual:</span> <span className="text-white ml-2">KSH {Number(req.actualCost).toLocaleString()}</span></div>}
            <div><span className="text-gray-400">Created:</span> <span className="text-white ml-2">{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "—"}</span></div>
            {req.completedAt && <div><span className="text-gray-400">Completed:</span> <span className="text-white ml-2">{new Date(req.completedAt).toLocaleDateString()}</span></div>}
          </div>
        </div>
      </div>

      {req.completionNotes && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Completion Notes</h2>
          <p className="text-gray-300">{req.completionNotes}</p>
        </div>
      )}
    </div>
  );
}
