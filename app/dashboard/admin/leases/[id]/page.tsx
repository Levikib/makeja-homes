"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

function statusColor(s: string) {
  if (s === "ACTIVE") return "bg-green-500/20 text-green-400";
  if (s === "PENDING") return "bg-yellow-500/20 text-yellow-400";
  if (s === "EXPIRED") return "bg-gray-500/20 text-gray-400";
  return "bg-red-500/20 text-red-400";
}

export default function LeaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leases/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setLease(data); setLoading(false); })
      .catch(() => { setLoading(false); router.push("/dashboard/admin/leases"); });
  }, [params.id]);

  if (loading) return <div className="text-white p-6">Loading lease...</div>;
  if (!lease) return null;

  const tenant = lease.tenants ?? {};
  const u = tenant.users ?? {};
  const unit = lease.units ?? {};
  const prop = unit.properties ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/leases">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leases
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Lease Agreement</h1>
          <span className={`px-3 py-1 rounded-full text-sm ${statusColor(lease.status)}`}>{lease.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tenant Information</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-400">Name:</span> <span className="text-white ml-2">{u.firstName} {u.lastName}</span></div>
            <div><span className="text-gray-400">Email:</span> <span className="text-white ml-2">{u.email}</span></div>
            {u.phoneNumber && <div><span className="text-gray-400">Phone:</span> <span className="text-white ml-2">{u.phoneNumber}</span></div>}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Property Details</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-400">Property:</span> <span className="text-white ml-2">{prop.name}</span></div>
            {prop.city && <div><span className="text-gray-400">City:</span> <span className="text-white ml-2">{prop.city}</span></div>}
            <div><span className="text-gray-400">Unit:</span> <span className="text-white ml-2">{unit.unitNumber}</span></div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Lease Duration</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-400">Start:</span> <span className="text-white ml-2">{lease.startDate ? new Date(lease.startDate).toLocaleDateString() : "—"}</span></div>
            <div><span className="text-gray-400">End:</span> <span className="text-white ml-2">{lease.endDate ? new Date(lease.endDate).toLocaleDateString() : "—"}</span></div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Financial Terms</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-400">Monthly Rent:</span> <span className="text-white ml-2">KSH {(lease.rentAmount || 0).toLocaleString()}</span></div>
            <div><span className="text-gray-400">Deposit:</span> <span className="text-white ml-2">KSH {(lease.depositAmount || 0).toLocaleString()}</span></div>
            {lease.paymentDueDay && <div><span className="text-gray-400">Due Day:</span> <span className="text-white ml-2">{lease.paymentDueDay}</span></div>}
          </div>
        </div>
      </div>

      {(lease.contractTerms || lease.terms) && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Terms & Conditions</h2>
          <pre className="text-gray-300 text-sm whitespace-pre-wrap">{lease.contractTerms || lease.terms}</pre>
        </div>
      )}
    </div>
  );
}
