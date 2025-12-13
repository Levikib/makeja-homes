"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { AlertTriangle, Building2, DollarSign, Wrench } from "lucide-react";

const maintenanceSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  unitId: z.string().min(1, "Unit is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  category: z.string().optional(),
  estimatedCost: z.string().optional(),
  status: z.string().optional(),
  assignedToId: z.string().optional(),
  actualCost: z.string().optional(),
  completionNotes: z.string().optional(),
});

type FormData = z.infer<typeof maintenanceSchema>;

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  property: {
    id: string;
    name: string;
  };
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface MaintenanceFormProps {
  request?: any;
  mode: "create" | "edit";
}

export default function MaintenanceForm({ request, mode }: MaintenanceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: request
      ? {
          propertyId: request.unit?.property.id || "",
          unitId: request.unitId || "",
          title: request.title || "",
          description: request.description || "",
          priority: request.priority || "MEDIUM",
          category: request.category || "",
          estimatedCost: request.estimatedCost?.toString() || "",
          status: request.status || "PENDING",
          assignedToId: request.assignedTo?.id || "",
          actualCost: request.actualCost?.toString() || "",
          completionNotes: request.completionNotes || "",
        }
      : {
          propertyId: "",
          unitId: "",
          title: "",
          description: "",
          priority: "MEDIUM",
          category: "",
          estimatedCost: "",
          status: "PENDING",
          assignedToId: "",
          actualCost: "",
          completionNotes: "",
        },
  });

  const selectedPropertyId = watch("propertyId");
  const selectedPriority = watch("priority");
  const selectedStatus = watch("status");

  useEffect(() => {
    fetchProperties();
    fetchStaff();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchUnitsForProperty(selectedPropertyId);
    } else {
      setFilteredUnits([]);
    }
  }, [selectedPropertyId]);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await fetch("/api/properties");
      if (response.ok) {
        const data = await response.json();
        setProperties(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchUnitsForProperty = async (propertyId: string) => {
    try {
      setLoadingUnits(true);
      const response = await fetch(`/api/units?propertyId=${propertyId}`);
      if (response.ok) {
        const data = await response.json();
        setFilteredUnits(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch units:", error);
    } finally {
      setLoadingUnits(false);
    }
  };

  const fetchStaff = async () => {
    try {
      setLoadingStaff(true);
      const response = await fetch("/api/users?role=CARETAKER");
      if (response.ok) {
        const data = await response.json();
        setStaff(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const url = mode === "create" ? "/api/maintenance" : `/api/maintenance/${request?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save maintenance request");
      }

      router.push("/dashboard/admin/maintenance");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "border-red-500/50 bg-red-500/10";
      case "HIGH":
        return "border-orange-500/50 bg-orange-500/10";
      case "MEDIUM":
        return "border-yellow-500/50 bg-yellow-500/10";
      case "LOW":
        return "border-blue-500/50 bg-blue-500/10";
      default:
        return "border-gray-500/50 bg-gray-500/10";
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Property & Unit */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-purple-400" />
          Location
        </h2>
        <p className="text-gray-400 mb-6">Select the property and unit for this request</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="propertyId" className="text-gray-300">
              Property *
            </Label>
            <Select
              value={watch("propertyId")}
              onValueChange={(value) => {
                setValue("propertyId", value);
                setValue("unitId", "");
              }}
            >
              <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-purple-500/20">
                {loadingProperties ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : properties.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    No properties
                  </SelectItem>
                ) : (
                  properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.propertyId && (
              <p className="text-sm text-red-400 mt-1">{errors.propertyId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="unitId" className="text-gray-300">
              Unit *
            </Label>
            <Select
              value={watch("unitId")}
              onValueChange={(value) => setValue("unitId", value)}
              disabled={!selectedPropertyId}
            >
              <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
                <SelectValue
                  placeholder={selectedPropertyId ? "Select unit" : "Select property first"}
                />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-purple-500/20">
                {loadingUnits ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : filteredUnits.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    No units
                  </SelectItem>
                ) : (
                  filteredUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      Unit {unit.unitNumber}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.unitId && <p className="text-sm text-red-400 mt-1">{errors.unitId.message}</p>}
          </div>
        </div>
      </div>

      {/* Request Details */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Wrench className="h-6 w-6 text-purple-400" />
          Request Details
        </h2>
        <p className="text-gray-400 mb-6">Describe the maintenance issue</p>

        <div className="space-y-6">
          <div>
            <Label htmlFor="title" className="text-gray-300">
              Title *
            </Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="e.g., Leaking faucet in kitchen"
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.title && <p className="text-sm text-red-400 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-300">
              Description *
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              rows={4}
              placeholder="Provide detailed information about the issue..."
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.description && (
              <p className="text-sm text-red-400 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="priority" className="text-gray-300">
                Priority *
              </Label>
              <Select
                value={selectedPriority}
                onValueChange={(value: any) => setValue("priority", value)}
              >
                <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20">
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span>Urgent</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {selectedPriority && (
                <div className={`mt-2 p-3 rounded-lg border ${getPriorityColor(selectedPriority)}`}>
                  <p className="text-xs text-gray-300">
                    {selectedPriority === "URGENT" &&
                      "⚠️ Requires immediate attention - will be prioritized"}
                    {selectedPriority === "HIGH" && "High priority - will be addressed soon"}
                    {selectedPriority === "MEDIUM" && "Normal priority - standard timeline"}
                    {selectedPriority === "LOW" && "Low priority - can be scheduled flexibly"}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="category" className="text-gray-300">
                Category
              </Label>
              <Select
                value={watch("category") || ""}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20">
                  <SelectItem value="PLUMBING">Plumbing</SelectItem>
                  <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                  <SelectItem value="HVAC">HVAC</SelectItem>
                  <SelectItem value="APPLIANCE">Appliance</SelectItem>
                  <SelectItem value="STRUCTURAL">Structural</SelectItem>
                  <SelectItem value="COSMETIC">Cosmetic</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment & Status (Edit mode only) */}
      {mode === "edit" && (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Wrench className="h-6 w-6 text-purple-400" />
            Assignment & Status
          </h2>
          <p className="text-gray-400 mb-6">Manage request assignment and progress</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="assignedToId" className="text-gray-300">
                Assign To
              </Label>
              <Select
                value={watch("assignedToId") || ""}
                onValueChange={(value) => setValue("assignedToId", value)}
              >
                <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20">
                  <SelectItem value="">Unassigned</SelectItem>
                  {loadingStaff ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    staff.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.firstName} {person.lastName} ({person.role})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status" className="text-gray-300">
                Status
              </Label>
              <Select
                value={selectedStatus || "PENDING"}
                onValueChange={(value) => setValue("status", value)}
              >
                <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20">
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="AWAITING_PARTS">Awaiting Parts</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Cost Information */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-purple-400" />
          Cost Information
        </h2>
        <p className="text-gray-400 mb-6">Estimated and actual costs for this maintenance</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="estimatedCost" className="text-gray-300">
              Estimated Cost (KSH)
            </Label>
            <Input
              id="estimatedCost"
              type="number"
              step="0.01"
              {...register("estimatedCost")}
              placeholder="0.00"
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
          </div>

          {mode === "edit" && (
            <div>
              <Label htmlFor="actualCost" className="text-gray-300">
                Actual Cost (KSH)
              </Label>
              <Input
                id="actualCost"
                type="number"
                step="0.01"
                {...register("actualCost")}
                placeholder="0.00"
                className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Completion Notes (Edit mode only) */}
      {mode === "edit" && (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Completion Notes</h2>
          <p className="text-gray-400 mb-6">Add notes about the work completed</p>

          <Textarea
            {...register("completionNotes")}
            rows={4}
            placeholder="Describe the work completed, parts used, etc..."
            className="bg-gray-900/50 border-purple-500/20 text-white"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading
            ? "Saving..."
            : mode === "create"
            ? "Create Request"
            : "Update Request"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/admin/maintenance")}
          className="px-6 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-all font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
