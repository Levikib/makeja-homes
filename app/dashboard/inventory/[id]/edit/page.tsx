"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import EditInventoryClient from "./EditInventoryClient";

export const dynamic = 'force-dynamic';

export default function EditInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/inventory/${params.id}`).then(r => r.ok ? r.json() : null),
      fetch("/api/properties").then(r => r.json()),
    ]).then(([item, propsData]) => {
      if (!item) { router.push("/dashboard/inventory"); return; }
      setData({
        item,
        properties: Array.isArray(propsData) ? propsData : (propsData.properties ?? []),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-white p-6">Loading...</div>;
  if (!data) return null;

  return <EditInventoryClient item={data.item} properties={data.properties} />;
}
