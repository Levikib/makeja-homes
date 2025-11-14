"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const tenantSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  unitId: z.string().optional(),
  nationalId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  occupation: z.string().optional(),
  employer: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  moveInDate: z.string().optional(),
});

type FormData = z.infer<typeof tenantSchema>;

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  type: string;
  property: {
    id: string;
    name: string;
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
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: tenant ? {
      firstName: tenant.user?.firstName || "",
      lastName: tenant.user?.lastName || "",
      email: tenant.user?.email || "",
      phoneNumber: tenant.user?.phoneNumber || "",
      unitId: tenant.unitId || "",
      nationalId: tenant.nationalId || "",
      dateOfBirth: tenant.dateOfBirth ? new Date(tenant.dateOfBirth).toISOString().split('T')[0] : "",
      occupation: tenant.occupation || "",
      employer: tenant.employer || "",
      emergencyContactName: tenant.emergencyContactName || "",
      emergencyContactPhone: tenant.emergencyContactPhone || "",
      emergencyContactRelation: tenant.emergencyContactRelation || "",
      moveInDate: tenant.moveInDate ? new Date(tenant.moveInDate).toISOString().split('T')[0] : "",
    } : {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      unitId: "",
      nationalId: "",
      dateOfBirth: "",
      occupation: "",
      employer: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
      moveInDate: "",
    },
  });

  const selectedUnitId = watch("unitId");

  useEffect(() => {
    fetchProperties();
  }, []);

  // When property changes, fetch vacant units for that property
  useEffect(() => {
    if (selectedPropertyId) {
      fetchVacantUnitsByProperty(selectedPropertyId);
      setValue("unitId", ""); // Reset unit selection
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

  const fetchVacantUnitsByProperty = async (propertyId: string) => {
    try {
      setLoadingUnits(true);
      // Fetch ONLY vacant units for the selected property
      const response = await fetch(`/api/units?propertyId=${propertyId}&status=VACANT`);
      if (response.ok) {
        const data = await response.json();
        setFilteredUnits(Array.isArray(data) ? data : []);
      } else {
        setFilteredUnits([]);
      }
    } catch (error) {
      console.error("Failed to fetch units:", error);
      setFilteredUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const url = mode === "create" ? "/api/tenants" : `/api/tenants/${tenant?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Basic tenant details and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                {...register("firstName")}
                disabled={mode === "edit"}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                {...register("lastName")}
                disabled={mode === "edit"}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                disabled={mode === "edit"}
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                {...register("phoneNumber")}
                placeholder="+254..."
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-600 mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="nationalId">National ID</Label>
              <Input id="nationalId" {...register("nationalId")} />
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Employment Information</CardTitle>
          <CardDescription>Tenant's occupation and employer details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="occupation">Occupation</Label>
              <Input id="occupation" {...register("occupation")} />
            </div>

            <div>
              <Label htmlFor="employer">Employer</Label>
              <Input id="employer" {...register("employer")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
          <CardDescription>Contact person in case of emergency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="emergencyContactName">Name</Label>
              <Input id="emergencyContactName" {...register("emergencyContactName")} />
            </div>

            <div>
              <Label htmlFor="emergencyContactPhone">Phone</Label>
              <Input id="emergencyContactPhone" {...register("emergencyContactPhone")} placeholder="+254..." />
            </div>

            <div>
              <Label htmlFor="emergencyContactRelation">Relation</Label>
              <Input id="emergencyContactRelation" {...register("emergencyContactRelation")} placeholder="e.g., Spouse, Parent" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Assignment - CASCADING DROPDOWNS */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Assignment</CardTitle>
          <CardDescription>Assign tenant to a property and vacant unit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Property Selection */}
            <div>
              <Label htmlFor="propertyId">Property</Label>
              <Select
                value={selectedPropertyId || "none"}
                onValueChange={(value) => {
                  setSelectedPropertyId(value === "none" ? "" : value);
                }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select property first" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="none">No property selected</SelectItem>
                  {loadingProperties ? (
                    <SelectItem value="loading" disabled>
                      Loading properties...
                    </SelectItem>
                  ) : properties.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      No properties available
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
            </div>

            {/* Unit Selection - ONLY Vacant Units Filtered by Property */}
            <div>
              <Label htmlFor="unitId">Vacant Unit</Label>
              <Select
                value={selectedUnitId || "none"}
                onValueChange={(value) =>
                  setValue("unitId", value === "none" ? "" : value)
                }
                disabled={!selectedPropertyId}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue
                    placeholder={
                      selectedPropertyId
                        ? loadingUnits
                          ? "Loading..."
                          : "Select vacant unit"
                        : "Select property first"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="none">No unit assigned</SelectItem>
                  {loadingUnits ? (
                    <SelectItem value="loading" disabled>
                      Loading units...
                    </SelectItem>
                  ) : filteredUnits.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      {selectedPropertyId 
                        ? "No vacant units in this property"
                        : "Select a property first"}
                    </SelectItem>
                  ) : (
                    filteredUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        Unit {unit.unitNumber} - {unit.type.replace(/_/g, " ")}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Move-in Date */}
            <div>
              <Label htmlFor="moveInDate">Move-in Date</Label>
              <Input id="moveInDate" type="date" {...register("moveInDate")} />
            </div>
          </div>

          {/* Info message */}
          {selectedPropertyId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                {loadingUnits ? (
                  "🔄 Loading vacant units..."
                ) : filteredUnits.length > 0 ? (
                  `✅ ${filteredUnits.length} vacant unit${filteredUnits.length !== 1 ? 's' : ''} available in this property`
                ) : (
                  "⚠️ No vacant units available in this property"
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : mode === "create" ? "Create Tenant" : "Update Tenant"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/admin/tenants")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
