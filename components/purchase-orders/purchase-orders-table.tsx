"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Eye, Send, CheckCircle, Package } from "lucide-react";

type PurchaseOrderStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "RECEIVED";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  createdBy: {
    firstName: string;
    lastName: string;
  };
  items: {
    id: string;
    inventoryItem: {
      name: string;
    };
    quantity: number;
    unitPrice: number;
  }[];
}

export default function PurchaseOrdersTable() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(`/api/purchase-orders?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchTerm]);

  const handleWorkflowAction = async (orderId: string, action: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${orderId}/${action}`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        fetchOrders();
        router.refresh();
      } else {
        alert(data.error || `Failed to ${action} order`);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`An error occurred while trying to ${action} the order`);
    }
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline">Draft</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-blue-500">Submitted</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "RECEIVED":
        return <Badge className="bg-purple-500">Received</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionButtons = (order: PurchaseOrder) => {
    const buttons = [
      <Link key="view" href={`/dashboard/purchase-orders/${order.id}`}>
        <Button size="sm" variant="ghost">
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </Link>,
    ];

    if (order.status === "DRAFT") {
      buttons.push(
        <Button
          key="submit"
          size="sm"
          variant="outline"
          onClick={() => handleWorkflowAction(order.id, "submit")}
        >
          <Send className="h-4 w-4 mr-1" />
          Submit
        </Button>
      );
    }

    if (order.status === "SUBMITTED") {
      buttons.push(
        <Button
          key="approve"
          size="sm"
          onClick={() => handleWorkflowAction(order.id, "approve")}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve
        </Button>
      );
    }

    if (order.status === "APPROVED") {
      buttons.push(
        <Button
          key="receive"
          size="sm"
          onClick={() => handleWorkflowAction(order.id, "receive")}
        >
          <Package className="h-4 w-4 mr-1" />
          Receive
        </Button>
      );
    }

    return buttons;
  };

  if (loading) {
    return <div className="text-center py-8">Loading purchase orders...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by order number or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-gray-500">No purchase orders found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.supplier}</TableCell>
                  <TableCell>
                    {new Date(order.orderDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {order.expectedDeliveryDate
                      ? new Date(order.expectedDeliveryDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>{order.items.length} items</TableCell>
                  <TableCell className="font-semibold">
                    KSh {order.total.toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    {order.createdBy.firstName} {order.createdBy.lastName}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {getActionButtons(order)}
                    </div>
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
