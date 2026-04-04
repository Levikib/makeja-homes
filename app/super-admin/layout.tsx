import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import SuperAdminSidebar from "@/components/super-admin/SuperAdminSidebar";

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback-secret-min-32-characters-long!!"
  );
}

async function verifySuperAdminCookie(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("super_admin_token")?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload.role === "super_admin";
  } catch {
    return false;
  }
}

export default async function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const isAuthenticated = await verifySuperAdminCookie();

  if (!isAuthenticated) {
    redirect("/super-admin/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-y-auto bg-gray-950">
        <div className="container mx-auto p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
