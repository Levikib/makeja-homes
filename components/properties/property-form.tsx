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
import { Building2, MapPin, Users, Shield } from "lucide-react";

const propertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  type: z.string().min(1, "Property type is required"),
  description: z.string().optional(),
  managerIds: z.array(z.string()).optional(),
  caretakerIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  property?: any;
  mode: "create" | "edit";
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function PropertyForm({ property, mode }: PropertyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<User[]>([]);
  const [caretakers, setCaretakers] = useState<User[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedCaretakers, setSelectedCaretakers] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
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
          type: "",
          description: "",
        },
  });

  useEffect(() => {
    fetchManagers();
    fetchCaretakers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await fetch("/api/users?role=MANAGER&status=active");
      if (response.ok) {
        const data = await response.json();
        setManagers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch managers:", error);
    }
  };

  const fetchCaretakers = async () => {
    try {
      const response = await fetch("/api/users?role=CARETAKER&status=active");
      if (response.ok) {
        const data = await response.json();
        setCaretakers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch caretakers:", error);
    }
  };

  const toggleManager = (managerId: string) => {
    setSelectedManagers((prev) =>
      prev.includes(managerId)
        ? prev.filter((id) => id !== managerId)
        : [...prev, managerId]
    );
  };

  const toggleCaretaker = (caretakerId: string) => {
    setSelectedCaretakers((prev) =>
      prev.includes(caretakerId)
        ? prev.filter((id) => id !== caretakerId)
        : [...prev, caretakerId]
    );
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const payload = {
        ...data,
        managerIds: selectedManagers,
        caretakerIds: selectedCaretakers,
      };

      const url = mode === "create" ? "/api/properties" : `/api/properties/${property?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save property");
      }

      router.push("/dashboard/properties");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-purple-400" />
          Basic Information
        </h2>
        <p className="text-gray-400 mb-6">Property identification and type</p>

        <div className="space-y-6">
          <div>
            <Label htmlFor="name" className="text-gray-300">
              Property Name *
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Sunset Apartments"
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.name && (
              <p className="text-sm text-red-400 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type" className="text-gray-300">
              Property Type *
            </Label>
            <Select
              value={watch("type")}
              onValueChange={(value) => setValue("type", value)}
            >
              <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-purple-500/20">
                <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                <SelectItem value="MIXED">Mixed Use</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-400 mt-1">{errors.type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-300">
              Description
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              rows={3}
              placeholder="Brief description of the property..."
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <MapPin className="h-6 w-6 text-purple-400" />
          Location
        </h2>
        <p className="text-gray-400 mb-6">Property address details</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="address" className="text-gray-300">
              Street Address *
            </Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="e.g., 123 Main Street"
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.address && (
              <p className="text-sm text-red-400 mt-1">{errors.address.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="city" className="text-gray-300">
              City *
            </Label>
            <Input
              id="city"
              {...register("city")}
              placeholder="e.g., Nairobi"
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.city && (
              <p className="text-sm text-red-400 mt-1">{errors.city.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="state" className="text-gray-300">
              State/County
            </Label>
            <Input
              id="state"
              {...register("state")}
              placeholder="e.g., Nairobi County"
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
          </div>

          <div>
            <Label htmlFor="postalCode" className="text-gray-300">
              Postal Code
            </Label>
            <Input
              id="postalCode"
              {...register("postalCode")}
              placeholder="e.g., 00100"
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
          </div>

          <div>
            <Label htmlFor="country" className="text-gray-300">
              Country *
            </Label>
            <Input
              id="country"
              {...register("country")}
              placeholder="e.g., Kenya"
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.country && (
              <p className="text-sm text-red-400 mt-1">{errors.country.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Staff Assignment */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="h-6 w-6 text-purple-400" />
          Property Managers
        </h2>
        <p className="text-gray-400 mb-6">
          Assign managers to this property (can select multiple)
        </p>

        {managers.length === 0 ? (
          <p className="text-gray-500 text-sm">No managers available. Create managers first.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {managers.map((manager) => (
              <div
                key={manager.id}
                onClick={() => toggleManager(manager.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedManagers.includes(manager.id)
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-purple-500/20 bg-gray-900/30 hover:border-purple-500/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedManagers.includes(manager.id)
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-500"
                    }`}
                  >
                    {selectedManagers.includes(manager.id) && (
                      <Shield className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {manager.firstName} {manager.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{manager.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Caretakers Assignment */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="h-6 w-6 text-purple-400" />
          Caretakers
        </h2>
        <p className="text-gray-400 mb-6">
          Assign caretakers to this property (can select multiple)
        </p>

        {caretakers.length === 0 ? (
          <p className="text-gray-500 text-sm">No caretakers available. Create caretakers first.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {caretakers.map((caretaker) => (
              <div
                key={caretaker.id}
                onClick={() => toggleCaretaker(caretaker.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedCaretakers.includes(caretaker.id)
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-purple-500/20 bg-gray-900/30 hover:border-purple-500/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedCaretakers.includes(caretaker.id)
                        ? "border-green-500 bg-green-500"
                        : "border-gray-500"
                    }`}
                  >
                    {selectedCaretakers.includes(caretaker.id) && (
                      <Users className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {caretaker.firstName} {caretaker.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{caretaker.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? "Saving..." : mode === "create" ? "Create Property" : "Update Property"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/properties")}
          className="px-6 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-all font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
