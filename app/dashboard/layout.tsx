import { ReactNode } from "react";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getMasterPrisma } from "@/lib/get-prisma";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SessionMonitor } from "@/lib/session-monitor";
import SessionWarning from "@/components/auth/SessionWarning";

function getSlugFromHost(host: string): string | null {
  const parts = host.split(".")
  if (parts.length >= 4) {
    const sub = parts[0].toLowerCase()
    if (!["www", "app", "api"].includes(sub) && /^[a-z0-9-]+$/.test(sub)) {
      return sub
    }
  }
  return null
}

async function checkSubscription(slug: string): Promise<boolean> {
  try {
    const master = getMasterPrisma()
    const company = await master.companies.findFirst({
      where: { slug },
      select: {
        isActive: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
      },
    })
    if (!company || !company.isActive) return false
    const now = new Date()
    const status = company.subscriptionStatus
    if (["SUSPENDED", "CANCELLED", "TRIAL_EXPIRED", "EXPIRED"].includes(status)) return false
    if (status === "ACTIVE") return !company.subscriptionEndsAt || company.subscriptionEndsAt > now
    if (status === "TRIAL") return !company.trialEndsAt || company.trialEndsAt > now
    return false
  } catch {
    // If master DB unreachable, allow access rather than locking everyone out
    return true
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Subscription gate — only applies on tenant subdomains
  const h = await headers()
  const host = h.get("x-forwarded-host") || h.get("host") || ""
  const slug = getSlugFromHost(host)
  if (slug) {
    const active = await checkSubscription(slug)
    if (!active) {
      redirect("/subscription-expired")
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <SessionMonitor />
      <SessionWarning />
      <Sidebar
        role={user.role}
        userName={`${user.firstName} ${user.lastName}`}
      />
      <main className="flex-1 overflow-y-auto bg-black">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}