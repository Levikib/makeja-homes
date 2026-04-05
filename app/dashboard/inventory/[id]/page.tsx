"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function InventoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inventory/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setItem(d); setLoading(false); })
      .catch(() => { setLoading(false); router.push("/dashboard/inventory"); });
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/inventory/${params.id}`, { method: "DELETE" });
    router.push("/dashboard/inventory");
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;
  if (!item) return null;

  const isLowStock = item.quantity <= (item.minimumQuantity || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/inventory">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">{item.name}</h1>
          {isLowStock && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">Low Stock</span>}
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/inventory/${params.id}/edit`}>
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
              <Edit className="w-4 h-4 mr-2" />Edit
            </Button>
          </Link>
          <Button onClick={handleDelete} variant="outline" className="border-red-700 text-red-400 hover:text-red-300">
            <Trash2 className="w-4 h-4 mr-2" />Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-3 text-sm">
          <h2 className="text-lg font-semibold text-white mb-4">Item Details</h2>
          <div><span className="text-gray-400">Category:</span> <span className="text-white ml-2">{item.category}</span></div>
          <div><span className="text-gray-400">Description:</span> <span className="text-white ml-2">{item.description || "—"}</span></div>
          <div><span className="text-gray-400">Property:</span> <span className="text-white ml-2">{item.properties?.name || "—"}</span></div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-3 text-sm">
          <h2 className="text-lg font-semibold text-white mb-4">Stock & Pricing</h2>
          <div><span className="text-gray-400">Quantity:</span> <span className={`ml-2 font-bold ${isLowStock ? "text-red-400" : "text-white"}`}>{item.quantity} {item.unitOfMeasure}</span></div>
          <div><span className="text-gray-400">Min. Quantity:</span> <span className="text-white ml-2">{item.minimumQuantity || 0} {item.unitOfMeasure}</span></div>
          <div><span className="text-gray-400">Unit Cost:</span> <span className="text-white ml-2">KSH {(item.unitCost || 0).toLocaleString()}</span></div>
          <div><span className="text-gray-400">Total Value:</span> <span className="text-white ml-2">KSH {((item.quantity || 0) * (item.unitCost || 0)).toLocaleString()}</span></div>
        </div>
      </div>
    </div>
  );
}
