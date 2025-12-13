"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface Property {
  id: string;
  name: string;
}

interface NewExpenseClientProps {
  properties: Property[];
}

const EXPENSE_CATEGORIES = [
  "UTILITIES",
  "MAINTENANCE",
  "SALARIES",
  "SUPPLIES",
  "REPAIRS",
  "INSURANCE",
  "TAXES",
  "OTHER",
];

const PAYMENT_METHODS = [
  "CASH",
  "MPESA",
  "BANK_TRANSFER",
  "CHEQUE",
  "CARD",
];

export default function NewExpenseClient({ properties }: NewExpenseClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    propertyId: "",
    paymentMethod: "",
    notes: "",
    receiptUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (!response.ok) throw new Error("Failed to create expense");

      router.push("/dashboard/admin/expenses");
      router.refresh();
    } catch (error) {
      console.error("Error creating expense:", error);
      alert("Failed to create expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">New Expense</h1>
          <p className="text-gray-400 mt-1">Add a new business expense</p>
        </div>
        <Link href="/dashboard/admin/expenses">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Expenses
          </Button>
        </Link>
      </div>

      {/* Form */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Amount */}
            <div>
              <Label htmlFor="amount" className="text-white">
                Amount (KES) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="bg-gray-900/50 border-gray-700 text-white"
                placeholder="0.00"
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category" className="text-white">
                Category *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
                required
              >
                <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Property */}
            <div>
              <Label htmlFor="propertyId" className="text-white">
                Property *
              </Label>
              <Select
                value={formData.propertyId}
                onValueChange={(value) =>
                  setFormData({ ...formData, propertyId: value })
                }
                required
              >
                <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="date" className="text-white">
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="bg-gray-900/50 border-gray-700 text-white"
              />
            </div>

            {/* Payment Method */}
            <div>
              <Label htmlFor="paymentMethod" className="text-white">
                Payment Method
              </Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) =>
                  setFormData({ ...formData, paymentMethod: value })
                }
              >
                <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Receipt URL */}
            <div>
              <Label htmlFor="receiptUrl" className="text-white">
                Receipt URL
              </Label>
              <Input
                id="receiptUrl"
                type="url"
                value={formData.receiptUrl}
                onChange={(e) =>
                  setFormData({ ...formData, receiptUrl: e.target.value })
                }
                className="bg-gray-900/50 border-gray-700 text-white"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-white">
              Description *
            </Label>
            <Input
              id="description"
              required
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="bg-gray-900/50 border-gray-700 text-white"
              placeholder="Brief description of the expense"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-white">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="bg-gray-900/50 border-gray-700 text-white"
              placeholder="Additional notes or details..."
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/dashboard/admin/expenses">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-600 text-black gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? "Creating..." : "Create Expense"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
