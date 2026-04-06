import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth-helpers"
import { getPrismaForRequest } from "@/lib/get-prisma";
import { resend, EMAIL_CONFIG } from "@/lib/resend";
import bcrypt from "bcryptjs";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// GET - List all users (excluding tenants by default)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    const prisma = getPrismaForRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    // Exclude TENANT role from users list
    if (!role) {
      where.role = {
        not: "TENANT"
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
        idNumber: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Get property counts for each user
    const usersWithPropertyCounts = await Promise.all(
      users.map(async (user) => {
        // Count properties where user is in managerIds, caretakerIds, or storekeeperIds arrays
        const properties = await prisma.properties.findMany({
          where: {
            OR: [
              { managerIds: { has: user.id } },
              { caretakerIds: { has: user.id } },
              { storekeeperIds: { has: user.id } }
            ]
          },
          select: {
            id: true,
            name: true
          }
        });

        return {
          ...user,
          propertyCount: properties.length,
          properties: properties
        };
      })
    );

    return NextResponse.json({ users: usersWithPropertyCounts });
  } catch (error) {
    console.error("❌ Users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    const prisma = getPrismaForRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can create users
    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phoneNumber, idNumber, role, propertyIds } = body;

    // Validate required fields (password is auto-generated — no longer required from client)
    if (!firstName || !lastName || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, email, role" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER", "TECHNICAL"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be one of: " + validRoles.join(", ") },
        { status: 400 }
      );
    }

    // Validate caretaker can only have 1 property
    if (role === "CARETAKER" && propertyIds && propertyIds.length > 1) {
      return NextResponse.json(
        { error: "Caretaker can only be assigned to ONE property" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Check if idNumber already exists (if provided)
    if (idNumber) {
      const existingIdNumber = await prisma.users.findFirst({
        where: { idNumber },
      });

      if (existingIdNumber) {
        return NextResponse.json(
          { error: "ID Number already exists" },
          { status: 400 }
        );
      }
    }

    // Generate temp password — staff will be required to change on first login
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date();

    // Create user and assign properties using ARRAYS
    await prisma.$transaction(async (tx) => {
      // Create user
      await tx.users.create({
        data: {
          id: userId,
          firstName,
          lastName,
          email,
          phoneNumber: phoneNumber || null,
          idNumber: idNumber || null,
          password: hashedPassword,
          role,
          isActive: true,
          mustChangePassword: true,
          emailVerified: null,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Assign properties based on role (using array fields)
      if (propertyIds && propertyIds.length > 0) {
        for (const propertyId of propertyIds) {
          const property = await tx.properties.findUnique({
            where: { id: propertyId },
            select: {
              managerIds: true,
              caretakerIds: true,
              storekeeperIds: true
            }
          });

          if (!property) continue;

          const updateData: any = { updatedAt: now };

          if (role === "MANAGER") {
            updateData.managerIds = [...property.managerIds, userId];
          } else if (role === "CARETAKER") {
            updateData.caretakerIds = [...property.caretakerIds, userId];
          } else if (role === "STOREKEEPER") {
            updateData.storekeeperIds = [...property.storekeeperIds, userId];
          }

          await tx.properties.update({
            where: { id: propertyId },
            data: updateData,
          });
        }
      }
    });

    // Send invite email with temp password (best-effort)
    const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();
    try {
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        replyTo: EMAIL_CONFIG.replyTo,
        to: email,
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
                  <td style="padding:8px 0;font-size:14px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);font-family:monospace;color:#a78bfa;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9ca3af;font-size:14px;">Temporary Password</td>
                  <td style="padding:8px 0;font-size:14px;text-align:right;font-family:monospace;color:#34d399;font-weight:700;">${tempPassword}</td>
                </tr>
              </table>
            </div>
            <div style="background:#1c1400;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#fbbf24;">⚠️ You will be required to change this password on your first login.</p>
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="https://makejahomes.co.ke/auth/login" style="display:inline-block;background:linear-gradient(to right,#a855f7,#ec4899);color:white;text-decoration:none;padding:13px 32px;border-radius:9px;font-size:15px;font-weight:600;">Login to Dashboard →</a>
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
      message: `User created successfully. Invite email sent to ${email}.`,
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user", details: error.message },
      { status: 500 }
    );
  }
}
