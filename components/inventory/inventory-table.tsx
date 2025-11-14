"use client";

import { useEffect, useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Eye, Edit, Trash2, Package, AlertCircle, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StockAdjustmentDialog from "./stock-adjustment-dialog";

interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  sku?: string;
  quantity: number;
  minimumQuantity: number;
  unitOfMeasure: string;
  unitCost: number;
  totalValue: number;
  location?: string;
  supplier?: string;
}

export default function InventoryTable() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    fetchItems();
  }, [categoryFilter, lowStockFilter, searchTerm]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      let url = "/api/inventory?";

      if (categoryFilter !== "all") url += `category=${categoryFilter}&`;
      if (lowStockFilter) url += `lowStock=true&`;
      if (searchTerm) url += `search=${searchTerm}&`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setItems(data.data);
      } else {
        setError(data.error || "Failed to fetch inventory items");
      }
    } catch (err) {
      setError("An error occurred while fetching inventory items");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        fetchItems();
      } else {
        alert(data.error || "Failed to delete item");
      }
    } catch (err) {
      alert("An error occurred while deleting the item");
      console.error(err);
    }
  };

  const isLowStock = (item: InventoryItem) => {
    return item.quantity <= item.minimumQuantity;
  };

  const getStockBadge = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (isLowStock(item)) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">Low Stock</Badge>;
    } else {
      return <Badge variant="secondary">In Stock</Badge>;
    }
  };

  // Get unique categories
  const categories = Array.from(new Set(items.map((item) => item.category))).sort();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500">Loading inventory...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <Button onClick={fetchItems} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="w-48">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant={lowStockFilter ? "default" : "outline"}
          onClick={() => setLowStockFilter(!lowStockFilter)}
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          Low Stock Only
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No inventory items found
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || categoryFilter !== "all" || lowStockFilter
              ? "Try adjusting your filters"
              : "Get started by adding your first inventory item"}
          </p>
          <Link href="/dashboard/inventory/new">
            <Button>Add Inventory Item</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-center">Min. Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className={isLowStock(item) ? "bg-orange-50" : ""}>
                  <TableCell>
                    <Link
                      href={`/dashboard/inventory/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    {item.description && (
                      <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                        {item.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {item.sku || "-"}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {item.quantity} {item.unitOfMeasure}
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-500">
                    {item.minimumQuantity}
                  </TableCell>
                  <TableCell>{getStockBadge(item)}</TableCell>
                  <TableCell>KSh {item.unitCost.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">
                    KSh {item.totalValue.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {item.location || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdjustingItem(item)}
                        title="Adjust Stock"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/inventory/${item.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/inventory/${item.id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(item.id, item.name)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Stock Adjustment Dialog */}
      {adjustingItem && (
        <StockAdjustmentDialog
          item={adjustingItem}
          open={!!adjustingItem}
          onClose={() => setAdjustingItem(null)}
          onSuccess={fetchItems}
        />
      )}
    </div>
  );
}
