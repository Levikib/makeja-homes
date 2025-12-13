import { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar
        role={user.role}
        userName={`${user.firstName} ${user.lastName}`}
      />
      <main className="flex-1 overflow-y-auto bg-gray-900">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
