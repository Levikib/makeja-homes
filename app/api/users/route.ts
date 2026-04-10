import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth-helpers"
import { getPrismaForRequest, resolveSchema } from "@/lib/get-prisma";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// GET - List all staff users in the current tenant schema (excludes TENANT role)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getPrismaForRequest(request);
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");
    const statusFilter = searchParams.get("status");

    // Build raw SQL filters
    const conditions: string[] = [`role::text != 'TENANT'`];
    const args: any[] = [];

    if (roleFilter) {
      args.push(roleFilter);
      conditions.push(`role::text = $${args.length}`);
    }
    if (statusFilter === "active") conditions.push(`"isActive" = true`);
    else if (statusFilter === "inactive") conditions.push(`"isActive" = false`);

    const where = `WHERE ${conditions.join(" AND ")}`;

    const users = await db.$queryRawUnsafe(`
      SELECT id, email, "firstName", "lastName", "phoneNumber", "idNumber",
             role, "isActive", "emailVerified", "createdAt", "updatedAt", "lastLoginAt"
      FROM users
      ${where}
      ORDER BY "createdAt" DESC
    `, ...args) as any[];

    // For each user get their assigned properties
    const usersWithProps = await Promise.all(users.map(async (user: any) => {
      const props = await db.$queryRawUnsafe(`
        SELECT id, name FROM properties
        WHERE $1 = ANY("managerIds") OR $1 = ANY("caretakerIds") OR $1 = ANY("storekeeperIds")
      `, user.id) as any[];
      return {
        ...user,
        propertyCount: props.length,
        properties: props,
      };
    }));

    return NextResponse.json({ users: usersWithProps });
  } catch (error: any) {
    console.error("Users fetch error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST - Create new staff user in the current tenant schema
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getPrismaForRequest(request);
    const body = await request.json();
    const { firstName, lastName, email, phoneNumber, idNumber, role, propertyIds } = body;

    if (!firstName || !lastName || !email || !role) {
      return NextResponse.json({ error: "Missing required fields: firstName, lastName, email, role" }, { status: 400 });
    }

    const validRoles = ["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER", "TECHNICAL"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role. Must be one of: " + validRoles.join(", ") }, { status: 400 });
    }

    if (role === "CARETAKER" && propertyIds && propertyIds.length > 1) {
      return NextResponse.json({ error: "Caretaker can only be assigned to ONE property" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists in this schema
    const existing = await db.$queryRawUnsafe(`
      SELECT id FROM users WHERE email = $1 LIMIT 1
    `, normalizedEmail) as any[];
    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already exists in this instance" }, { status: 400 });
    }

    // Check idNumber uniqueness
    if (idNumber) {
      const existingId = await db.$queryRawUnsafe(`
        SELECT id FROM users WHERE "idNumber" = $1 LIMIT 1
      `, idNumber) as any[];
      if (existingId.length > 0) {
        return NextResponse.json({ error: "ID Number already exists" }, { status: 400 });
      }
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date();

    // Create user
    await db.$executeRawUnsafe(`
      INSERT INTO users (id, "firstName", "lastName", email, "phoneNumber", "idNumber",
        password, role, "isActive", "mustChangePassword", "emailVerified", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text::"UserRole", true, true, null, $9, $9)
    `, userId, firstName, lastName, normalizedEmail,
       phoneNumber || null, idNumber || null, hashedPassword, role, now);

    // Assign to properties
    if (propertyIds && propertyIds.length > 0) {
      for (const propertyId of propertyIds) {
        const propRows = await db.$queryRawUnsafe(`
          SELECT "managerIds", "caretakerIds", "storekeeperIds" FROM properties WHERE id = $1 LIMIT 1
        `, propertyId) as any[];
        if (!propRows.length) continue;
        const prop = propRows[0];

        if (role === "MANAGER") {
          const ids = [...(prop.managerIds || []), userId];
          await db.$executeRawUnsafe(`UPDATE properties SET "managerIds" = $1, "updatedAt" = $2 WHERE id = $3`, ids, now, propertyId);
        } else if (role === "CARETAKER") {
          const ids = [...(prop.caretakerIds || []), userId];
          await db.$executeRawUnsafe(`UPDATE properties SET "caretakerIds" = $1, "updatedAt" = $2 WHERE id = $3`, ids, now, propertyId);
        } else if (role === "STOREKEEPER") {
          const ids = [...(prop.storekeeperIds || []), userId];
          await db.$executeRawUnsafe(`UPDATE properties SET "storekeeperIds" = $1, "updatedAt" = $2 WHERE id = $3`, ids, now, propertyId);
        }
      }
    }

    // Get the tenant slug from the schema to build the correct login URL
    const schema = resolveSchema(request); // e.g. "tenant_hillux"
    const tenantSlug = schema.replace(/^tenant_/, '');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://makejahomes.co.ke";
    const loginUrl = `${appUrl}/auth/login`;

    const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();

    // Send invite email with temp password
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      });
      await transporter.sendMail({
        from: `"Makeja Homes" <${process.env.SMTP_USER}>`,
        to: normalizedEmail,
        subject: `You've been invited to Makeja Homes as ${roleLabel}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;padding:32px 20px;color:#fff;">
            <div style="text-align:center;margin-bottom:28px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#a855f7,#ec4899);border-radius:10px;padding:10px 18px;">
                <span style="color:white;font-size:18px;font-weight:bold;">🏠 Makeja Homes</span>
              </div>
            </div>
            <div style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);border-radius:14px;padding:32px;margin-bottom:24px;">
              <h1 style="margin:0 0 8px;font-size:22px;color:#e9d5ff;">You've been invited!</h1>
              <p style="margin:0;color:#9ca3af;font-size:15px;">Hello <strong style="color:#fff;">${firstName}</strong>, you have been added as <strong style="color:#c084fc;">${roleLabel}</strong> on Makeja Homes.</p>
            </div>
            <div style="background:#111;border:1px solid rgba(168,85,247,0.2);border-radius:12px;padding:24px;margin-bottom:24px;">
              <p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#e5e7eb;">Your Login Credentials</p>
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;color:#9ca3af;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">Email</td>
                  <td style="padding:8px 0;font-size:14px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);font-family:monospace;color:#a78bfa;">${normalizedEmail}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9ca3af;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">Temporary Password</td>
                  <td style="padding:8px 0;font-size:14px;text-align:right;font-family:monospace;color:#34d399;font-weight:700;">${tempPassword}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9ca3af;font-size:14px;">Your Account</td>
                  <td style="padding:8px 0;font-size:14px;text-align:right;font-family:monospace;color:#60a5fa;">${tenantSlug !== 'public' ? tenantSlug : 'Staff'}</td>
                </tr>
              </table>
            </div>
            <div style="background:#1c1400;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#fbbf24;">⚠️ You will be required to change this password on your first login. Select <strong>Staff Login</strong> on the login page.</p>
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(to right,#a855f7,#ec4899);color:white;text-decoration:none;padding:13px 32px;border-radius:9px;font-size:15px;font-weight:600;">Login to Dashboard →</a>
            </div>
            <p style="font-size:12px;color:#4b5563;text-align:center;">Questions? <a href="mailto:support@makejahomes.co.ke" style="color:#a855f7;">support@makejahomes.co.ke</a></p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[USERS] Invite email failed:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `User created successfully. Invite email sent to ${normalizedEmail}.`,
    });
  } catch (error: any) {
    console.error("Error creating user:", error?.message);
    return NextResponse.json({ error: "Failed to create user", details: error.message }, { status: 500 });
  }
}
