"use client";
import MaintenanceForm from "@/components/maintenance/maintenance-form";

export const dynamic = 'force-dynamic';

export default function TenantNewMaintenancePage() {
  return <MaintenanceForm mode="create" />;
}
