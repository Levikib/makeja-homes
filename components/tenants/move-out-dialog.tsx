"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LogOut } from "lucide-react";

interface MoveOutDialogProps {
  tenant: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
    unit?: {
      unitNumber: string;
      property: {
        name: string;
      };
    };
  };
}

export default function MoveOutDialog({ tenant }: MoveOutDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moveOutDate, setMoveOutDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState("");

  const handleMoveOut = async () => {
    if (!moveOutDate) {
      alert("Please select a move-out date");
      return;
    }

    if (!confirm(
      `Are you sure you want to mark ${tenant.user.firstName} ${tenant.user.lastName} as moved out?\n\n` +
      `This will:\n` +
      `• Terminate all active leases\n` +
      `• Mark the unit as VACANT\n` +
      `• Update tenant status to inactive`
    )) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/tenants/${tenant.id}/move-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moveOutDate,
          reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process move-out");
      }

      alert("Tenant successfully moved out!");
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LogOut className="h-4 w-4 mr-2" />
          Move Out
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Mark Tenant as Moved Out</DialogTitle>
          <DialogDescription>
            Process the move-out for {tenant.user.firstName} {tenant.user.lastName}
            {tenant.unit && ` from Unit ${tenant.unit.unitNumber}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {tenant.unit && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-900 font-medium">
                ⚠️ This action will:
              </p>
              <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                <li>Mark Unit {tenant.unit.unitNumber} as VACANT</li>
                <li>Terminate all active leases</li>
                <li>Update tenant status to inactive</li>
              </ul>
            </div>
          )}

          <div>
            <Label htmlFor="moveOutDate">Move-Out Date *</Label>
            <Input
              id="moveOutDate"
              type="date"
              value={moveOutDate}
              onChange={(e) => setMoveOutDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Lease ended, Transferred to another location..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleMoveOut}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Processing..." : "Confirm Move-Out"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
