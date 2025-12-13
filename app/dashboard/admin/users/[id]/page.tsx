import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Building2, FileText, Activity } from "lucide-react";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "MANAGER"]);

  const user = await prisma.users.findUnique({
    where: { id: params.id },
    include: {
      activity_logs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) notFound();

  // Get properties if user is manager (you'll need to implement this logic based on your schema)
  // const managedProperties = user.role === "MANAGER" ? await prisma.properties.findMany(...) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/users">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-400">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/admin/users/${user.id}/edit`}>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Edit className="w-4 h-4 mr-2" />
              Edit User
            </Button>
          </Link>
        </div>
      </div>

      {/* Status & Role */}
      <div className="flex gap-3">
        <span
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            user.isActive
              ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
        >
          {user.isActive ? "Active" : "Inactive"}
        </span>
        <span
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            user.role === "ADMIN"
              ? "bg-red-500/10 text-red-400 border border-red-500/30"
              : user.role === "MANAGER"
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
              : "bg-green-500/10 text-green-400 border border-green-500/30"
          }`}
        >
          {user.role}
        </span>
      </div>

      {/* User Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            User Information
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm">Full Name</p>
              <p className="text-white font-semibold text-lg">
                {user.firstName} {user.lastName}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Phone Number</p>
              <p className="text-white">{user.phoneNumber || "-"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Role</p>
              <p className="text-white">{user.role}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Email Verified</p>
              <p className={user.emailVerified ? "text-green-400" : "text-yellow-400"}>
                {user.emailVerified ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Account Created</p>
              <p className="text-white">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Last Updated</p>
              <p className="text-white">{new Date(user.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Role-specific info */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            Role & Permissions
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm">Role</p>
              <p className="text-white font-semibold">{user.role}</p>
            </div>
            {user.role === "MANAGER" && (
              <div>
                <p className="text-gray-400 text-sm mb-2">Managed Properties</p>
                <p className="text-gray-400 text-sm italic">
                  Property assignment feature coming soon
                </p>
              </div>
            )}
            {user.role === "CARETAKER" && (
              <div>
                <p className="text-gray-400 text-sm mb-2">Assigned Properties</p>
                <p className="text-gray-400 text-sm italic">
                  Property assignment feature coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          Recent Activity
        </h2>
        {user.activity_logs.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No activity logs</p>
        ) : (
          <div className="space-y-3">
            {user.activity_logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700"
              >
                <div className="flex-1">
                  <p className="text-white font-semibold">{log.action}</p>
                  {log.details && (
                    <p className="text-gray-400 text-sm mt-1">{log.details}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
