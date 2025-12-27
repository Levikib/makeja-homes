"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NotificationModal from "@/components/NotificationModal";

const propertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().optional(),
  type: z.string().min(1, "Property type is required"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  property?: any;
  mode: "create" | "edit";
}

export default function PropertyForm({ property, mode }: PropertyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: property
      ? {
          name: property.name,
          address: property.address,
          city: property.city,
          state: property.state || "",
          country: property.country,
          postalCode: property.postalCode || "",
          type: property.type,
          description: property.description || "",
        }
      : {
          name: "",
          address: "",
          city: "",
          state: "",
          country: "Kenya",
          postalCode: "",
          type: "RESIDENTIAL",
          description: "",
        },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const url = mode === "create" ? "/api/properties" : `/api/properties/${property?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save property");
      }

      setNotification({
        isOpen: true,
        type: "success",
        title: mode === "create" ? "Property Created!" : "Property Updated!",
        message: result.message || `Property ${mode === "create" ? "created" : "updated"} successfully`,
      });

      setTimeout(() => {
        router.push("/dashboard/admin/properties");
        router.refresh();
      }, 1500);
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: error.message || "Failed to save property",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white">Property Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name" className="text-gray-300">Property Name *</Label>
              <Input
                id="name"
                {...register("name")}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="e.g., Charis Apartments"
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type" className="text-gray-300">Property Type *</Label>
              <select
                id="type"
                {...register("type")}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-md px-3 py-2"
              >
                <option value="RESIDENTIAL">Residential</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="MIXED_USE">Mixed Use</option>
              </select>
              {errors.type && (
                <p className="text-red-400 text-sm mt-1">{errors.type.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address" className="text-gray-300">Address *</Label>
              <Input
                id="address"
                {...register("address")}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="Street address"
              />
              {errors.address && (
                <p className="text-red-400 text-sm mt-1">{errors.address.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="city" className="text-gray-300">City *</Label>
              <Input
                id="city"
                {...register("city")}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="e.g., Nairobi"
              />
              {errors.city && (
                <p className="text-red-400 text-sm mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state" className="text-gray-300">State/County</Label>
              <Input
                id="state"
                {...register("state")}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="e.g., Nairobi County"
              />
            </div>

            <div>
              <Label htmlFor="country" className="text-gray-300">Country *</Label>
              <Input
                id="country"
                {...register("country")}
                className="bg-gray-900 border-gray-700 text-white"
              />
              {errors.country && (
                <p className="text-red-400 text-sm mt-1">{errors.country.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="postalCode" className="text-gray-300">Postal Code</Label>
              <Input
                id="postalCode"
                {...register("postalCode")}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="00100"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description" className="text-gray-300">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="Property description..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? "Saving..." : mode === "create" ? "Create Property" : "Update Property"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/admin/properties")}
            className="border-gray-700"
          >
            Cancel
          </Button>
        </div>
      </form>

      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => {
          setNotification({ ...notification, isOpen: false });
          if (notification.type === "success") {
            router.push("/dashboard/admin/properties");
          }
        }}
      />
    </>
  );
}
