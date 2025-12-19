"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, MapPin, Loader2 } from "lucide-react";
import NotificationModal from "@/components/NotificationModal";

const propertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(1, "Country is required"),
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
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: property
      ? {
          name: property.name || "",
          address: property.address || "",
          city: property.city || "",
          state: property.state || "",
          postalCode: property.postalCode || "",
          country: property.country || "",
          type: property.type || "",
          description: property.description || "",
        }
      : {
          name: "",
          address: "",
          city: "",
          state: "",
          postalCode: "",
          country: "Kenya",
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

      if (response.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: mode === "create" ? "Property Created!" : "Property Updated!",
          message: mode === "create" 
            ? `${data.name} has been successfully created.`
            : `${data.name} has been successfully updated.`,
        });

        // Redirect after 1.5 seconds
        setTimeout(() => {
          router.push("/dashboard/admin/properties");
          router.refresh();
        }, 1500);
      } else {
        const errorData = await response.json();
        setNotification({
          isOpen: true,
          type: "error",
          title: "Operation Failed",
          message: errorData.error || `Failed to ${mode === "create" ? "create" : "update"} property. Please try again.`,
        });
      }
    } catch (error) {
      console.error("Error saving property:", error);
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-cyan-400">Basic Information</h3>
              <p className="text-sm text-gray-400">Property identification and type</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="name" className="text-gray-300">
                Property Name *
              </Label>
              <Input
                id="name"
                {...register("name")}
                className="mt-2 bg-gray-900/50 border-gray-700 text-white"
                placeholder="e.g., Charis Apartments"
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="type" className="text-gray-300">
                Property Type *
              </Label>
              <select
                id="type"
                {...register("type")}
                className="mt-2 w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="RESIDENTIAL">Residential</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="MIXED_USE">Mixed Use</option>
              </select>
              {errors.type && (
                <p className="text-red-400 text-sm mt-1">{errors.type.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-400">Location Details</h3>
              <p className="text-sm text-gray-400">Property address and location</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="address" className="text-gray-300">
                Street Address *
              </Label>
              <Input
                id="address"
                {...register("address")}
                className="mt-2 bg-gray-900/50 border-gray-700 text-white"
                placeholder="e.g., 123 Main Street"
              />
              {errors.address && (
                <p className="text-red-400 text-sm mt-1">{errors.address.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="city" className="text-gray-300">
                City *
              </Label>
              <Input
                id="city"
                {...register("city")}
                className="mt-2 bg-gray-900/50 border-gray-700 text-white"
                placeholder="e.g., Nairobi"
              />
              {errors.city && (
                <p className="text-red-400 text-sm mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state" className="text-gray-300">
                State/County
              </Label>
              <Input
                id="state"
                {...register("state")}
                className="mt-2 bg-gray-900/50 border-gray-700 text-white"
                placeholder="e.g., Nairobi County"
              />
            </div>

            <div>
              <Label htmlFor="country" className="text-gray-300">
                Country *
              </Label>
              <Input
                id="country"
                {...register("country")}
                className="mt-2 bg-gray-900/50 border-gray-700 text-white"
                placeholder="e.g., Kenya"
              />
              {errors.country && (
                <p className="text-red-400 text-sm mt-1">{errors.country.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="postalCode" className="text-gray-300">
                Postal Code
              </Label>
              <Input
                id="postalCode"
                {...register("postalCode")}
                className="mt-2 bg-gray-900/50 border-gray-700 text-white"
                placeholder="e.g., 00100"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-4">Description</h3>
          <Textarea
            {...register("description")}
            className="bg-gray-900/50 border-gray-700 text-white min-h-[120px]"
            placeholder="Enter property description, amenities, or additional details..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/properties")}
            className="px-6 py-3 rounded-lg font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-all"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading
              ? mode === "create"
                ? "Creating..."
                : "Updating..."
              : mode === "create"
              ? "Create Property"
              : "Update Property"}
          </button>
        </div>
      </form>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => {
          setNotification({ ...notification, isOpen: false });
          if (notification.type === "success") {
            router.push("/dashboard/admin/properties");
            router.refresh();
          }
        }}
      />
    </>
  );
}
