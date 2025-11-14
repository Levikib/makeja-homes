"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Package, Search } from "lucide-react";
import Link from "next/link";
import InventoryTable from "@/components/inventory/inventory-table";

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8" />
            Inventory Management
          </h1>
          <p className="text-gray-500 mt-1">
            Track and manage all maintenance and renovation supplies
          </p>
        </div>
        <Link href="/dashboard/inventory/new">
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Add Item
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px] bg-white">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="ELECTRICAL">Electrical</SelectItem>
            <SelectItem value="HARDWARE">Hardware</SelectItem>
            <SelectItem value="PAINT">Paint</SelectItem>
            <SelectItem value="PLUMBING">Plumbing</SelectItem>
            <SelectItem value="TOOLS">Tools</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={lowStockOnly ? "default" : "outline"}
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={lowStockOnly ? "low-stock-button-active" : ""}
        >
          <Package className="mr-2 h-4 w-4" />
          Low Stock Only
        </Button>
      </div>

      <InventoryTable
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        lowStockOnly={lowStockOnly}
      />
    </div>
  );
}
