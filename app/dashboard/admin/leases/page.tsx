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
          units: {
            select: {
              unitNumber: true,
              properties: {
                select: {
                  name: true,
                },
              },
            },
          },
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

      <LeasesClient leases={leases} properties={properties} />
    </div>
  );
}
