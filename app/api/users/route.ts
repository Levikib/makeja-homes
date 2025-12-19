import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token and get companyId
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId as string;
    const companyId = payload.companyId as string | null;

    console.log("📋 Fetching users for company:", companyId);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    // Build where filter with company isolation
    const where: any = {
      isActive: true,
      companyId: companyId,
    };

    // CRITICAL: Filter by company
    if (companyId) {
      where.companyId = companyId;
    }

    // Filter by role if specified
    if (role) {
      where.role = role;
    } else {
      // Exclude TENANT role from general users list
      where.role = {
        not: "TENANT",
      };
    }

    const users = await prisma.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        companyId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Found ${users.length} users for company ${companyId}`);

    return NextResponse.json({ users });
  } catch (error) {
    console.error("❌ Users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}