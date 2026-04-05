"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Home, DollarSign, FileText } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tenants/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setTenant(data); setLoading(false); })
      .catch(() => { setLoading(false); router.push("/dashboard/admin/tenants"); });
  }, [params.id]);

  if (loading) return <div className="text-white p-6">Loading tenant...</div>;
  if (!tenant) return null;

  const u = tenant.users ?? {};
  const unit = tenant.units ?? {};
  const prop = unit.properties ?? {};
  const leases = tenant.lease_agreements ?? [];
  const activeLease = leases[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/tenants">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tenants
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-white">{u.firstName} {u.lastName}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" /> Personal Information
          </h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-400">Email:</span> <span className="text-white ml-2">{u.email}</span></div>
            <div><span className="text-gray-400">Phone:</span> <span className="text-white ml-2">{u.phoneNumber || "—"}</span></div>
            <div><span className="text-gray-400">ID Number:</span> <span className="text-white ml-2">{u.idNumber || "—"}</span></div>
            <div><span className="text-gray-400">Status:</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${u.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {u.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        {/* Unit Info */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-green-400" /> Unit Information
          </h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-400">Property:</span> <span className="text-white ml-2">{prop.name || "—"}</span></div>
            <div><span className="text-gray-400">Unit:</span> <span className="text-white ml-2">{unit.unitNumber || "—"}</span></div>
            <div><span className="text-gray-400">Rent:</span> <span className="text-white ml-2">KSH {(tenant.rentAmount || 0).toLocaleString()}</span></div>
            <div><span className="text-gray-400">Deposit:</span> <span className="text-white ml-2">KSH {(tenant.depositAmount || 0).toLocaleString()}</span></div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-400" /> Financial Summary
          </h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-400">Monthly Rent:</span> <span className="text-white ml-2">KSH {(activeLease?.rentAmount || tenant.rentAmount || 0).toLocaleString()}</span></div>
            <div><span className="text-gray-400">Security Deposit:</span> <span className="text-white ml-2">KSH {(activeLease?.depositAmount || tenant.depositAmount || 0).toLocaleString()}</span></div>
            <div><span className="text-gray-400">Tenant Since:</span> <span className="text-white ml-2">{tenant.leaseStartDate ? new Date(tenant.leaseStartDate).toLocaleDateString() : "—"}</span></div>
          </div>
        </div>

        {/* Lease Agreements */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" /> Lease Agreements
          </h2>
          {leases.length === 0 ? (
            <p className="text-gray-400 text-sm">No lease agreements found</p>
          ) : (
            <div className="space-y-3">
              {leases.map((la: any) => (
                <div key={la.id} className="border border-gray-700 rounded-lg p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${la.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : la.status === "EXPIRED" ? "bg-gray-500/20 text-gray-400" : "bg-red-500/20 text-red-400"}`}>
                      {la.status}
                    </span>
                  </div>
                  <div className="text-gray-300">{la.startDate ? new Date(la.startDate).toLocaleDateString() : "—"} → {la.endDate ? new Date(la.endDate).toLocaleDateString() : "—"}</div>
                  <div className="text-gray-400">KSH {(la.rentAmount || 0).toLocaleString()}/mo</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
