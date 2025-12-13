import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Droplets, ArrowLeft } from "lucide-react";

export default async function WaterReadingsPage() {
  await requireRole(["ADMIN", "MANAGER"]);

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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-600 bg-clip-text text-transparent">
              💧 Water Readings
            </h1>
            <p className="text-gray-400 mt-1">Track water meter readings for all units</p>
          </div>
        </div>
        <Link href="/dashboard/admin/water-readings/new">
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Water Reading
          </Button>
        </Link>
      </div>

      {/* Placeholder for now */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
        <Droplets className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Water Readings Coming Soon</h2>
        <p className="text-gray-400 mb-6">
          Start by adding your first water meter reading
        </p>
        <Link href="/dashboard/admin/water-readings/new">
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
            <Plus className="w-4 h-4 mr-2" />
            Add First Reading
          </Button>
        </Link>
      </div>
    </div>
  );
}
