import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingDown } from "lucide-react";
import DepositsClient from "./DepositsClient";

export default async function DepositsPage() {
  await requireRole(["ADMIN", "MANAGER"]);

  // Get all properties for filtering
  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  // Get all tenants with their deposits
  const tenants = await prisma.tenants.findMany({
    include: {
      users: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true, // ✅ FIXED: Changed from phone to phoneNumber
        },
      },
      units: {
        select: {
          unitNumber: true,
          propertyId: true,
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

  // Calculate stats
  const totalDeposits = tenants.reduce((sum, t) => sum + t.depositAmount, 0);
  const heldDeposits = tenants.filter(t => t.leaseEndDate > new Date());
  const expiredLeases = tenants.filter(t => t.leaseEndDate <= new Date());

  const stats = {
    totalDeposits,
    activeCount: heldDeposits.length,
    refundsIssued: 0,
    refundsCount: 0,
    damagesDeducted: 0,
    damagesCount: 0,
    pendingRefunds: expiredLeases.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/payments">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Payments
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              💎 Deposit Management
            </h1>
            <p className="text-gray-400 mt-1">Track deposits, refunds, and damages</p>
          </div>
        </div>
        <Link href="/dashboard/admin/deposits/refund">
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
            <TrendingDown className="w-4 h-4 mr-2" />
            Process Refund
          </Button>
        </Link>
      </div>

      <DepositsClient tenants={tenants} properties={properties} stats={stats} />
    </div>
  );
}
