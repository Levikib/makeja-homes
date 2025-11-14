import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PurchaseOrderWorkflowButtons from "@/components/purchase-orders/purchase-order-workflow-buttons";

async function getPurchaseOrder(id: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/purchase-orders/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return null;
  }
}

export default async function PurchaseOrderDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["ADMIN", "STOREKEEPER"]);

  const order = await getPurchaseOrder(params.id);

  if (!order) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
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

  return (
    <div className="container mx-auto py-6 px-4">
      <Link
        href="/dashboard/purchase-orders"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Purchase Orders
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(order.status)}
          </div>
        </div>

        <PurchaseOrderWorkflowButtons orderId={order.id} status={order.status} />
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{order.supplier}</div>
            {order.supplierContact && (
              <p className="text-sm text-gray-500 mt-1">{order.supplierContact}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {new Date(order.orderDate).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {order.expectedDeliveryDate
                ? new Date(order.expectedDeliveryDate).toLocaleDateString()
                : "Not specified"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {order.total.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/inventory/${item.inventoryItem.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {item.inventoryItem.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.inventoryItem.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.quantity} {item.inventoryItem.unitOfMeasure}
                  </TableCell>
                  <TableCell>KSh {item.unitPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">
                    KSh {item.totalPrice.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">KSh {order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (7.5%):</span>
              <span className="font-medium">KSh {order.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>KSh {order.total.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Created By</label>
              <p className="mt-1">
                {order.createdBy.firstName} {order.createdBy.lastName}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Created At</label>
              <p className="mt-1">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>

            {order.submittedAt && (
              <div>
                <label className="text-sm font-medium text-gray-500">Submitted At</label>
                <p className="mt-1">
                  {new Date(order.submittedAt).toLocaleString()}
                </p>
              </div>
            )}

            {order.approvedAt && order.approvedBy && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-500">Approved By</label>
                  <p className="mt-1">
                    {order.approvedBy.firstName} {order.approvedBy.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Approved At</label>
                  <p className="mt-1">
                    {new Date(order.approvedAt).toLocaleString()}
                  </p>
                </div>
              </>
            )}

            {order.receivedAt && order.receivedBy && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-500">Received By</label>
                  <p className="mt-1">
                    {order.receivedBy.firstName} {order.receivedBy.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Received At</label>
                  <p className="mt-1">
                    {new Date(order.receivedAt).toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </div>

          {order.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500">Notes</label>
              <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
