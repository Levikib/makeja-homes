"use client";

import { useState } from "react";
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
import { Shield, UserCog, Users, Package } from "lucide-react";

const userSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER"], {
    required_error: "Role is required",
  }),
  password: z.string().optional(),
});

type FormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: any;
  mode: "create" | "edit";
}

export default function UserForm({ user, mode }: UserFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(userSchema),
    defaultValues: user
      ? {
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          phoneNumber: user.phoneNumber || "",
          role: user.role || "CARETAKER",
          password: "",
        }
      : {
          firstName: "",
          lastName: "",
          email: "",
          phoneNumber: "",
          role: "CARETAKER",
          password: "",
        },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      // For edit mode, don't send password if empty
      const submitData = { ...data };
      if (mode === "edit" && !submitData.password) {
        delete submitData.password;
      }

      const url = mode === "create" ? "/api/users" : `/api/users/${user?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save user");
      }

      router.push("/dashboard/admin/users");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="h-5 w-5 text-red-400" />;
      case "MANAGER":
        return <UserCog className="h-5 w-5 text-blue-400" />;
      case "CARETAKER":
        return <Users className="h-5 w-5 text-green-400" />;
      case "STOREKEEPER":
        return <Package className="h-5 w-5 text-yellow-400" />;
      default:
        return <Users className="h-5 w-5 text-gray-400" />;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Full system access including user management, settings, and all features";
      case "MANAGER":
        return "Manage properties, tenants, leases, and financial operations";
      case "CARETAKER":
        return "Handle maintenance requests, property inspections, and tenant issues";
      case "STOREKEEPER":
        return "Manage inventory, supplies, and equipment tracking";
      default:
        return "";
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Information */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="h-6 w-6 text-purple-400" />
          Personal Information
        </h2>
        <p className="text-gray-400 mb-6">Basic user details and contact information</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="firstName" className="text-gray-300">
              First Name *
            </Label>
            <Input
              id="firstName"
              {...register("firstName")}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
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
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
            {errors.lastName && (
              <p className="text-sm text-red-400 mt-1">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-300">
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              disabled={mode === "edit"}
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1 disabled:opacity-50"
            />
            {errors.email && (
              <p className="text-sm text-red-400 mt-1">{errors.email.message}</p>
            )}
            {mode === "edit" && (
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            )}
          </div>

          <div>
            <Label htmlFor="phoneNumber" className="text-gray-300">
              Phone Number
            </Label>
            <Input
              id="phoneNumber"
              {...register("phoneNumber")}
              placeholder="+254..."
              className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
            />
          </div>
        </div>
      </div>

      {/* Role & Permissions */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-400" />
          Role & Permissions
        </h2>
        <p className="text-gray-400 mb-6">Assign user role and access level</p>

        <div>
          <Label htmlFor="role" className="text-gray-300">
            User Role *
          </Label>
          <Select
            value={selectedRole}
            onValueChange={(value: any) => setValue("role", value)}
          >
            <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Administrator</SelectItem>
              <SelectItem value="MANAGER">Manager</SelectItem>
              <SelectItem value="CARETAKER">Caretaker</SelectItem>
              <SelectItem value="STOREKEEPER">Storekeeper</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-red-400 mt-1">{errors.role.message}</p>
          )}

          {/* Role Description */}
          {selectedRole && (
            <div className="mt-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-start gap-3">
                {getRoleIcon(selectedRole)}
                <div>
                  <p className="font-medium text-purple-300 mb-1">{selectedRole}</p>
                  <p className="text-sm text-gray-400">
                    {getRoleDescription(selectedRole)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-400" />
          Security
        </h2>
        <p className="text-gray-400 mb-6">
          {mode === "create"
            ? "Set initial password for the user"
            : "Leave blank to keep current password"}
        </p>

        <div>
          <Label htmlFor="password" className="text-gray-300">
            Password {mode === "create" && "*"}
          </Label>
          <Input
            id="password"
            type="password"
            {...register("password")}
            placeholder={mode === "edit" ? "Leave blank to keep current" : "Enter password"}
            className="bg-gray-900/50 border-purple-500/20 text-white mt-1"
          />
          {errors.password && (
            <p className="text-sm text-red-400 mt-1">{errors.password.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {mode === "create"
              ? "User will be required to change this on first login"
              : "Only enter a password if you want to change it"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? "Saving..." : mode === "create" ? "Create User" : "Update User"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/admin/users")}
          className="px-6 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-all font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
