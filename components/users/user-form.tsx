"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, UserCog, Wrench, User, Package } from "lucide-react";
import NotificationModal from "@/components/NotificationModal";

const userSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().optional(),
  idNumber: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER", "TECHNICAL"], {
    required_error: "Role is required",
  }),
  password: z.string().optional(),
  propertyIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: any;
  mode: "create" | "edit";
}

export default function UserForm({ user, mode }: UserFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
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
          idNumber: user.idNumber || "",
          role: user.role || "CARETAKER",
          password: "",
          propertyIds: user.propertyIds || [],
        }
      : {
          firstName: "",
          lastName: "",
          email: "",
          phoneNumber: "",
          idNumber: "",
          role: "CARETAKER",
          password: "",
          propertyIds: [],
        },
  });

  const selectedRole = watch("role");
  const selectedProperties = watch("propertyIds") || [];

  // Fetch properties
  useEffect(() => {
    fetch("/api/properties/all")
      .then(res => res.json())
      .then(data => setProperties(data.properties || []))
      .catch((err) => console.error("Error fetching properties:", err));
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      // Validate caretaker can only have 1 property
      if (data.role === "CARETAKER" && data.propertyIds && data.propertyIds.length > 1) {
        setNotification({
          isOpen: true,
          type: "error",
          title: "Validation Error",
          message: "A caretaker can only be assigned to ONE property. Please select only one property.",
        });
        setLoading(false);
        return;
      }

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

      setNotification({
        isOpen: true,
        type: "success",
        title: mode === "create" ? "User Created!" : "User Updated!",
        message: result.message || `User ${mode === "create" ? "created" : "updated"} successfully`,
      });

      setTimeout(() => {
        router.push("/dashboard/admin/users");
        router.refresh();
      }, 1500);
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: error.message || "Failed to save user",
      });
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
        return <Wrench className="h-5 w-5 text-green-400" />;
      case "STOREKEEPER":
        return <Package className="h-5 w-5 text-purple-400" />;
      default:
        return <User className="h-5 w-5 text-gray-400" />;
    }
  };

  const handlePropertyToggle = (propertyId: string) => {
    const current = selectedProperties || [];
    if (current.includes(propertyId)) {
      setValue("propertyIds", current.filter((id) => id !== propertyId));
    } else {
      // If caretaker, only allow 1 property
      if (selectedRole === "CARETAKER") {
        setValue("propertyIds", [propertyId]);
      } else {
        setValue("propertyIds", [...current, propertyId]);
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white">Personal Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
              <Input
                id="firstName"
                {...register("firstName")}
                className="bg-gray-900 border-gray-700 text-white"
              />
              {errors.firstName && (
                <p className="text-red-400 text-sm mt-1">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
              <Input
                id="lastName"
                {...register("lastName")}
                className="bg-gray-900 border-gray-700 text-white"
              />
              {errors.lastName && (
                <p className="text-red-400 text-sm mt-1">{errors.lastName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-300">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className="bg-gray-900 border-gray-700 text-white"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phoneNumber" className="text-gray-300">Phone Number</Label>
              <Input
                id="phoneNumber"
                {...register("phoneNumber")}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="+254..."
              />
            </div>

            <div>
              <Label htmlFor="idNumber" className="text-gray-300">ID Number</Label>
              <Input
                id="idNumber"
                {...register("idNumber")}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="National ID"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-300">
                Password {mode === "create" ? "*" : "(leave blank to keep current)"}
              </Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className="bg-gray-900 border-gray-700 text-white"
                required={mode === "create"}
              />
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Role *</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER", "TECHNICAL"].map((role) => (
              <label
                key={role}
                className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  selectedRole === role
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <input
                  type="radio"
                  value={role}
                  {...register("role")}
                  className="sr-only"
                />
                {getRoleIcon(role)}
                <span className="mt-2 text-sm font-medium text-white">{role}</span>
              </label>
            ))}
          </div>
          {errors.role && (
            <p className="text-red-400 text-sm">{errors.role.message}</p>
          )}
        </div>

        {/* Property Assignment */}
        {(selectedRole === "MANAGER" || selectedRole === "CARETAKER" || selectedRole === "STOREKEEPER") && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Assign Properties</h3>
              {selectedRole === "CARETAKER" && (
                <span className="text-xs text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/30">
                  Caretakers can only manage ONE property
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {properties.map((property) => (
                <label
                  key={property.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedProperties.includes(property.id)
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProperties.includes(property.id)}
                    onChange={() => handlePropertyToggle(property.id)}
                    className="w-4 h-4 text-cyan-600"
                  />
                  <span className="text-white text-sm">{property.name}</span>
                </label>
              ))}
            </div>
            {properties.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No properties available</p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? "Saving..." : mode === "create" ? "Create User" : "Update User"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/admin/users")}
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
            router.push("/dashboard/admin/users");
          }
        }}
      />
    </>
  );
}
