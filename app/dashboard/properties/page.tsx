import { requireRole } from "@/lib/auth-helpers";
import PropertiesClient from "./PropertiesClient";

export default async function PropertiesPage() {
  // Require authentication - allow ADMIN, MANAGER, CARETAKER
  await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

  return <PropertiesClient />;
}
