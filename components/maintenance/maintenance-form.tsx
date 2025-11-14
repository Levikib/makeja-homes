"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const maintenanceFormSchema = z.object({
  unitId: z.string().min(1, "Unit is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.coerce.number().int().min(1).max(3),
  estimatedCost: z.coerce.number().min(0).optional(),
  requestedStartDate: z.string().optional(),
  requestedEndDate: z.string().optional(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

interface MaintenanceFormProps {
  requestId?: string;
  initialData?: Partial<any>;
  unitIdFromUrl?: string;
  userRole?: string;
  userUnitId?: string;
}

export default function MaintenanceForm({
  requestId,
  initialData,
  unitIdFromUrl,
  userRole,
  userUnitId,
}: MaintenanceFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  // Determine the default unit ID
  const defaultUnitId = userRole === "TENANT"
    ? userUnitId
    : unitIdFromUrl || searchParams.get("unitId") || "";

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          estimatedCost: initialData.estimatedCost?.toString() || "",
          requestedStartDate: initialData.requestedStartDate
            ? new Date(initialData.requestedStartDate).toISOString().split("T")[0]
            : "",
          requestedEndDate: initialData.requestedEndDate
            ? new Date(initialData.requestedEndDate).toISOString().split("T")[0]
            : "",
        }
      : {
          unitId: defaultUnitId,
          title: "",
          description: "",
          priority: 2,
          estimatedCost: 0,
          requestedStartDate: "",
          requestedEndDate: "",
        },
  });

  // Fetch units and properties for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        // If tenant, they can only select their unit (pre-filled)
        if (userRole !== "TENANT") {
          const [unitsResponse, propertiesResponse] = await Promise.all([
            fetch("/api/units?includeProperty=true"),
            fetch("/api/properties"),
          ]);

          const unitsData = await unitsResponse.json();
          const propertiesData = await propertiesResponse.json();

          if (unitsData.success) {
            setUnits(unitsData.data);
          }

          if (propertiesData.success) {
            setProperties(propertiesData.data);
          }
        } else if (userUnitId) {
          // Fetch just the tenant's unit for display
          const response = await fetch(`/api/units/${userUnitId}`);
          const data = await response.json();
          if (data.success) {
            setUnits([data.data]);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
  }, [userRole, userUnitId]);

  const onSubmit = async (values: MaintenanceFormValues) => {
    try {
      setLoading(true);

      const payload = {
        ...values,
        priority: Number(values.priority),
        estimatedCost: values.estimatedCost ? Number(values.estimatedCost) : 0,
      };

      const url = requestId
        ? `/api/maintenance/${requestId}`
        : "/api/maintenance";
      const method = requestId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        if (userRole === "TENANT") {
          router.push("/dashboard/tenant/maintenance");
        } else {
          router.push("/dashboard/maintenance");
        }
        router.refresh();
      } else {
        alert(data.error || "Failed to save maintenance request");
      }
    } catch (error) {
      console.error("Error saving maintenance request:", error);
      alert("An error occurred while saving the maintenance request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="unitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={userRole === "TENANT" || !!unitIdFromUrl}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.unitNumber} - {unit.property?.name || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Leaking faucet in kitchen" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide detailed description of the issue"
                      className="resize-none"
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Be as detailed as possible to help us understand the issue
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">High (Urgent/Emergency)</SelectItem>
                      <SelectItem value="2">Medium (Important)</SelectItem>
                      <SelectItem value="3">Low (Can wait)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="estimatedCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Cost</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g., 5000"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional: If you have an estimate (in Kenyan Shillings)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requestedStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requested Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>When should work begin?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requestedEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requested End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>When should work be done?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : requestId
              ? "Update Request"
              : "Submit Request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
