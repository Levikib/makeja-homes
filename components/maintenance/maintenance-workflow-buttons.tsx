"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, PlayCircle, CheckSquare } from "lucide-react";

interface MaintenanceWorkflowButtonsProps {
  requestId: string;
  status: string;
  userRole: string;
}

export default function MaintenanceWorkflowButtons({
  requestId,
  status,
  userRole,
}: MaintenanceWorkflowButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this request?")) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/maintenance/${requestId}/approve`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        router.refresh();
      } else {
        alert(data.error || "Failed to approve request");
      }
    } catch (err) {
      alert("An error occurred while approving the request");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/maintenance/${requestId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const data = await response.json();

      if (data.success) {
        setShowRejectDialog(false);
        router.refresh();
      } else {
        alert(data.error || "Failed to reject request");
      }
    } catch (err) {
      alert("An error occurred while rejecting the request");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!confirm("Start work on this maintenance request?")) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/maintenance/${requestId}/start`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        router.refresh();
      } else {
        alert(data.error || "Failed to start request");
      }
    } catch (err) {
      alert("An error occurred while starting the request");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/maintenance/${requestId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actualCost: actualCost ? parseFloat(actualCost) : undefined,
          notes: completionNotes || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowCompleteDialog(false);
        router.refresh();
      } else {
        alert(data.error || "Failed to complete request");
      }
    } catch (err) {
      alert("An error occurred while completing the request");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Only show buttons for ADMIN, MANAGER, and TECHNICAL
  if (!["ADMIN", "MANAGER", "TECHNICAL"].includes(userRole)) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2">
        {status === "PENDING" && (userRole === "ADMIN" || userRole === "MANAGER") && (
          <>
            <Button onClick={handleApprove} disabled={loading}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              disabled={loading}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </>
        )}

        {status === "APPROVED" && (
          <Button onClick={handleStart} disabled={loading}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Start Work
          </Button>
        )}

        {status === "IN_PROGRESS" && (
          <Button onClick={() => setShowCompleteDialog(true)} disabled={loading}>
            <CheckSquare className="mr-2 h-4 w-4" />
            Mark Complete
          </Button>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Maintenance Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Reason for Rejection *</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleReject} disabled={loading}>
              {loading ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Maintenance Request</DialogTitle>
            <DialogDescription>
              Provide completion details for this request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="actualCost">Actual Cost (KSh)</Label>
              <Input
                id="actualCost"
                type="number"
                min="0"
                step="0.01"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                placeholder="e.g., 5000"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="notes">Completion Notes</Label>
              <Textarea
                id="notes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Any additional notes about the completed work..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={loading}>
              {loading ? "Completing..." : "Mark as Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
