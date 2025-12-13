import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  await requireRole(["ADMIN", "MANAGER"]);

  const users = await prisma.users.findMany({
    where: { role: { not: "TENANT" } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          👥 User Management
        </h1>
        <Link href="/dashboard/admin/users/new">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </Link>
      </div>

      <UsersClient users={users} />
    </div>
  );
}
