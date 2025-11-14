"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Unit {
  id: string;
  unitNumber: string;
  floor?: string;
  type: string;
  status: string;
  rentAmount: number;
  bedrooms?: number;
  bathrooms?: number;
  currentTenant?: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  property?: {
    id: string;
    name: string;
  };
}

interface UnitsTableProps {
  propertyId?: string;
}

export default function UnitsTable({ propertyId }: UnitsTableProps) {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUnits();
  }, [propertyId]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const url = propertyId
        ? `/api/units?propertyId=${propertyId}&includeProperty=true&includeTenant=true`
        : `/api/units?includeProperty=true&includeTenant=true`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setUnits(data.data);
      } else {
        setError(data.error || "Failed to fetch units");
      }
    } catch (err) {
      setError("An error occurred while fetching units");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, unitNumber: string) => {
    if (
      !confirm(
        `Are you sure you want to delete unit "${unitNumber}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/units/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        fetchUnits();
      } else {
        alert(data.error || "Failed to delete unit");
      }
    } catch (err) {
      alert("An error occurred while deleting the unit");
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      VACANT: { variant: "secondary", label: "Vacant" },
      OCCUPIED: { variant: "default", label: "Occupied" },
      MAINTENANCE: { variant: "outline", label: "Maintenance" },
      RESERVED: { variant: "outline", label: "Reserved" },
    };

    const config = statusMap[status] || {
      variant: "secondary",
      label: status,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, string> = {
      TENANCY: "Residential",
      STAFF: "Staff",
      SHOP: "Commercial",
    };

    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500">Loading units...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <Button onClick={fetchUnits} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <Home className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No units found
        </h3>
        <p className="text-gray-500 mb-4">
          Get started by adding your first unit.
        </p>
        {propertyId && (
          <Link href={`/dashboard/units/new?propertyId=${propertyId}`}>
            <Button>Add Unit</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unit Number</TableHead>
            {!propertyId && <TableHead>Property</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Rent</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Current Tenant</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit) => (
            <TableRow key={unit.id}>
              <TableCell>
                <Link
                  href={`/dashboard/units/${unit.id}`}
                  className="font-medium hover:underline"
                >
                  {unit.unitNumber}
                </Link>
                {unit.floor && (
                  <div className="text-xs text-gray-500">Floor: {unit.floor}</div>
                )}
              </TableCell>
              {!propertyId && unit.property && (
                <TableCell>{unit.property.name}</TableCell>
              )}
              <TableCell>{getTypeBadge(unit.type)}</TableCell>
              <TableCell>{getStatusBadge(unit.status)}</TableCell>
              <TableCell>KSh {unit.rentAmount.toLocaleString()}/mo</TableCell>
              <TableCell>
                <div className="text-sm">
                  {unit.bedrooms && `${unit.bedrooms} bed`}
                  {unit.bedrooms && unit.bathrooms && " • "}
                  {unit.bathrooms && `${unit.bathrooms} bath`}
                </div>
              </TableCell>
              <TableCell>
                {unit.currentTenant ? (
                  <div className="text-sm">
                    {unit.currentTenant.user.firstName}{" "}
                    {unit.currentTenant.user.lastName}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => router.push(`/dashboard/units/${unit.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/dashboard/units/${unit.id}/edit`)
                      }
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(unit.id, unit.unitNumber)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
