"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import MaintenanceForm from "@/components/maintenance/maintenance-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function EditMaintenancePage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/maintenance/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setRequest(data); setLoading(false); })
      .catch(() => { setLoading(false); router.push("/dashboard/maintenance"); });
  }, [params.id]);

  if (loading) return <div className="text-white p-6">Loading...</div>;
  if (!request) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/maintenance/${params.id}`}>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-white">Edit Maintenance Request</h1>
      </div>
      <MaintenanceForm mode="edit" request={request} />
    </div>
  );
}
