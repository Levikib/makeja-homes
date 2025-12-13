"use client";

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
import { Home, Ruler, Bed, Bath, DollarSign, ToggleLeft } from "lucide-react";

const unitSchema = z.object({
  unitNumber: z.string().min(1, "Unit number is required"),
  type: z.enum([
    "STUDIO",
    "ONE_BEDROOM",
    "TWO_BEDROOM",
    "THREE_BEDROOM",
    "PENTHOUSE",
  ]),
  floor: z.string().optional(),
  squareFeet: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  rentAmount: z.string().min(1, "Rent amount is required"),
  depositAmount: z.string().optional(),
  status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE"]),
});

type FormData = z.infer<typeof unitSchema>;

interface UnitFormProps {
  unit?: any;
  mode: "create" | "edit";
  propertyId: string;
}

export default function UnitForm({ unit, mode, propertyId }: UnitFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: unit
      ? {
          unitNumber: unit.unitNumber || "",
          type: unit.type || "ONE_BEDROOM",
          floor: unit.floor?.toString() || "",
          squareFeet: unit.squareFeet?.toString() || "",
          bedrooms: unit.bedrooms?.toString() || "",
          bathrooms: unit.bathrooms?.toString() || "",
          rentAmount: unit.rentAmount?.toString() || "",
          depositAmount: unit.depositAmount?.toString() || "",
          status: unit.status || "VACANT",
        }
      : {
          unitNumber: "",
          type: "ONE_BEDROOM",
          floor: "",
          squareFeet: "",
          bedrooms: "",
          bathrooms: "",
          rentAmount: "",
          depositAmount: "",
          status: "VACANT",
        },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        propertyId,
        floor: data.floor ? parseInt(data.floor) : null,
        squareFeet: data.squareFeet ? parseInt(data.squareFeet) : null,
        bedrooms: data.bedrooms ? parseInt(data.bedrooms) : null,
        bathrooms: data.bathrooms ? parseFloat(data.bathrooms) : null,
        rentAmount: parseFloat(data.rentAmount),
        depositAmount: data.depositAmount ? parseFloat(data.depositAmount) : null,
      };

      const url = mode === "create" ? "/api/units" : `/api/units/${unit?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save unit");
      }

      router.push(`/dashboard/properties/${propertyId}`);
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "STUDIO":
        return "Studio";
      case "ONE_BEDROOM":
        return "1 Bedroom";
      case "TWO_BEDROOM":
        return "2 Bedroom";
      case "THREE_BEDROOM":
        return "3 Bedroom";
      case "PENTHOUSE":
        return "Penthouse";
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VACANT":
        return "border-orange-500/50 bg-orange-500/10";
      case "OCCUPIED":
        return "border-green-500/50 bg-green-500/10";
      case "MAINTENANCE":
        return "border-yellow-500/50 bg-yellow-500/10";
      default:
        return "border-gray-500/50 bg-gray-500/10";
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Home className="h-6 w-6 text-purple-400" />
          Basic Information
        </h2>
        <p className="text-gray-400 mb-6">Unit identification and type</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="unitNumber" className="text-gray-300">
              Unit Number *
            </Label>
            <Input
              id="unitNumber"
              {...register("unitNumber")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
              placeholder="e.g., 101, A1, G12"
            />
            {errors.unitNumber && (
              <p className="text-sm text-red-400 mt-1">{errors.unitNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type" className="text-gray-300">
              Unit Type *
            </Label>
            <Select value={watch("type")} onValueChange={(value: any) => setValue("type", value)}>
              <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-purple-500/20">
                <SelectItem value="STUDIO">Studio</SelectItem>
                <SelectItem value="ONE_BEDROOM">1 Bedroom</SelectItem>
                <SelectItem value="TWO_BEDROOM">2 Bedroom</SelectItem>
                <SelectItem value="THREE_BEDROOM">3 Bedroom</SelectItem>
                <SelectItem value="PENTHOUSE">Penthouse</SelectItem>
              </SelectContent>
            </Select>
            {mode === "edit" && (
              <p className="text-xs text-gray-500 mt-1">
                Current: {getTypeLabel(watch("type"))}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="floor" className="text-gray-300">
              Floor
            </Label>
            <Input
              id="floor"
              type="number"
              {...register("floor")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
              placeholder="e.g., 1, 2, 3"
            />
          </div>

          <div>
            <Label htmlFor="status" className="text-gray-300">
              Status *
            </Label>
            <Select
              value={watch("status")}
              onValueChange={(value: any) => setValue("status", value)}
            >
              <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-purple-500/20">
                <SelectItem value="VACANT">Vacant</SelectItem>
                <SelectItem value="OCCUPIED">Occupied</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            {mode === "edit" && (
              <div className={`mt-2 p-2 rounded-lg border ${getStatusColor(watch("status"))}`}>
                <p className="text-xs text-gray-300">
                  Current status: {watch("status")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unit Details */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Ruler className="h-6 w-6 text-purple-400" />
          Unit Details
        </h2>
        <p className="text-gray-400 mb-6">Size and room configuration</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="squareFeet" className="text-gray-300 flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Square Feet
            </Label>
            <Input
              id="squareFeet"
              type="number"
              {...register("squareFeet")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
              placeholder="e.g., 750"
            />
          </div>

          <div>
            <Label htmlFor="bedrooms" className="text-gray-300 flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Bedrooms
            </Label>
            <Input
              id="bedrooms"
              type="number"
              {...register("bedrooms")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
              placeholder="e.g., 2"
            />
          </div>

          <div>
            <Label htmlFor="bathrooms" className="text-gray-300 flex items-center gap-2">
              <Bath className="h-4 w-4" />
              Bathrooms
            </Label>
            <Input
              id="bathrooms"
              type="number"
              step="0.5"
              {...register("bathrooms")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
              placeholder="e.g., 1.5"
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-purple-400" />
          Pricing
        </h2>
        <p className="text-gray-400 mb-6">Rent and deposit amounts</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="rentAmount" className="text-gray-300">
              Monthly Rent (KSH) *
            </Label>
            <Input
              id="rentAmount"
              type="number"
              step="0.01"
              {...register("rentAmount")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
              placeholder="e.g., 25000"
            />
            {errors.rentAmount && (
              <p className="text-sm text-red-400 mt-1">{errors.rentAmount.message}</p>
            )}
            {mode === "edit" && watch("rentAmount") && (
              <p className="text-xs text-green-400 mt-1">
                Current: KSH {parseFloat(watch("rentAmount")).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="depositAmount" className="text-gray-300">
              Security Deposit (KSH)
            </Label>
            <Input
              id="depositAmount"
              type="number"
              step="0.01"
              {...register("depositAmount")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
              placeholder="e.g., 50000"
            />
            {mode === "edit" && watch("depositAmount") && (
              <p className="text-xs text-green-400 mt-1">
                Current: KSH {parseFloat(watch("depositAmount")).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all font-medium text-white shadow-lg"
        >
          {mode === "create" ? "Create Unit" : "Update Unit"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/properties/${propertyId}`)}
          className="px-6 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-all font-medium text-white border border-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
