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

interface Unit {
  id: string;
  unitNumber: string;
  property: {
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
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);

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
    fetchVacantUnits();
  }, []);

  const fetchVacantUnits = async () => {
    try {
      setLoadingUnits(true);
      const response = await fetch("/api/units?status=VACANT");
      if (response.ok) {
        const data = await response.json();
        setUnits(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch units:", error);
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
              <Input id="emergencyContactPhone" {...register("emergencyContactPhone")} />
            </div>

            <div>
              <Label htmlFor="emergencyContactRelation">Relation</Label>
              <Input id="emergencyContactRelation" {...register("emergencyContactRelation")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Assignment</CardTitle>
          <CardDescription>Assign tenant to a unit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unitId">Unit</Label>
              <Select
                value={selectedUnitId || "none"}
                onValueChange={(value) => setValue("unitId", value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No unit assigned</SelectItem>
                  {loadingUnits ? (
                    <SelectItem value="loading" disabled>Loading units...</SelectItem>
                  ) : units.length === 0 ? (
                    <SelectItem value="empty" disabled>No vacant units available</SelectItem>
                  ) : (
                    units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.property.name} - {unit.unitNumber}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="moveInDate">Move-in Date</Label>
              <Input id="moveInDate" type="date" {...register("moveInDate")} />
            </div>
          </div>
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
