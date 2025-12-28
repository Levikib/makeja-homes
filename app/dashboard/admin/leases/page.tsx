import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import LeasesClient from "./LeasesClient";

export default async function LeasesPage() {
  await requireRole(["ADMIN", "MANAGER"]);

  const leases = await prisma.lease_agreements.findMany({
    include: {
      tenants: {
        include: {
          users: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      units: {
        include: {
          properties: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Transform to match client interface
  const formattedLeases = leases.map((lease) => ({
    id: lease.id,
    tenantId: lease.tenantId,
    unitId: lease.unitId,
    status: lease.status,
    startDate: lease.startDate,
    endDate: lease.endDate,
    rentAmount: lease.rentAmount,
    depositAmount: lease.depositAmount,
    terms: lease.terms,
    tenant: {
      id: lease.tenants.id,
      user: {
        firstName: lease.tenants.users.firstName,
        lastName: lease.tenants.users.lastName,
        email: lease.tenants.users.email,
      },
    },
    unit: {
      unitNumber: lease.units.unitNumber,
      property: {
        id: lease.units.properties.id,
        name: lease.units.properties.name,
      },
    },
  }));

  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-600 bg-clip-text text-transparent">
            📜 Lease Agreements
          </h1>
          <p className="text-gray-400 mt-1">Manage all tenant lease agreements</p>
        </div>
        <Link href="/dashboard/admin/leases/new">
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
            <Plus className="w-4 h-4 mr-2" />
            New Lease
          </Button>
        </Link>
      </div>

      <LeasesClient leases={formattedLeases} properties={properties} />
    </div>
  );
}
