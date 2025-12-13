"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
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
            <h1 className="text-3xl font-bold text-white">New Tenant</h1>
            <p className="text-gray-400">Add a new tenant to the system</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-purple-400 mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="nationalId">National ID / Passport *</Label>
              <Input
                id="nationalId"
                required
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>

        {/* Property & Unit */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-4">Property & Unit</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="property">Property *</Label>
              <select
                id="property"
                required
                value={formData.propertyId}
                onChange={(e) => setFormData({ ...formData, propertyId: e.target.value, unitId: "" })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white"
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
              <Label htmlFor="unit">Unit *</Label>
              <select
                id="unit"
                required
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white"
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

        {/* Financial Information */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-green-400 mb-4">Financial Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rentAmount">Monthly Rent (KSH) *</Label>
              <Input
                id="rentAmount"
                type="number"
                required
                value={formData.rentAmount}
                onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="depositAmount">Deposit Amount (KSH) *</Label>
              <Input
                id="depositAmount"
                type="number"
                required
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>

        {/* Lease Dates */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Lease Period</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leaseStartDate">Lease Start Date *</Label>
              <Input
                id="leaseStartDate"
                type="date"
                required
                value={formData.leaseStartDate}
                onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="leaseEndDate">Lease End Date *</Label>
              <Input
                id="leaseEndDate"
                type="date"
                required
                value={formData.leaseEndDate}
                onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/admin/tenants">
            <Button type="button" variant="outline" className="border-gray-600">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {loading ? "Creating..." : "Create Tenant"}
          </Button>
        </div>
      </form>
    </div>
  );
}
