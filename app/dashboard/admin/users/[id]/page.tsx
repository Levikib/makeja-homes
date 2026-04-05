"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Building } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${params.id}`).then(r => r.ok ? r.json() : null),
      fetch("/api/properties/all").then(r => r.json()),
    ]).then(([userData, propsData]) => {
      if (!userData) { router.push("/dashboard/admin/users"); return; }
      setUser(userData);
      const allProps = propsData.properties ?? [];
      const userId = userData.id;
      const filtered = allProps.filter((p: any) =>
        (p.managerIds ?? []).includes(userId) ||
        (p.caretakerIds ?? []).includes(userId) ||
        (p.storekeeperIds ?? []).includes(userId)
      );
      setProperties(filtered);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-white p-6">Loading user...</div>;
  if (!user) return null;

  const managingProps = properties.filter(p => (p.managerIds ?? []).includes(user.id));
  const caretakingProps = properties.filter(p => (p.caretakerIds ?? []).includes(user.id));
  const storekeeperProps = properties.filter(p => (p.storekeeperIds ?? []).includes(user.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/users">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-white">{user.firstName} {user.lastName}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" /> User Information
          </h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-400">Email:</span> <span className="text-white ml-2">{user.email}</span></div>
            <div><span className="text-gray-400">Phone:</span> <span className="text-white ml-2">{user.phoneNumber || "—"}</span></div>
            <div><span className="text-gray-400">Role:</span> <span className="text-white ml-2">{user.role}</span></div>
            <div><span className="text-gray-400">Status:</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${user.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div><span className="text-gray-400">Joined:</span> <span className="text-white ml-2">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span></div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-green-400" /> Assigned Properties
          </h2>
          {properties.length === 0 ? (
            <p className="text-gray-400 text-sm">No properties assigned</p>
          ) : (
            <div className="space-y-3 text-sm">
              {managingProps.length > 0 && (
                <div>
                  <p className="text-purple-400 font-medium mb-1">Managing ({managingProps.length})</p>
                  {managingProps.map((p: any) => <p key={p.id} className="text-white pl-2">{p.name}</p>)}
                </div>
              )}
              {caretakingProps.length > 0 && (
                <div>
                  <p className="text-blue-400 font-medium mb-1">Caretaking ({caretakingProps.length})</p>
                  {caretakingProps.map((p: any) => <p key={p.id} className="text-white pl-2">{p.name}</p>)}
                </div>
              )}
              {storekeeperProps.length > 0 && (
                <div>
                  <p className="text-green-400 font-medium mb-1">Storekeeping ({storekeeperProps.length})</p>
                  {storekeeperProps.map((p: any) => <p key={p.id} className="text-white pl-2">{p.name}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
