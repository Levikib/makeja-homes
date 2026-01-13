"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface FilterState {
  search: string;
  status: string;
  type: string;
  minRent: string;
  maxRent: string;
  bedrooms: string;
  bathrooms: string;
  floor: string;
  occupancy: string;
}

interface UnitsFilterProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
}

export default function UnitsFilter({ filters, setFilters }: UnitsFilterProps) {
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      type: "",
      minRent: "",
      maxRent: "",
      bedrooms: "",
      bathrooms: "",
      floor: "",
      occupancy: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search units..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white"
            />
          </div>
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">All Statuses</option>
          <option value="VACANT">Vacant</option>
          <option value="OCCUPIED">Occupied</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="RESERVED">Reserved</option>
        </select>

        {/* Type Filter - MATCHING SCHEMA EXACTLY */}
        <select
          value={filters.type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">All Types</option>
          <option value="STUDIO">Studio</option>
          <option value="ONE_BEDROOM">1 Bedroom</option>
          <option value="TWO_BEDROOM">2 Bedrooms</option>
          <option value="THREE_BEDROOM">3 Bedrooms</option>
          <option value="PENTHOUSE">Penthouse</option>
          <option value="SHOP">Shop</option>
          <option value="OFFICE">Office</option>
          <option value="WAREHOUSE">Warehouse</option>
          <option value="STAFF_QUARTERS">Staff Quarters</option>
        </select>

        {/* Bedrooms Filter */}
        <select
          value={filters.bedrooms}
          onChange={(e) => handleFilterChange("bedrooms", e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">Any Bedrooms</option>
          <option value="0">Studio</option>
          <option value="1">1 Bedroom</option>
          <option value="2">2 Bedrooms</option>
          <option value="3">3 Bedrooms</option>
          <option value="4">4+ Bedrooms</option>
        </select>

        {/* Bathrooms Filter */}
        <select
          value={filters.bathrooms}
          onChange={(e) => handleFilterChange("bathrooms", e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">Any Bathrooms</option>
          <option value="1">1 Bathroom</option>
          <option value="1.5">1.5 Bathrooms</option>
          <option value="2">2 Bathrooms</option>
          <option value="2.5">2.5 Bathrooms</option>
          <option value="3">3+ Bathrooms</option>
        </select>

        {/* Min Rent */}
        <Input
          type="number"
          placeholder="Min Rent"
          value={filters.minRent}
          onChange={(e) => handleFilterChange("minRent", e.target.value)}
          className="bg-gray-900 border-gray-700 text-white"
        />

        {/* Max Rent */}
        <Input
          type="number"
          placeholder="Max Rent"
          value={filters.maxRent}
          onChange={(e) => handleFilterChange("maxRent", e.target.value)}
          className="bg-gray-900 border-gray-700 text-white"
        />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearFilters}
            className="border-gray-700"
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}
