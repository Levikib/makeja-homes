import { requireRole } from "@/lib/auth-helpers";
import UserForm from "@/components/users/user-form";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";

export default async function NewUserPage() {
  await requireRole(["ADMIN"]);

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link
          href="/dashboard/admin/users"
          className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Users
        </Link>
        <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
          <UserPlus className="h-10 w-10 text-purple-500" />
          Add New User
        </h1>
        <p className="text-gray-400 text-lg">
          Create a new system user with role and permissions
        </p>
      </div>

      <UserForm mode="create" />
    </div>
  );
}
