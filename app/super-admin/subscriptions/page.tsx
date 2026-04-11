"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Subscriptions view is the clients list — redirect there
export default function SubscriptionsPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/super-admin/clients"); }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
    </div>
  );
}
