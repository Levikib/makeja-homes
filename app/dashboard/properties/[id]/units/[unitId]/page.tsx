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
          deletedAt: true,
        },
      },
      tenants: {
        where: {
          users: {
            isActive: true,
          },
        },
        select: {
          id: true,
          userId: true,
          leaseStartDate: true,
          leaseEndDate: true,
          rentAmount: true,
          depositAmount: true,
          createdAt: true,
          updatedAt: true,
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
              idNumber: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!unit) {
    notFound();
  }

  // Get ALL tenants (including inactive) for historical data
  const allTenants = await prisma.tenants.findMany({
    where: { unitId: params.unitId },
    include: {
      users: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          idNumber: true,
          isActive: true,
        },
      },
    },
  });

  const tenantsArray = Array.isArray(unit.tenants) ? unit.tenants : unit.tenants ? [unit.tenants] : [];
  const allTenantsArray = Array.isArray(allTenants) ? allTenants : allTenants ? [allTenants] : [];

  const sortedTenants = [...tenantsArray].sort((a, b) =>
    new Date(b.leaseStartDate).getTime() - new Date(a.leaseStartDate).getTime()
  );

  const sortedAllTenants = [...allTenantsArray].sort((a, b) =>
    new Date(b.leaseStartDate).getTime() - new Date(a.leaseStartDate).getTime()
  );

  const now = new Date();
  const isArchived = unit.properties.deletedAt !== null;

  console.log('🔍 UNIT DETAILS DEBUG:', {
    unitId: params.unitId,
    propertyId: unit.properties.id,
    propertyDeletedAt: unit.properties.deletedAt,
    isArchived: isArchived,
    activeTenants: sortedTenants.length,
    allTenants: sortedAllTenants.length,
  });

  let currentTenant = null;
  let historicalTenants = [];

  if (isArchived) {
    console.log('🗄️ Property is ARCHIVED - all tenants moved to historical');
    currentTenant = null;
    historicalTenants = sortedAllTenants;
  } else {
    const now = new Date();
    
    // Current tenant = most recent tenant with valid lease AND active user
    // (leaseEndDate >= today AND isActive = true)
    const validTenants = sortedTenants.filter(t => new Date(t.leaseEndDate) >= now);
    
    if (validTenants.length > 0) {
      currentTenant = validTenants[0]; // Most recent valid tenant
    }
    
    // Historical = all others (expired leases OR inactive users)
    historicalTenants = sortedAllTenants.filter(t => {
      // Skip the current tenant
      if (currentTenant && t.id === currentTenant.id) return false;
      return true;
    }).sort((a, b) => new Date(b.leaseStartDate).getTime() - new Date(a.leaseStartDate).getTime());
    
    console.log('📦 Passing to client:', {
      isArchived,
      hasCurrentTenant: !!currentTenant,
      historicalCount: historicalTenants.length
    });
  }
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
    isArchived: isArchived,
  };

  console.log('📦 Passing to client:', {
    isArchived: unitData.isArchived,
    hasCurrentTenant: !!unitData.currentTenant,
    historicalCount: unitData.historicalTenants.length,
  });

  return <UnitDetailsClient unit={unitData} />;
}
