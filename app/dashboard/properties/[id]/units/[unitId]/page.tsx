import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import UnitDetailsClient from "./UnitDetailsClient";

interface PageProps {
  params: {
    id: string;
    unitId: string;
  };
}

export default async function UnitDetailsPage({ params }: PageProps) {
  const unit = await prisma.units.findUnique({
    where: { id: params.unitId },
    include: {
      properties: {
        select: {
          id: true,
          name: true,
        },
      },
      tenants: {
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
  });

  if (!unit) {
    notFound();
  }

  // FIX: Convert tenants to array (Prisma returns object, not array)
  let tenantsArray = [];
  if (unit.tenants) {
    if (Array.isArray(unit.tenants)) {
      tenantsArray = unit.tenants;
    } else {
      // Single object, wrap in array
      tenantsArray = [unit.tenants];
    }
  }

  console.log("Fixed tenants array count:", tenantsArray.length);

  // Sort tenants by lease start date (most recent first)
  const sortedTenants = [...tenantsArray].sort((a, b) => 
    new Date(b.leaseStartDate).getTime() - new Date(a.leaseStartDate).getTime()
  );

  const now = new Date();
  
  // Determine current tenant based on unit status
  let currentTenant = null;
  let historicalTenants = [];
  
  if (unit.status === "OCCUPIED" && sortedTenants.length > 0) {
    // If unit is OCCUPIED, the most recent tenant is the current one
    currentTenant = sortedTenants[0];
    historicalTenants = sortedTenants.slice(1); // Rest are historical
  } else {
    // If unit is VACANT, find active leases and filter by date
    currentTenant = sortedTenants.find(t => new Date(t.leaseEndDate) >= now) || null;
    historicalTenants = sortedTenants.filter(t => new Date(t.leaseEndDate) < now);
  }

  // Explicitly structure the data for the client component
  const unitData = {
    id: unit.id,
    unitNumber: unit.unitNumber,
    type: unit.type,
    status: unit.status,
    floor: unit.floor,
    rentAmount: unit.rentAmount,
    depositAmount: unit.depositAmount,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    squareFeet: unit.squareFeet,
    properties: unit.properties,
    currentTenant: currentTenant,
    historicalTenants: historicalTenants,
  };

  return <UnitDetailsClient unit={unitData} />;
}
