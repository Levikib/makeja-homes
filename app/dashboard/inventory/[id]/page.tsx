import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function getInventoryItem(id: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/inventory/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return null;
  }
}

export default async function InventoryItemDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["ADMIN", "MANAGER", "STOREKEEPER", "TECHNICAL"]);

  const item = await getInventoryItem(params.id);

  if (!item) {
    notFound();
  }

  const isLowStock = item.quantity <= item.minimumQuantity;
  const isOutOfStock = item.quantity === 0;

  return (
    <div className="container mx-auto py-6 px-4">
      <Link
        href="/dashboard/inventory"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Inventory
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{item.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{item.category}</Badge>
            {isOutOfStock && (
              <Badge variant="destructive">
                <AlertCircle className="mr-1 h-3 w-3" />
                Out of Stock
              </Badge>
            )}
            {!isOutOfStock && isLowStock && (
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                <AlertCircle className="mr-1 h-3 w-3" />
                Low Stock
              </Badge>
            )}
          </div>
        </div>

        <Link href={`/dashboard/inventory/${item.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Item
          </Button>
        </Link>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {item.quantity} {item.unitOfMeasure}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minimum Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {item.minimumQuantity} {item.unitOfMeasure}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {item.unitCost.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {item.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Details Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="movements">Movement History</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Item Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1">{item.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {item.sku && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">SKU/Part Number</label>
                    <p className="mt-1">{item.sku}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Unit of Measure</label>
                  <p className="mt-1">{item.unitOfMeasure}</p>
                </div>

                {item.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Storage Location</label>
                    <p className="mt-1">{item.location}</p>
                  </div>
                )}

                {item.supplier && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Supplier</label>
                    <p className="mt-1">{item.supplier}</p>
                  </div>
                )}

                {item.supplierContact && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Supplier Contact</label>
                    <p className="mt-1">{item.supplierContact}</p>
                  </div>
                )}
              </div>

              {item.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="mt-1 whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement History</CardTitle>
            </CardHeader>
            <CardContent>
              {item.movements && item.movements.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Performed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.movements.map((movement: any) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {new Date(movement.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              movement.type === "IN"
                                ? "default"
                                : movement.type === "OUT"
                                ? "outline"
                                : "secondary"
                            }
                          >
                            {movement.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={
                            movement.quantity > 0
                              ? "text-green-600 font-semibold"
                              : "text-red-600 font-semibold"
                          }
                        >
                          {movement.quantity > 0 ? "+" : ""}
                          {movement.quantity} {item.unitOfMeasure}
                        </TableCell>
                        <TableCell>{movement.reason}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {movement.referenceNumber || "-"}
                        </TableCell>
                        <TableCell>
                          {movement.performedBy.firstName} {movement.performedBy.lastName}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No movement history yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {item.purchaseOrderItems && item.purchaseOrderItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.purchaseOrderItems.map((poItem: any) => (
                      <TableRow key={poItem.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/purchase-orders/${poItem.purchaseOrder.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {poItem.purchaseOrder.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {new Date(poItem.purchaseOrder.orderDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {poItem.quantity} {item.unitOfMeasure}
                        </TableCell>
                        <TableCell>KSh {poItem.unitPrice.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">
                          KSh {poItem.totalPrice.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{poItem.purchaseOrder.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No purchase orders yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
