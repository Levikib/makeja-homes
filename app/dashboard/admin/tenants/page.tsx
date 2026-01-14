import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TenantsClient from "./TenantsClient";

export default async function TenantsPage() {
  await requireRole(["ADMIN", "MANAGER"]);

  const tenants = await prisma.tenants.findMany({
    include: {
      users: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          isActive: true,
        },
      },
      units: {
        select: {
          unitNumber: true,
          status: true,
          properties: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      lease_agreements: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1, // Get only the most recent lease
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          rentAmount: true,
          depositAmount: true,
        },
      },
      vacate_notices: {
        select: {
          noticeDate: true,
          intendedVacateDate: true,
          actualVacateDate: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            👥 Tenants
          </h1>
          <p className="text-gray-400 mt-1">Manage all property tenants</p>
        </div>
        <Link href="/dashboard/admin/tenants/new">
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
        </Link>
      </div>

      <TenantsClient tenants={tenants} properties={properties} />
    </div>
  );
}
