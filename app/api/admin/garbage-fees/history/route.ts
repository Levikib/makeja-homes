import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    const fees = await prisma.garbage_fees.findMany({
      include: {
        tenants: {
          include: {
            users: { select: { firstName: true, lastName: true, email: true } },
            units: { include: { properties: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { month: "desc" },
    });

    return NextResponse.json({ fees });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
