"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle, Package } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PurchaseOrderWorkflowButtonsProps {
  orderId: string;
  status: string;
}

export default function PurchaseOrderWorkflowButtons({
  orderId,
  status,
}: PurchaseOrderWorkflowButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);

  const handleWorkflowAction = async (action: string) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/purchase-orders/${orderId}/${action}`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        router.refresh();
        setShowSubmitDialog(false);
        setShowApproveDialog(false);
        setShowReceiveDialog(false);
      } else {
        alert(data.error || `Failed to ${action} order`);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`An error occurred while trying to ${action} the order`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {status === "DRAFT" && (
          <Button onClick={() => setShowSubmitDialog(true)}>
            <Send className="mr-2 h-4 w-4" />
            Submit Order
          </Button>
        )}

        {status === "SUBMITTED" && (
          <Button onClick={() => setShowApproveDialog(true)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve Order
          </Button>
        )}

        {status === "APPROVED" && (
          <Button onClick={() => setShowReceiveDialog(true)}>
            <Package className="mr-2 h-4 w-4" />
            Mark as Received
          </Button>
        )}
      </div>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this purchase order for approval? Once
              submitted, you won't be able to edit the order details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleWorkflowAction("submit")}
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this purchase order? This will allow the
              order to proceed to delivery and receiving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleWorkflowAction("approve")}
              disabled={loading}
            >
              {loading ? "Approving..." : "Approve Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receive Dialog */}
      <AlertDialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Order as Received</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure all items in this order have been received? This will
              automatically update your inventory quantities and complete the order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleWorkflowAction("receive")}
              disabled={loading}
            >
              {loading ? "Processing..." : "Mark as Received"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
