"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Home, User } from "lucide-react";

const leaseSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  unitId: z.string().min(1, "Unit is required"),
  tenantId: z.string().min(1, "Tenant is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  monthlyRent: z.string().min(1, "Monthly rent is required"),
  securityDeposit: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT"),
});

type FormData = z.infer<typeof leaseSchema>;

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  rentAmount: number;
  depositAmount: number;
  status: string;
  property: {
    id: string;
    name: string;
  };
  tenant?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
}

interface Tenant {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  unit?: {
    id: string;
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  } | null;
}

export default function LeaseForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(leaseSchema),
    defaultValues: {
      propertyId: "",
      unitId: "",
      tenantId: "",
      startDate: "",
      endDate: "",
      monthlyRent: "",
      securityDeposit: "",
      terms: "",
      status: "DRAFT",
    },
  });

  const selectedPropertyId = watch("propertyId");
  const selectedUnitId = watch("unitId");
  const selectedTenantId = watch("tenantId");

  useEffect(() => {
    fetchProperties();
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      const property = properties.find((p) => p.id === selectedPropertyId);
      setSelectedProperty(property || null);
      fetchUnitsForProperty(selectedPropertyId);
      setValue("unitId", "");
      setValue("tenantId", "");
    } else {
      setFilteredUnits([]);
      setFilteredTenants([]);
      setSelectedProperty(null);
    }
  }, [selectedPropertyId, properties]);

  useEffect(() => {
    if (selectedUnitId) {
      const unit = filteredUnits.find((u) => u.id === selectedUnitId);
      setSelectedUnit(unit || null);
      
      if (unit) {
        setValue("monthlyRent", unit.rentAmount?.toString() || "");
        setValue("securityDeposit", unit.depositAmount?.toString() || "");
        
        if (unit.tenant) {
          setValue("tenantId", unit.tenant.id);
        }
      }

      filterTenantsByPropertyAndUnit(selectedPropertyId, selectedUnitId);
    } else {
      setSelectedUnit(null);
      if (selectedPropertyId) {
        filterTenantsByProperty(selectedPropertyId);
      } else {
        setFilteredTenants(allTenants);
      }
    }
  }, [selectedUnitId, filteredUnits, selectedPropertyId]);

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

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const response = await fetch("/api/tenants?status=active");
      if (response.ok) {
        const data = await response.json();
        setAllTenants(Array.isArray(data) ? data : []);
        setFilteredTenants(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoadingTenants(false);
    }
  };

  const filterTenantsByProperty = (propertyId: string) => {
    const tenantsInProperty = allTenants.filter(
      (tenant) => tenant.unit?.property.id === propertyId || !tenant.unit
    );
    setFilteredTenants(tenantsInProperty);
  };

  const filterTenantsByPropertyAndUnit = (propertyId: string, unitId: string) => {
    const selectedUnit = filteredUnits.find((u) => u.id === unitId);
    const tenantInThisUnit = selectedUnit?.tenant ? allTenants.find((t) => t.id === selectedUnit.tenant!.id) : null;
    const tenantsInProperty = allTenants.filter((t) => t.unit?.property.id === propertyId && t.unit?.id !== unitId);
    const tenantsWithoutUnits = allTenants.filter((t) => !t.unit);
    const orderedTenants = [...(tenantInThisUnit ? [tenantInThisUnit] : []), ...tenantsInProperty, ...tenantsWithoutUnits];
    setFilteredTenants(orderedTenants);
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create lease");
      }
      router.push("/dashboard/admin/leases");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const PropertyCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Property & Unit Selection
        </CardTitle>
        <CardDescription>Select the property and unit for this lease</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="propertyId">Property *</Label>
            <Select value={selectedPropertyId} onValueChange={(value) => setValue("propertyId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {loadingProperties ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : properties.length === 0 ? (
                  <SelectItem value="empty" disabled>No properties</SelectItem>
                ) : (
                  properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.propertyId && <p className="text-sm text-red-600 mt-1">{errors.propertyId.message}</p>}
          </div>
          <div>
            <Label htmlFor="unitId">Unit *</Label>
            <Select value={selectedUnitId} onValueChange={(value) => setValue("unitId", value)} disabled={!selectedPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder={selectedPropertyId ? "Select unit" : "Select property first"} />
              </SelectTrigger>
              <SelectContent>
                {loadingUnits ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : filteredUnits.length === 0 ? (
                  <SelectItem value="empty" disabled>No units in this property</SelectItem>
                ) : (
                  filteredUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      Unit {unit.unitNumber} {unit.status === "OCCUPIED" ? "🔴" : "🟢"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.unitId && <p className="text-sm text-red-600 mt-1">{errors.unitId.message}</p>}
          </div>
        </div>
        {selectedProperty && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Home className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">{selectedProperty.name}</p>
                {selectedUnit ? (
                  <div className="text-sm text-blue-700 mt-1">
                    <p>Unit {selectedUnit.unitNumber} - Status: {selectedUnit.status}</p>
                    {selectedUnit.tenant && <p className="text-xs mt-1">Current tenant: {selectedUnit.tenant.user.firstName} {selectedUnit.tenant.user.lastName}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-blue-700 mt-1">{filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''} in this property</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const TenantCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Tenant Selection
        </CardTitle>
        <CardDescription>
          {selectedUnitId && selectedUnit?.tenant ? "Tenant in this unit shown first" : selectedPropertyId ? "Showing tenants from this property" : "Select a property to filter tenants"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <Label htmlFor="tenantId">Tenant *</Label>
          <Select value={selectedTenantId} onValueChange={(value) => setValue("tenantId", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {loadingTenants ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : filteredTenants.length === 0 ? (
                <SelectItem value="empty" disabled>No available tenants</SelectItem>
              ) : (
                filteredTenants.map((tenant) => {
                  const isCurrentTenant = selectedUnit?.tenant?.id === tenant.id;
                  return (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {isCurrentTenant && "⭐ "}{tenant.user.firstName} {tenant.user.lastName}
                      {isCurrentTenant && " (Current tenant)"}
                      {!isCurrentTenant && tenant.unit && ` (Unit ${tenant.unit.unitNumber})`}
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
          {errors.tenantId && <p className="text-sm text-red-600 mt-1">{errors.tenantId.message}</p>}
        </div>
      </CardContent>
    </Card>
  );

  const LeaseTermsCard = () => (
    <Card>
      <CardHeader>
        <CardTitle>Lease Terms</CardTitle>
        <CardDescription>Specify the lease duration and financial terms</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date *</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            {errors.startDate && <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>}
          </div>
          <div>
            <Label htmlFor="endDate">End Date *</Label>
            <Input id="endDate" type="date" {...register("endDate")} />
            {errors.endDate && <p className="text-sm text-red-600 mt-1">{errors.endDate.message}</p>}
          </div>
          <div>
            <Label htmlFor="monthlyRent">Monthly Rent (KSH) *</Label>
            <Input id="monthlyRent" type="number" step="0.01" {...register("monthlyRent")} />
            {errors.monthlyRent && <p className="text-sm text-red-600 mt-1">{errors.monthlyRent.message}</p>}
          </div>
          <div>
            <Label htmlFor="securityDeposit">Security Deposit (KSH)</Label>
            <Input id="securityDeposit" type="number" step="0.01" {...register("securityDeposit")} />
          </div>
        </div>
        <div>
          <Label htmlFor="terms">Additional Terms & Conditions</Label>
          <Textarea id="terms" rows={4} {...register("terms")} placeholder="Enter any additional lease terms..." />
        </div>
        <div>
          <Label htmlFor="status">Lease Status *</Label>
          <Select value={watch("status")} onValueChange={(value: "DRAFT" | "ACTIVE") => setValue("status", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500 mt-1">
            {watch("status") === "ACTIVE" ? "⚠️ Unit will be marked as OCCUPIED" : "💡 Save as draft to review"}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <PropertyCard />
      <TenantCard />
      <LeaseTermsCard />
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Lease"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard/admin/leases")}>Cancel</Button>
      </div>
    </form>
  );
}
