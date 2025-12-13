"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";

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
  onFilterChange: (filters: FilterState) => void;
  totalUnits: number;
  filteredCount: number;
}

export default function UnitsFilter({ onFilterChange, totalUnits, filteredCount }: UnitsFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
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

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      search: "",
      status: "",
      type: "",
      minRent: "",
      maxRent: "",
      bedrooms: "",
      bathrooms: "",
      floor: "",
      occupancy: "",
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== "");

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">Filter Units</h3>
          <div className="text-sm text-gray-400">
            Showing <span className="text-cyan-400 font-semibold">{filteredCount}</span> of{" "}
            <span className="text-white font-semibold">{totalUnits}</span> units
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              onClick={clearAllFilters}
              variant="outline"
              size="sm"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
          <Button
            onClick={() => setShowAdvanced(!showAdvanced)}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            {showAdvanced ? "Hide" : "Show"} Advanced
          </Button>
        </div>
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Search className="w-4 h-4 inline mr-1" />
            Search Unit Number
          </label>
          <Input
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            placeholder="e.g., 101, A1, Shop-5..."
            className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Statuses</option>
            <option value="VACANT">Vacant</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="MAINTENANCE">Under Maintenance</option>
            <option value="RESERVED">Reserved</option>
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Unit Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Types</option>
            <optgroup label="Residential">
              <option value="STUDIO">Studio</option>
              <option value="ONE_BEDROOM">1 Bedroom</option>
              <option value="TWO_BEDROOM">2 Bedrooms</option>
              <option value="THREE_BEDROOM">3 Bedrooms</option>
              <option value="PENTHOUSE">Penthouse</option>
            </optgroup>
            <optgroup label="Commercial">
              <option value="SHOP">Shop</option>
              <option value="OFFICE">Office</option>
              <option value="WAREHOUSE">Warehouse</option>
            </optgroup>
            <optgroup label="Staff">
              <option value="STAFF_QUARTERS">Staff Quarters</option>
            </optgroup>
          </select>
        </div>

        {/* Occupancy */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Occupancy
          </label>
          <select
            value={filters.occupancy}
            onChange={(e) => handleFilterChange("occupancy", e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Units</option>
            <option value="with-tenant">With Tenant</option>
            <option value="without-tenant">Without Tenant</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="pt-4 border-t border-gray-700 space-y-4">
          <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Advanced Filters</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Rent Range */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Rent (KSH)
              </label>
              <Input
                type="number"
                value={filters.minRent}
                onChange={(e) => handleFilterChange("minRent", e.target.value)}
                placeholder="e.g., 20000"
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Rent (KSH)
              </label>
              <Input
                type="number"
                value={filters.maxRent}
                onChange={(e) => handleFilterChange("maxRent", e.target.value)}
                placeholder="e.g., 50000"
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                min="0"
              />
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bedrooms
              </label>
              <select
                value={filters.bedrooms}
                onChange={(e) => handleFilterChange("bedrooms", e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="">Any</option>
                <option value="0">Studio (0)</option>
                <option value="1">1 Bedroom</option>
                <option value="2">2 Bedrooms</option>
                <option value="3">3 Bedrooms</option>
                <option value="4">4+ Bedrooms</option>
              </select>
            </div>

            {/* Bathrooms */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bathrooms
              </label>
              <select
                value={filters.bathrooms}
                onChange={(e) => handleFilterChange("bathrooms", e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="">Any</option>
                <option value="1">1 Bathroom</option>
                <option value="1.5">1.5 Bathrooms</option>
                <option value="2">2 Bathrooms</option>
                <option value="2.5">2.5 Bathrooms</option>
                <option value="3">3+ Bathrooms</option>
              </select>
            </div>

            {/* Floor */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Floor
              </label>
              <Input
                type="number"
                value={filters.floor}
                onChange={(e) => handleFilterChange("floor", e.target.value)}
                placeholder="e.g., 1"
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                min="0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Active Filters:</p>
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-400 text-sm">
                Search: {filters.search}
                <button onClick={() => handleFilterChange("search", "")} className="hover:text-cyan-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm">
                Status: {filters.status}
                <button onClick={() => handleFilterChange("status", "")} className="hover:text-green-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.type && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm">
                Type: {filters.type.replace(/_/g, ' ')}
                <button onClick={() => handleFilterChange("type", "")} className="hover:text-purple-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.occupancy && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm">
                {filters.occupancy === "with-tenant" ? "With Tenant" : "Without Tenant"}
                <button onClick={() => handleFilterChange("occupancy", "")} className="hover:text-blue-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.minRent || filters.maxRent) && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400 text-sm">
                Rent: {filters.minRent && `KSH ${filters.minRent}`}{filters.minRent && filters.maxRent && " - "}{filters.maxRent && `KSH ${filters.maxRent}`}
                <button onClick={() => { handleFilterChange("minRent", ""); handleFilterChange("maxRent", ""); }} className="hover:text-yellow-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.bedrooms && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-pink-500/20 border border-pink-500/30 rounded-full text-pink-400 text-sm">
                {filters.bedrooms}+ Bedrooms
                <button onClick={() => handleFilterChange("bedrooms", "")} className="hover:text-pink-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.bathrooms && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-sm">
                {filters.bathrooms}+ Bathrooms
                <button onClick={() => handleFilterChange("bathrooms", "")} className="hover:text-indigo-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.floor && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-400 text-sm">
                Floor: {filters.floor}
                <button onClick={() => handleFilterChange("floor", "")} className="hover:text-orange-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
