"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus,
  Edit2,
  Trash2,
  Loader2,
  DollarSign,
  Calendar,
  Home,
  Search,
  Filter,
  Check,
  X,
  Eye,
} from "lucide-react";
import NotificationModal from "@/components/NotificationModal";

interface Property {
  id: string;
  name: string;
}

interface RecurringCharge {
  id: string;
  name: string;
  description: string | null;
  category: string;
  amount: number;
  frequency: string;
  billingDay: number;
  appliesTo: string;
  specificUnits: string[];
  unitTypes: string[];
  isActive: boolean;
  createdAt: string;
  property: {
    name: string;
  };
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

export default function RecurringChargesPage() {
  const router = useRouter();
  const [charges, setCharges] = useState<RecurringCharge[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCharge, setEditingCharge] = useState<RecurringCharge | null>(null);
  const [viewingCharge, setViewingCharge] = useState<RecurringCharge | null>(null);

  // Filters
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [availableUnits, setAvailableUnits] = useState<Array<{
    propertyId: string;
    propertyName: string;
    units: any[];
  }>>([]);

  // Form state
  const [formData, setFormData] = useState({
    propertyIds: [] as string[],
    name: "",
    description: "",
    category: "SECURITY",
    amount: "",
    frequency: "MONTHLY",
    billingDay: "1",
    appliesTo: "ALL_UNITS",
    specificUnits: [] as string[],
    unitTypes: [] as string[],
  });

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

  useEffect(() => {
    fetchData();
    fetchProperties();
  }, [propertyFilter, statusFilter]);
  // Fetch units when properties are selected
  useEffect(() => {
    const fetchUnits = async () => {
      if (formData.propertyIds.length > 0 && formData.appliesTo === "SPECIFIC_UNITS") {
        try {
          const allUnits = await Promise.all(
            formData.propertyIds.map(async (propId) => {
              const response = await fetch(`/api/properties/${propId}/units`);
              if (response.ok) {
                const data = await response.json();
                const property = properties.find(p => p.id === propId);
                return {
                  propertyId: propId,
                  propertyName: property?.name || "Unknown",
                  units: data.units || [],
                };
              }
              return { propertyId: propId, propertyName: "Unknown", units: [] };
            })
          );
          setAvailableUnits(allUnits);
        } catch (error) {
          console.error("Error fetching units:", error);
        }
      } else {
        setAvailableUnits([]);
      }
    };
    fetchUnits();
  }, [formData.propertyIds, formData.appliesTo, properties]);


  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/recurring-charges/list?propertyId=${propertyFilter}&isActive=${statusFilter}`
      );
      if (response.ok) {
        const data = await response.json();
        setCharges(data.charges);
      }
    } catch (error) {
      console.error("Error fetching recurring charges:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/admin/properties");
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingCharge
        ? "/api/admin/recurring-charges/update"
        : "/api/admin/recurring-charges/create";

      const body = editingCharge
        ? { id: editingCharge.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method: editingCharge ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save recurring charge");
      }

      setNotification({
        isOpen: true,
        type: "success",
        title: "Success!",
        message: editingCharge
          ? "Recurring charge updated successfully"
          : "Recurring charge created successfully",
      });

      setShowCreateModal(false);
      setEditingCharge(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recurring charge?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/recurring-charges/delete?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete recurring charge");
      }

      setNotification({
        isOpen: true,
        type: "success",
        title: "Deleted!",
        message: "Recurring charge deleted successfully",
      });

      fetchData();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: error.message,
      });
    }
  };

  const handleEdit = (charge: RecurringCharge) => {
    setEditingCharge(charge);
    setFormData({
      propertyIds: charge.propertyIds,
      name: charge.name,
      description: charge.description || "",
      category: charge.category,
      amount: charge.amount.toString(),
      frequency: charge.frequency,
      billingDay: charge.billingDay.toString(),
      appliesTo: charge.appliesTo,
      specificUnits: charge.specificUnits || [],
      unitTypes: charge.unitTypes || [],
    });
    setShowCreateModal(true);
  };

  const handleView = (charge: RecurringCharge) => {
    setViewingCharge(charge);
  };

  const resetForm = () => {
    setFormData({
      propertyIds: [],
      name: "",
      description: "",
      category: "SECURITY",
      amount: "",
      frequency: "MONTHLY",
      billingDay: "1",
      appliesTo: "ALL_UNITS",
      specificUnits: [],
      unitTypes: [],
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: { [key: string]: string } = {
      MONTHLY: "Monthly",
      QUARTERLY: "Quarterly",
      SEMI_ANNUALLY: "Semi-Annually",
      ANNUALLY: "Annually",
      ONE_TIME: "One Time",
    };
    return labels[frequency] || frequency;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      SECURITY: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      MAINTENANCE: "bg-green-500/10 text-green-400 border-green-500/30",
      CLEANING: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      OTHER: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    };
    return colors[category] || colors.OTHER;
  };

  const filteredCharges = charges.filter((charge) =>
    charge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    charge.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">🔄 Recurring Charges</h1>
          <p className="text-gray-400 mt-1">Manage custom recurring fees and charges</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingCharge(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white rounded-lg font-semibold shadow-lg hover:shadow-purple-500/50 hover:scale-105 transition-all duration-200"
        >
          <Plus className="h-5 w-5" />
          Create Recurring Charge
        </button>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search charges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Charges List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCharges.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <DollarSign className="h-16 w-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No recurring charges found</p>
            <p className="text-gray-500 text-sm mt-2">
              Create your first recurring charge to get started
            </p>
          </div>
        ) : (
          filteredCharges.map((charge) => (
            <Card key={charge.id} className="bg-gray-900/50 border-gray-700 hover:border-purple-500/50 transition">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg">{charge.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {charge.properties.length === 1 
                        ? charge.properties[0].name 
                        : `${charge.properties.length} properties`}
                    </CardDescription>
                  </div>

                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Amount</span>
                  <span className="text-2xl font-bold text-green-400">
                    {formatCurrency(charge.amount)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Frequency</span>
                  <span className="text-white text-sm">{getFrequencyLabel(charge.frequency)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Billing Day</span>
                  <span className="text-white text-sm">Day {charge.billingDay}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded border ${getCategoryColor(charge.category)}`}>
                    {charge.category}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded border ${
                    charge.isActive 
                      ? "bg-green-500/10 text-green-400 border-green-500/30"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                  }`}>
                    {charge.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {charge.description && (
                  <p className="text-sm text-gray-400 mt-2">{charge.description}</p>
                )}

                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    Applies to: <span className="text-gray-400">{charge.appliesTo.replace(/_/g, ' ')}</span>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleView(charge)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(charge)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(charge.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-900 border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-2xl">
                  {editingCharge ? "Edit Recurring Charge" : "Create Recurring Charge"}
                </CardTitle>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCharge(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Property Selection - Multi-Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Properties * (Select one or more)
                  </label>
                  <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg max-h-64 overflow-y-auto">
                    {/* Select All */}
                    <label className="flex items-center gap-3 p-3 hover:bg-gray-700/50 rounded cursor-pointer border-b border-gray-700 mb-2">
                      <input
                        type="checkbox"
                        checked={formData.propertyIds.length === properties.length && properties.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, propertyIds: properties.map(p => p.id) });
                          } else {
                            setFormData({ ...formData, propertyIds: [] });
                          }
                        }}
                        className="w-5 h-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                      />
                      <span className="text-white font-semibold">Select All Properties</span>
                    </label>
                    
                    {/* Individual Properties */}
                    {properties.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">No properties available</p>
                    ) : (
                      properties.map((property) => (
                        <label
                          key={property.id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-700/50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.propertyIds.includes(property.id)}
                            onChange={(e) => {
                              const newIds = e.target.checked
                                ? [...formData.propertyIds, property.id]
                                : formData.propertyIds.filter(id => id !== property.id);
                              setFormData({ ...formData, propertyIds: newIds });
                            }}
                            className="w-5 h-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                          />
                          <span className="text-white">{property.name}</span>
                        </label>
                      ))
                    )}
                    
                    {formData.propertyIds.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-green-400 text-sm">
                          ✓ {formData.propertyIds.length} propert{formData.propertyIds.length === 1 ? 'y' : 'ies'} selected
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Charge Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Security Fee, Pool Maintenance"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional details about this charge..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Category & Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      required
                    >
                      <option value="SECURITY">Security</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount (KES) *
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                </div>

                {/* Frequency & Billing Day */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Frequency *
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      required
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="SEMI_ANNUALLY">Semi-Annually</option>
                      <option value="ANNUALLY">Annually</option>
                      <option value="ONE_TIME">One Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Billing Day *
                    </label>
                    <input
                      type="number"
                      value={formData.billingDay}
                      onChange={(e) => setFormData({ ...formData, billingDay: e.target.value })}
                      placeholder="1"
                      min="1"
                      max="31"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                </div>

                {/* Applies To */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Applies To *
                  </label>
                  <select
                    value={formData.appliesTo}
                    
                    onChange={(e) => {
                      const newAppliesTo = e.target.value;
                      setFormData({ 
                        ...formData, 
                        appliesTo: newAppliesTo,
                        specificUnits: [],
                        unitTypes: []
                      });
                    }}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    required
                  >
                    <option value="ALL_UNITS">All Units</option>
                    <option value="SPECIFIC_UNITS">Specific Units</option>
                    <option value="UNIT_TYPES">Unit Types</option>
                  </select>
                </div>
                {/* Conditional selections based on appliesTo */}
                {formData.appliesTo === "SPECIFIC_UNITS" && (
                  <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <p className="text-sm text-gray-400 mb-3">
                      Select specific units from your properties:
                    </p>
                    {formData.propertyIds.length === 0 ? (
                      <p className="text-yellow-400 text-sm">⚠️ Please select at least one property first</p>
                    ) : availableUnits.length === 0 ? (
                      <p className="text-gray-500 text-sm">Loading units...</p>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {availableUnits.map((propertyGroup) => (
                          <div key={propertyGroup.propertyId} className="border border-gray-700 rounded-lg overflow-hidden">
                            {/* Property Header */}
                            <div className="bg-gray-700/30 px-4 py-3 border-b border-gray-700">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-purple-400" />
                                  <span className="text-white font-medium">{propertyGroup.propertyName}</span>
                                </div>
                                <span className="text-sm text-gray-400">
                                  {propertyGroup.units.length} unit{propertyGroup.units.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            
                            {/* Units Grid */}
                            {propertyGroup.units.length === 0 ? (
                              <div className="p-4 text-center text-gray-500 text-sm">
                                No units available
                              </div>
                            ) : (
                              <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                                {propertyGroup.units.map((unit: any) => (
                                  <label
                                    key={unit.id}
                                    className="flex items-center gap-2 p-2 bg-gray-700/50 rounded cursor-pointer hover:bg-gray-700 transition"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={formData.specificUnits.includes(unit.id)}
                                      onChange={(e) => {
                                        const newUnits = e.target.checked
                                          ? [...formData.specificUnits, unit.id]
                                          : formData.specificUnits.filter(id => id !== unit.id);
                                        setFormData({ ...formData, specificUnits: newUnits });
                                      }}
                                      className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-white">Unit {unit.unitNumber}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.specificUnits.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-green-400 text-sm">
                          ✓ {formData.specificUnits.length} unit{formData.specificUnits.length !== 1 ? 's' : ''} selected across {formData.propertyIds.length} propert{formData.propertyIds.length !== 1 ? 'ies' : 'y'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {formData.appliesTo === "UNIT_TYPES" && (
                  <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <p className="text-sm text-gray-400 mb-3">Select unit types:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { value: "STUDIO", label: "Studio" },
                        { value: "ONE_BEDROOM", label: "1 Bedroom" },
                        { value: "TWO_BEDROOM", label: "2 Bedroom" },
                        { value: "THREE_BEDROOM", label: "3 Bedroom" },
                        { value: "PENTHOUSE", label: "Penthouse" },
                        { value: "SHOP", label: "Shop" },
                        { value: "OFFICE", label: "Office" },
                        { value: "WAREHOUSE", label: "Warehouse" },
                        { value: "STAFF_QUARTERS", label: "Staff Quarters" },
                      ].map((type) => (
                        <label
                          key={type.value}
                          className="flex items-center gap-2 p-2 bg-gray-700/50 rounded cursor-pointer hover:bg-gray-700"
                        >
                          <input
                            type="checkbox"
                            checked={formData.unitTypes.includes(type.value)}
                            onChange={(e) => {
                              const newTypes = e.target.checked
                                ? [...formData.unitTypes, type.value]
                                : formData.unitTypes.filter(t => t !== type.value);
                              setFormData({ ...formData, unitTypes: newTypes });
                            }}
                            className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm text-white">{type.label}</span>
                        </label>
                      ))}
                    </div>
                    {formData.unitTypes.length > 0 && (
                      <p className="text-green-400 text-sm mt-2">
                        ✓ {formData.unitTypes.length} type(s) selected
                      </p>
                    )}
                  </div>
                )}


                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingCharge(null);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition"
                  >
                    {editingCharge ? "Update Charge" : "Create Charge"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}


      {/* View Details Modal */}
      {viewingCharge && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{viewingCharge.name}</h2>
                <p className="text-gray-400 text-sm mt-1">Recurring Charge Details</p>
              </div>
              <button
                onClick={() => setViewingCharge(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Properties</label>
                  <div className="text-white font-medium">
                    {viewingCharge.properties.length === 1 ? (
                      viewingCharge.properties[0].name
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {viewingCharge.properties.map((prop) => (
                          <span key={prop.id} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm">
                            {prop.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                  <div className="text-white font-medium capitalize">{viewingCharge.category.toLowerCase()}</div>
                </div>
              </div>

              {/* Description */}
              {viewingCharge.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                  <div className="text-white">{viewingCharge.description}</div>
                </div>
              )}

              {/* Financial Details */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
                  <div className="text-2xl font-bold text-green-400">
                    KSH {viewingCharge.amount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Frequency</label>
                  <div className="text-white font-medium capitalize">{viewingCharge.frequency.toLowerCase()}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Billing Day</label>
                  <div className="text-white font-medium">Day {viewingCharge.billingDay}</div>
                </div>
              </div>

              {/* Applies To */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Applies To</label>
                <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <div className="text-white font-medium mb-2 capitalize">
                    {viewingCharge.appliesTo.replace(/_/g, ' ').toLowerCase()}
                  </div>
                  
                  {viewingCharge.appliesTo === "SPECIFIC_UNITS" && viewingCharge.specificUnits.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-400 mb-2">Selected Units:</p>
                      <div className="flex flex-wrap gap-2">
                        {viewingCharge.specificUnits.map((unitId, index) => (
                          <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                            Unit ID: {unitId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {viewingCharge.appliesTo === "UNIT_TYPES" && viewingCharge.unitTypes.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-400 mb-2">Selected Types:</p>
                      <div className="flex flex-wrap gap-2">
                        {viewingCharge.unitTypes.map((type, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                            {type.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${viewingCharge.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-white font-medium">{viewingCharge.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Created</label>
                  <div className="text-white text-sm">
                    {new Date(viewingCharge.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setViewingCharge(null);
                    handleEdit(viewingCharge);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Charge
                </button>
                <button
                  onClick={() => setViewingCharge(null)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
    </div>
  );
}
