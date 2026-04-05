import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForTenant } from "@/lib/prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const tenant = await getPrismaForTenant(request).tenants.findFirst({
      where: { userId },
    });

    if (!tenant) {
      return NextResponse.json({ requests: [] });
    }

    const requests = await getPrismaForTenant(request).maintenance_requests.findMany({
      where: { unitId: tenant.unitId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        requestNumber: true,
        title: true,
        description: true,
        priority: true,
        category: true,
        status: true,
        estimatedCost: true,
        completionNotes: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("❌ Tenant maintenance GET error:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
