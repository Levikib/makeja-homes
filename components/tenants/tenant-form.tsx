"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Mail, Phone, Building2, Home, Calendar, DollarSign } from "lucide-react";

const tenantSchema = z.object({
  // User fields
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  password: z.string().optional(),

  // Tenant fields
  propertyId: z.string().min(1, "Property is required"),
  unitId: z.string().min(1, "Unit is required"),
  leaseStartDate: z.string().min(1, "Lease start date is required"),
  leaseEndDate: z.string().min(1, "Lease end date is required"),
  rentAmount: z.string().min(1, "Rent amount is required"),
  depositAmount: z.string().min(1, "Security deposit is required"),
});

type FormData = z.infer<typeof tenantSchema>;

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  rentAmount: number;
  property: {
    id: string;
  };
}

interface TenantFormProps {
  tenant?: any;
  mode: "create" | "edit";
}

export default function TenantForm({ tenant, mode }: TenantFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: tenant
      ? {
          firstName: tenant.user?.firstName || "",
          lastName: tenant.user?.lastName || "",
          email: tenant.user?.email || "",
          phoneNumber: tenant.user?.phoneNumber || "",
          password: "",
          propertyId: tenant.unit?.property?.id || "",
          unitId: tenant.unitId || "",
          leaseStartDate: tenant.leaseStartDate
            ? new Date(tenant.leaseStartDate).toISOString().split("T")[0]
            : "",
          leaseEndDate: tenant.leaseEndDate
            ? new Date(tenant.leaseEndDate).toISOString().split("T")[0]
            : "",
          rentAmount: tenant.rentAmount?.toString() || "",
          depositAmount: tenant.depositAmount?.toString() || "",
        }
      : {
          firstName: "",
          lastName: "",
          email: "",
          phoneNumber: "",
          password: "",
          propertyId: "",
          unitId: "",
          leaseStartDate: "",
          leaseEndDate: "",
          rentAmount: "",
          depositAmount: "",
        },
  });

  const selectedPropertyId = watch("propertyId");
  const selectedUnitId = watch("unitId");

  useEffect(() => {
    fetchProperties();
    fetchUnits();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      const filtered = units.filter((u) => u.property.id === selectedPropertyId);
      setFilteredUnits(filtered);
    } else {
      setFilteredUnits([]);
    }
  }, [selectedPropertyId, units]);

  useEffect(() => {
    if (selectedUnitId) {
      const unit = units.find((u) => u.id === selectedUnitId);
      if (unit && !watch("rentAmount")) {
        setValue("rentAmount", unit.rentAmount.toString());
        setValue("depositAmount", unit.rentAmount.toString());
      }
    }
  }, [selectedUnitId, units]);

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/properties");
      if (response.ok) {
        const data = await response.json();
        setProperties(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    }
  };

  const fetchUnits = async () => {
    try {
      // In edit mode, fetch vacant units + current unit
      // In create mode, fetch only vacant units
      const currentUnitId = tenant?.unitId || "";
      const response = await fetch(`/api/units?status=VACANT${currentUnitId ? `&includeUnit=${currentUnitId}` : ""}`);
      if (response.ok) {
        const data = await response.json();
        setUnits(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch units:", error);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const payload = {
        ...data,
        rentAmount: parseFloat(data.rentAmount),
        depositAmount: parseFloat(data.depositAmount),
      };

      const url = mode === "create" ? "/api/tenants" : `/api/tenants/${tenant?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save tenant");
      }

      router.push("/dashboard/admin/tenants");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Information */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <User className="h-6 w-6 text-purple-400" />
          Personal Information
        </h2>
        <p className="text-gray-400 mb-6">Tenant contact details</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="firstName" className="text-gray-300">
              First Name *
            </Label>
            <Input
              id="firstName"
              {...register("firstName")}
              disabled={mode === "edit"}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1 disabled:opacity-50"
            />
            {errors.firstName && (
              <p className="text-sm text-red-400 mt-1">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="lastName" className="text-gray-300">
              Last Name *
            </Label>
            <Input
              id="lastName"
              {...register("lastName")}
              disabled={mode === "edit"}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1 disabled:opacity-50"
            />
            {errors.lastName && (
              <p className="text-sm text-red-400 mt-1">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-300 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              disabled={mode === "edit"}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1 disabled:opacity-50"
            />
            {errors.email && <p className="text-sm text-red-400 mt-1">{errors.email.message}</p>}
            {mode === "edit" && (
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            )}
          </div>

          <div>
            <Label htmlFor="phoneNumber" className="text-gray-300 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number *
            </Label>
            <Input
              id="phoneNumber"
              {...register("phoneNumber")}
              placeholder="+254..."
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.phoneNumber && (
              <p className="text-sm text-red-400 mt-1">{errors.phoneNumber.message}</p>
            )}
          </div>

          {mode === "create" && (
            <div className="md:col-span-2">
              <Label htmlFor="password" className="text-gray-300">
                Password *
              </Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="Temporary password for tenant login"
                className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tenant will be required to change this on first login
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unit Assignment */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-purple-400" />
          Unit Assignment
        </h2>
        <p className="text-gray-400 mb-6">Select property and unit</p>

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
              disabled={mode === "edit"}
            >
              <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-purple-500/20">
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
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
              disabled={!selectedPropertyId || mode === "edit"}
            >
              <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
                <SelectValue
                  placeholder={selectedPropertyId ? "Select unit" : "Select property first"}
                />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-purple-500/20">
                {filteredUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    Unit {unit.unitNumber} - KSH {unit.rentAmount.toLocaleString()}/mo
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.unitId && <p className="text-sm text-red-400 mt-1">{errors.unitId.message}</p>}
          </div>
        </div>
      </div>

      {/* Lease Details */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-purple-400" />
          Lease Details
        </h2>
        <p className="text-gray-400 mb-6">Lease period and financial terms</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="leaseStartDate" className="text-gray-300">
              Lease Start Date *
            </Label>
            <Input
              id="leaseStartDate"
              type="date"
              {...register("leaseStartDate")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.leaseStartDate && (
              <p className="text-sm text-red-400 mt-1">{errors.leaseStartDate.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="leaseEndDate" className="text-gray-300">
              Lease End Date *
            </Label>
            <Input
              id="leaseEndDate"
              type="date"
              {...register("leaseEndDate")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.leaseEndDate && (
              <p className="text-sm text-red-400 mt-1">{errors.leaseEndDate.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="rentAmount" className="text-gray-300 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Monthly Rent (KSH) *
            </Label>
            <Input
              id="rentAmount"
              type="number"
              step="0.01"
              {...register("rentAmount")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.rentAmount && (
              <p className="text-sm text-red-400 mt-1">{errors.rentAmount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="depositAmount" className="text-gray-300 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Security Deposit (KSH) *
            </Label>
            <Input
              id="depositAmount"
              type="number"
              step="0.01"
              {...register("depositAmount")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.depositAmount && (
              <p className="text-sm text-red-400 mt-1">{errors.depositAmount.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Typically equal to one month's rent
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-white shadow-lg"
        >
          {loading ? "Saving..." : mode === "create" ? "Create Tenant" : "Update Tenant"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/admin/tenants")}
          className="px-6 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-all font-medium text-white border border-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
