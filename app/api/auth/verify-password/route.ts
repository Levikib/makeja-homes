import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    const userId = payload.id as string;

    const { password } = await request.json();
    if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });

    const db = getPrismaForRequest(request);
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT password FROM users WHERE id = $1 LIMIT 1`, userId
    );

    if (!rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return NextResponse.json({ valid: false }, { status: 200 });

    return NextResponse.json({ valid: true });
  } catch (error) {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
