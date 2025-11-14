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
import { MoreHorizontal, Eye, Edit, Trash2, Building } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  totalUnits?: number;
  stats?: {
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyRate: number;
  };
}

export default function PropertiesTable() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/properties?includeStats=true");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();

      // API returns array directly
      if (Array.isArray(data)) {
        setProperties(data);
      } else if (data.error) {
        setError(data.error);
      } else {
        setError("Invalid response format");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching properties");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh the list
        fetchProperties();
      } else {
        alert(data.error || "Failed to delete property");
      }
    } catch (err) {
      alert("An error occurred while deleting the property");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading properties...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <Button onClick={fetchProperties} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No properties found
        </h3>
        <p className="text-gray-500 mb-4">
          Get started by creating your first property.
        </p>
        <Link href="/dashboard/properties/new">
          <Button>Add Property</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-center">Total Units</TableHead>
            <TableHead className="text-center">Occupied</TableHead>
            <TableHead className="text-center">Vacant</TableHead>
            <TableHead className="text-center">Occupancy Rate</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((property) => (
            <TableRow key={property.id}>
              <TableCell>
                <Link
                  href={`/dashboard/properties/${property.id}`}
                  className="font-medium hover:underline"
                >
                  {property.name}
                </Link>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{property.address}</div>
                  <div className="text-gray-500">
                    {property.city}
                    {property.state && `, ${property.state}`}, {property.country}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {property.stats?.totalUnits || 0}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="default">
                  {property.stats?.occupiedUnits || 0}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">
                  {property.stats?.vacantUnits || 0}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={
                    (property.stats?.occupancyRate || 0) >= 80
                      ? "default"
                      : (property.stats?.occupancyRate || 0) >= 50
                      ? "secondary"
                      : "outline"
                  }
                >
                  {property.stats?.occupancyRate || 0}%
                </Badge>
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
                      onClick={() =>
                        router.push(`/dashboard/properties/${property.id}`)
                      }
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/dashboard/properties/${property.id}/edit`)
                      }
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(property.id, property.name)}
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
