"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Wrench, Clock, CheckCircle, DollarSign, Search, Filter, X, 
  MapPin, AlertTriangle, User, Calendar, Eye 
} from "lucide-react";

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  estimatedCost: number | null;
  actualCost: number | null;
  createdAt: Date;
  units: {
    unitNumber: string;
    properties: {
      id: string;
      name: string;
    };
  };
  users_maintenance_requests_createdByIdTousers: {
    firstName: string;
    lastName: string;
    email: string;
  };
  users_maintenance_requests_assignedToIdTousers: {
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

interface Property {
  id: string;
  name: string;
}

interface Stats {
  openCount: number;
  inProgressCount: number;
  completedCount: number;
  totalCost: number;
}

interface MaintenanceClientProps {
  requests: MaintenanceRequest[];
  properties: Property[];
  stats: Stats;
}

const priorityColors = {
  LOW: "text-green-400 bg-green-500/10 border-green-500/30",
  MEDIUM: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  HIGH: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  EMERGENCY: "text-red-400 bg-red-500/10 border-red-500/30",
};

const statusColors = {
  OPEN: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  IN_PROGRESS: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  COMPLETED: "text-green-400 bg-green-500/10 border-green-500/30",
  CLOSED: "text-gray-400 bg-gray-500/10 border-gray-500/30",
};

export default function MaintenanceClient({ requests, properties, stats }: MaintenanceClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesSearch =
        searchQuery === "" ||
        request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.units.unitNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProperty =
        selectedProperty === "all" || request.units.properties.id === selectedProperty;

      const matchesStatus =
        selectedStatus === "all" || request.status === selectedStatus;

      const matchesPriority =
        selectedPriority === "all" || request.priority === selectedPriority;

      const matchesCategory =
        selectedCategory === "all" || request.category === selectedCategory;

      return matchesSearch && matchesProperty && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [requests, searchQuery, selectedProperty, selectedStatus, selectedPriority, selectedCategory]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedProperty("all");
    setSelectedStatus("all");
    setSelectedPriority("all");
    setSelectedCategory("all");
  };

  const hasActiveFilters = 
    searchQuery !== "" || 
    selectedProperty !== "all" || 
    selectedStatus !== "all" || 
    selectedPriority !== "all" || 
    selectedCategory !== "all";

  return (
    <>
      {/* Stats Cards - NO DEBUG BOX */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-600/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Open Requests</h3>
            <Wrench className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.openCount}</p>
          <p className="text-xs text-blue-400">Awaiting attention</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">In Progress</h3>
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.inProgressCount}</p>
          <p className="text-xs text-purple-400">Being worked on</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Completed</h3>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.completedCount}</p>
          <p className="text-xs text-green-400">This period</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-red-600/10 border border-orange-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total Cost</h3>
            <DollarSign className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">KSH {stats.totalCost.toLocaleString()}</p>
          <p className="text-xs text-orange-400">Completed work</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              size="sm"
              variant="ghost"
              className="ml-auto text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Title, description..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Property
            </label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Priority
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Priorities</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Wrench className="w-4 h-4 inline mr-1" />
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Categories</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="HVAC">HVAC</option>
              <option value="APPLIANCE">Appliance</option>
              <option value="STRUCTURAL">Structural</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Showing <span className="text-orange-400 font-semibold">{filteredRequests.length}</span> of{" "}
            <span className="text-white font-semibold">{requests.length}</span> requests
          </p>
        </div>
      </div>

      {/* Maintenance Requests Cards */}
      {filteredRequests.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
          <Wrench className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No maintenance requests found</h2>
          <p className="text-gray-400 mb-6">
            {hasActiveFilters
              ? "Try adjusting your filters"
              : "Create your first maintenance request to get started"}
          </p>
          {hasActiveFilters ? (
            <Button onClick={clearFilters} variant="outline" className="border-orange-600 text-orange-400">
              Clear Filters
            </Button>
          ) : (
            <Link href="/dashboard/maintenance/new">
              <Button className="bg-gradient-to-r from-orange-600 to-red-600">
                <Wrench className="w-4 h-4 mr-2" />
                Create First Request
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((request) => {
            const daysAgo = Math.floor(
              (new Date().getTime() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={request.id}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:shadow-lg hover:border-orange-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColors[request.priority as keyof typeof priorityColors]}`}>
                    {request.priority}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[request.status as keyof typeof statusColors]}`}>
                    {request.status.replace("_", " ")}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{request.title}</h3>
                <p className="text-sm text-gray-400 flex items-center gap-1 mb-3">
                  <MapPin className="w-3 h-3" />
                  {request.units.properties.name} - Unit {request.units.unitNumber}
                </p>

                <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                  {request.description}
                </p>

                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-700">
                  <Wrench className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-400">{request.category}</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Requested by
                    </span>
                    <span className="text-white">
                      {request.users_maintenance_requests_createdByIdTousers.firstName}{" "}
                      {request.users_maintenance_requests_createdByIdTousers.lastName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Created
                    </span>
                    <span className="text-white">
                      {daysAgo === 0 ? "Today" : `${daysAgo} days ago`}
                    </span>
                  </div>
                  {request.users_maintenance_requests_assignedToIdTousers && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Assigned to
                      </span>
                      <span className="text-white">
                        {request.users_maintenance_requests_assignedToIdTousers.firstName}{" "}
                        {request.users_maintenance_requests_assignedToIdTousers.lastName}
                      </span>
                    </div>
                  )}
                </div>

                {(request.estimatedCost || request.actualCost) && (
                  <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
                    {request.actualCost ? (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Actual Cost</p>
                        <p className="text-xl font-bold text-orange-400">
                          KSH {request.actualCost.toLocaleString()}
                        </p>
                      </div>
                    ) : request.estimatedCost ? (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Estimated Cost</p>
                        <p className="text-xl font-bold text-orange-400">
                          KSH {request.estimatedCost.toLocaleString()}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                <Link href={`/dashboard/maintenance/${request.id}`}>
                  <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
