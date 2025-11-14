"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, RefreshCw } from "lucide-react";

interface StockAdjustmentDialogProps {
  item: {
    id: string;
    name: string;
    quantity: number;
    unitOfMeasure: string;
  };
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockAdjustmentDialog({
  item,
  open,
  onClose,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!quantity || !reason) {
      alert("Please fill in all required fields");
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/inventory/${item.id}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          quantity: qty,
          reason,
          referenceNumber: referenceNumber || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || "Failed to adjust stock");
      }
    } catch (error) {
      alert("An error occurred while adjusting stock");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getNewQuantity = () => {
    const qty = parseInt(quantity);
    if (isNaN(qty)) return item.quantity;

    if (type === "IN") {
      return item.quantity + qty;
    } else if (type === "OUT") {
      return Math.max(0, item.quantity - qty);
    } else {
      return qty;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock: {item.name}</DialogTitle>
          <DialogDescription>
            Current stock: {item.quantity} {item.unitOfMeasure}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Adjustment Type *</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                type="button"
                variant={type === "IN" ? "default" : "outline"}
                onClick={() => setType("IN")}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
              <Button
                type="button"
                variant={type === "OUT" ? "default" : "outline"}
                onClick={() => setType("OUT")}
                className="w-full"
              >
                <Minus className="mr-2 h-4 w-4" />
                Remove
              </Button>
              <Button
                type="button"
                variant={type === "ADJUSTMENT" ? "default" : "outline"}
                onClick={() => setType("ADJUSTMENT")}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Set
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="quantity">
              {type === "ADJUSTMENT" ? "New Quantity *" : "Quantity *"}
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={type === "ADJUSTMENT" ? "Enter new quantity" : "Enter quantity"}
              className="mt-2"
            />
            {quantity && (
              <p className="text-sm text-gray-500 mt-1">
                New stock level will be:{" "}
                <span className="font-semibold">
                  {getNewQuantity()} {item.unitOfMeasure}
                </span>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {type === "IN" && (
                  <>
                    <SelectItem value="Purchase Order">Purchase Order</SelectItem>
                    <SelectItem value="Return from job">Return from job</SelectItem>
                    <SelectItem value="Transfer in">Transfer in</SelectItem>
                    <SelectItem value="Found inventory">Found inventory</SelectItem>
                    <SelectItem value="Other (IN)">Other</SelectItem>
                  </>
                )}
                {type === "OUT" && (
                  <>
                    <SelectItem value="Used in maintenance">Used in maintenance</SelectItem>
                    <SelectItem value="Used in renovation">Used in renovation</SelectItem>
                    <SelectItem value="Damaged/Broken">Damaged/Broken</SelectItem>
                    <SelectItem value="Lost/Missing">Lost/Missing</SelectItem>
                    <SelectItem value="Transfer out">Transfer out</SelectItem>
                    <SelectItem value="Other (OUT)">Other</SelectItem>
                  </>
                )}
                {type === "ADJUSTMENT" && (
                  <>
                    <SelectItem value="Physical count">Physical count</SelectItem>
                    <SelectItem value="Inventory correction">Inventory correction</SelectItem>
                    <SelectItem value="System error">System error</SelectItem>
                    <SelectItem value="Other (ADJ)">Other</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reference">Reference Number (Optional)</Label>
            <Input
              id="reference"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g., PO-123, Job-456"
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adjusting..." : "Adjust Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
