"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  rentAmount: number;
  depositAmount: number | null;
  propertyId: string;
  properties: {
    id: string;
    name: string;
  };
}

export default function NewTenantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);

  // Get initial values from URL params
  const initialPropertyId = searchParams.get("propertyId") || "";
  const initialUnitId = searchParams.get("unitId") || "";
  const initialRentAmount = searchParams.get("rentAmount") || "";
  const initialDepositAmount = searchParams.get("depositAmount") || "";

  const [formData, setFormData] = useState({
    // Personal Info
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    nationalId: "",

    // Property & Unit
    propertyId: initialPropertyId,
    unitId: initialUnitId,

    // Financial - Use URL params if available
    rentAmount: initialRentAmount,
    depositAmount: initialDepositAmount,

    // Lease Dates
    leaseStartDate: new Date().toISOString().split("T")[0],
    leaseEndDate: "",
  });

  // Fetch properties and units
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propsRes, unitsRes] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/units?status=VACANT"),
        ]);

        if (propsRes.ok) {
          const propsData = await propsRes.json();
          setProperties(Array.isArray(propsData) ? propsData : []);
        } else {
          console.error("Failed to fetch properties");
          setProperties([]);
        }

        if (unitsRes.ok) {
          const unitsData = await unitsRes.json();
          setUnits(Array.isArray(unitsData) ? unitsData : []);

          // If we have a pre-selected unit from URL, set up filtered units
          if (initialUnitId && Array.isArray(unitsData)) {
            const preSelectedUnit = unitsData.find((u: Unit) => u.id === initialUnitId);
            if (preSelectedUnit) {
              setFilteredUnits([preSelectedUnit]);

              // If URL params didn't have rent/deposit, populate from unit data
              if (!initialRentAmount || !initialDepositAmount) {
                setFormData(prev => ({
                  ...prev,
                  rentAmount: prev.rentAmount || preSelectedUnit.rentAmount.toString(),
                  depositAmount: prev.depositAmount || (preSelectedUnit.depositAmount || preSelectedUnit.rentAmount).toString(),
                }));
              }
            }
          }
        } else {
          console.error("Failed to fetch units");
          setUnits([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setProperties([]);
        setUnits([]);
      }
    };

    fetchData();
  }, []); // Only run once on mount

  // Filter units when property changes
  useEffect(() => {
    if (!Array.isArray(units)) {
      setFilteredUnits([]);
      return;
    }

    if (formData.propertyId) {
      const filtered = units.filter((u) => u.propertyId === formData.propertyId);
      setFilteredUnits(filtered);
    } else {
      setFilteredUnits([]);
    }
  }, [formData.propertyId, units]);

  // Update rent and deposit when unit changes (manual selection)
  useEffect(() => {
    if (formData.unitId && Array.isArray(filteredUnits)) {
      const selectedUnit = filteredUnits.find((u) => u.id === formData.unitId);
      if (selectedUnit) {
        setFormData((prev) => ({
          ...prev,
          rentAmount: selectedUnit.rentAmount.toString(),
          depositAmount: (selectedUnit.depositAmount || selectedUnit.rentAmount).toString(),
        }));
      }
    }
  }, [formData.unitId, filteredUnits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          idNumber: formData.nationalId,
          unitId: formData.unitId,
          propertyId: formData.propertyId,
          rentAmount: parseFloat(formData.rentAmount),
          depositAmount: parseFloat(formData.depositAmount),
          leaseStartDate: formData.leaseStartDate,
          leaseEndDate: formData.leaseEndDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create tenant");
      }

      router.push("/dashboard/admin/tenants");
    } catch (error) {
      console.error("Error creating tenant:", error);
      alert("Failed to create tenant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/tenants">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tenants
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
              New Tenant
            </h1>
            <p className="text-gray-400">Add a new tenant to the system</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
              <Input
                id="firstName"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
              <Input
                id="lastName"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-300">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber" className="text-gray-300">Phone Number *</Label>
              <Input
                id="phoneNumber"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="nationalId" className="text-gray-300">National ID / Passport *</Label>
              <Input
                id="nationalId"
                required
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        {/* Property & Unit */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Property & Unit</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="property" className="text-gray-300">Property *</Label>
              <select
                id="property"
                required
                value={formData.propertyId}
                onChange={(e) => setFormData({ ...formData, propertyId: e.target.value, unitId: "" })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
              >
                <option value="">Select Property</option>
                {properties.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="unit" className="text-gray-300">Unit *</Label>
              <select
                id="unit"
                required
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                disabled={!formData.propertyId}
              >
                <option value="">Select Unit</option>
                {filteredUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unitNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Financial Information - READ ONLY */}
        <div className="bg-gray-800/50 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-white">Financial Information</h3>
            <div className="flex items-center gap-1 text-blue-400 text-sm">
              <Info className="w-4 h-4" />
              <span>Auto-populated from unit</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rentAmount" className="text-gray-300">Monthly Rent (KSH)</Label>
              <Input
                id="rentAmount"
                type="number"
                value={formData.rentAmount}
                readOnly
                disabled
                className="bg-gray-900/50 border-gray-700 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-blue-400 mt-1">Set in unit details - modify there if needed</p>
            </div>
            <div>
              <Label htmlFor="depositAmount" className="text-gray-300">Deposit Amount (KSH)</Label>
              <Input
                id="depositAmount"
                type="number"
                value={formData.depositAmount}
                readOnly
                disabled
                className="bg-gray-900/50 border-gray-700 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-blue-400 mt-1">Set in unit details - modify there if needed</p>
            </div>
          </div>
        </div>

        {/* Lease Dates */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Lease Period</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leaseStartDate" className="text-gray-300">Lease Start Date *</Label>
              <Input
                id="leaseStartDate"
                type="date"
                required
                value={formData.leaseStartDate}
                onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="leaseEndDate" className="text-gray-300">Lease End Date *</Label>
              <Input
                id="leaseEndDate"
                type="date"
                required
                value={formData.leaseEndDate}
                onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/admin/tenants">
            <Button type="button" variant="outline" className="border-gray-700 text-gray-400">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? "Creating..." : "Create Tenant"}
          </Button>
        </div>
      </form>
    </div>
  );
}
