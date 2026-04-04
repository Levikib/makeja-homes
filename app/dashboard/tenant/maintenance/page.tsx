"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Plus, Clock, CheckCircle, AlertTriangle, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";

type MaintenanceStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "AWAITING_PARTS" | "COMPLETED" | "CLOSED" | "CANCELLED";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  priority: Priority;
  category: string | null;
  status: MaintenanceStatus;
  createdAt: string;
  completedAt: string | null;
  completionNotes: string | null;
  estimatedCost: number | null;
}

const statusConfig: Record<MaintenanceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:        { label: "Pending",         color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",   icon: <Clock className="h-3 w-3" /> },
  ASSIGNED:       { label: "Assigned",        color: "bg-blue-500/10 text-blue-400 border-blue-500/30",         icon: <Clock className="h-3 w-3" /> },
  IN_PROGRESS:    { label: "In Progress",     color: "bg-purple-500/10 text-purple-400 border-purple-500/30",   icon: <Wrench className="h-3 w-3" /> },
  AWAITING_PARTS: { label: "Awaiting Parts",  color: "bg-orange-500/10 text-orange-400 border-orange-500/30",  icon: <AlertTriangle className="h-3 w-3" /> },
  COMPLETED:      { label: "Completed",       color: "bg-green-500/10 text-green-400 border-green-500/30",      icon: <CheckCircle className="h-3 w-3" /> },
  CLOSED:         { label: "Closed",          color: "bg-gray-500/10 text-gray-400 border-gray-500/30",         icon: <CheckCircle className="h-3 w-3" /> },
  CANCELLED:      { label: "Cancelled",       color: "bg-red-500/10 text-red-400 border-red-500/30",            icon: <X className="h-3 w-3" /> },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  LOW:    { label: "Low",    color: "text-gray-400" },
  MEDIUM: { label: "Medium", color: "text-yellow-400" },
  HIGH:   { label: "High",   color: "text-orange-400" },
  URGENT: { label: "Urgent", color: "text-red-400" },
};

export default function TenantMaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as Priority,
    category: "",
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/tenant/maintenance");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch maintenance requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Request submitted successfully! We'll be in touch soon.");
        setForm({ title: "", description: "", priority: "MEDIUM", category: "" });
        setShowForm(false);
        fetchRequests();
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError(data.error || "Failed to submit request.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const active = requests.filter(r => !["COMPLETED", "CLOSED", "CANCELLED"].includes(r.status));
  const history = requests.filter(r => ["COMPLETED", "CLOSED", "CANCELLED"].includes(r.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Maintenance</h1>
          <p className="text-gray-400 mt-1">Submit requests and track their progress</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Success / Error */}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* New Request Form */}
      {showForm && (
        <Card className="bg-gray-900/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wrench className="h-5 w-5 text-purple-400" />
              New Maintenance Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Leaking tap in kitchen"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value as Priority })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">General</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="carpentry">Carpentry</option>
                    <option value="painting">Painting</option>
                    <option value="pest_control">Pest Control</option>
                    <option value="appliances">Appliances</option>
                    <option value="security">Security</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(""); }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Submit Request
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : (
        <>
          {/* Active Requests */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-purple-400" />
                Active Requests
                {active.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">{active.length}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {active.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400">No active maintenance requests</p>
                  <p className="text-gray-500 text-sm mt-1">Click "New Request" to submit one</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {active.map(req => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      expanded={expandedId === req.id}
                      onToggle={() => setExpandedId(expandedId === req.id ? null : req.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
          {history.length > 0 && (
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-gray-400" />
                  History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history.map(req => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      expanded={expandedId === req.id}
                      onToggle={() => setExpandedId(expandedId === req.id ? null : req.id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function RequestCard({ req, expanded, onToggle }: { req: MaintenanceRequest; expanded: boolean; onToggle: () => void }) {
  const status = statusConfig[req.status];
  const priority = priorityConfig[req.priority];
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium shrink-0 ${status.color}`}>
            {status.icon}
            {status.label}
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium truncate">{req.title}</p>
            <p className="text-gray-500 text-xs mt-0.5">{req.requestNumber} · {new Date(req.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })} · <span className={priority.color}>{priority.label}</span></p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 ml-3" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-3" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-700 space-y-3 bg-gray-800/30">
          <div className="pt-3">
            <p className="text-xs text-gray-500 font-medium mb-1">DESCRIPTION</p>
            <p className="text-gray-300 text-sm">{req.description}</p>
          </div>
          {req.category && (
            <p className="text-xs text-gray-400"><span className="text-gray-500">Category:</span> {req.category}</p>
          )}
          {req.completionNotes && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-xs text-green-400 font-medium mb-1">COMPLETION NOTES</p>
              <p className="text-gray-300 text-sm">{req.completionNotes}</p>
            </div>
          )}
          {req.estimatedCost && (
            <p className="text-xs text-gray-400"><span className="text-gray-500">Estimated cost:</span> KSH {Number(req.estimatedCost).toLocaleString()}</p>
          )}
          {req.completedAt && (
            <p className="text-xs text-gray-400"><span className="text-gray-500">Completed:</span> {new Date(req.completedAt).toLocaleDateString('en-KE')}</p>
          )}
        </div>
      )}
    </div>
  );
}
