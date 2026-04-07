import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const db = getPrismaForRequest(request);

    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, email, "firstName", "lastName", "phoneNumber", "idNumber", "createdAt", "lastLoginAt"
       FROM users WHERE id = $1 LIMIT 1`,
      userId
    );

    if (!rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const u = rows[0];

    // Also get tenant details (unit, property)
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        t."leaseStartDate", t."leaseEndDate", t."rentAmount", t."depositAmount",
        un."unitNumber",
        p.name as "propertyName",
        p.address as "propertyAddress",
        p.city as "propertyCity"
      FROM tenants t
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t."userId" = $1
      LIMIT 1
    `, userId);

    const tenant = tenantRows[0] || null;

    return NextResponse.json({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phoneNumber: u.phoneNumber || "",
      idNumber: u.idNumber || "",
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      tenancy: tenant ? {
        unitNumber: tenant.unitNumber,
        propertyName: tenant.propertyName,
        propertyAddress: tenant.propertyAddress,
        propertyCity: tenant.propertyCity,
        leaseStartDate: tenant.leaseStartDate,
        leaseEndDate: tenant.leaseEndDate,
        rentAmount: tenant.rentAmount,
        depositAmount: tenant.depositAmount,
      } : null,
    });
  } catch (error: any) {
    console.error("Tenant profile GET error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const body = await request.json();
    const { firstName, lastName, phoneNumber } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    await db.$executeRawUnsafe(
      `UPDATE users SET "firstName" = $2, "lastName" = $3, "phoneNumber" = $4, "updatedAt" = NOW() WHERE id = $1`,
      userId, firstName.trim(), lastName.trim(), phoneNumber?.trim() || null
    );

    return NextResponse.json({ success: true, message: "Profile updated successfully" });
  } catch (error: any) {
    console.error("Tenant profile PATCH error:", error?.message);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
