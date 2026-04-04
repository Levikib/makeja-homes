import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN", "MANAGER", "CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const tenants = await prisma.tenants.findMany({
      where: {
        users: {
          isActive: true, // Only show active tenants
        },
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            isActive: true,
          },
        },
        units: {
          select: {
            id: true,
            unitNumber: true,
            properties: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}
