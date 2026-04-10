import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth-helpers";
import { getPrismaForRequest } from "@/lib/get-prisma";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic'

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// POST /api/users/[id]/resend-invite
// Generates a fresh temp password and re-sends the invite email
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (currentUser.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const db = getPrismaForRequest(request);

    const rows = await db.$queryRawUnsafe(`
      SELECT id, email, "firstName", "lastName", role::text as role, "isActive"
      FROM users WHERE id = $1 LIMIT 1
    `, params.id) as any[];

    if (!rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const user = rows[0];

    if (user.role === "TENANT") {
      return NextResponse.json({ error: "Cannot resend staff invite to a tenant account" }, { status: 400 });
    }

    // Generate a fresh temp password and reset mustChangePassword
    const tempPassword = generateTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 10);
    await db.$executeRawUnsafe(`
      UPDATE users SET password = $1, "mustChangePassword" = true, "updatedAt" = NOW() WHERE id = $2
    `, hashed, params.id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://makejahomes.co.ke";
    const roleLabel = user.role.charAt(0) + user.role.slice(1).toLowerCase();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    await transporter.sendMail({
      from: `"Makeja Homes" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `[Reminder] Your Makeja Homes invitation — ${roleLabel}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;padding:32px 20px;color:#fff;">
          <div style="text-align:center;margin-bottom:28px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#a855f7,#ec4899);border-radius:10px;padding:10px 18px;">
              <span style="color:white;font-size:18px;font-weight:bold;">🏠 Makeja Homes</span>
            </div>
          </div>
          <div style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);border-radius:14px;padding:32px;margin-bottom:24px;">
            <h1 style="margin:0 0 8px;font-size:22px;color:#e9d5ff;">Invitation Reminder</h1>
            <p style="margin:0;color:#9ca3af;font-size:15px;">Hello <strong style="color:#fff;">${user.firstName}</strong>, this is a reminder that you have been invited as <strong style="color:#c084fc;">${roleLabel}</strong> on Makeja Homes. A new temporary password has been generated for you.</p>
          </div>
          <div style="background:#111;border:1px solid rgba(168,85,247,0.2);border-radius:12px;padding:24px;margin-bottom:24px;">
            <p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#e5e7eb;">Your Updated Login Credentials</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;color:#9ca3af;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">Email</td>
                <td style="padding:8px 0;font-size:14px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);font-family:monospace;color:#a78bfa;">${user.email}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#9ca3af;font-size:14px;">New Temporary Password</td>
                <td style="padding:8px 0;font-size:14px;text-align:right;font-family:monospace;color:#34d399;font-weight:700;">${tempPassword}</td>
              </tr>
            </table>
          </div>
          <div style="background:#1c1400;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#fbbf24;">⚠️ You will be required to change this password on your first login. Select <strong>Staff Login</strong> on the login page.</p>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${appUrl}/auth/login" style="display:inline-block;background:linear-gradient(to right,#a855f7,#ec4899);color:white;text-decoration:none;padding:13px 32px;border-radius:9px;font-size:15px;font-weight:600;">Login to Dashboard →</a>
          </div>
          <p style="font-size:12px;color:#4b5563;text-align:center;">Questions? <a href="mailto:support@makejahomes.co.ke" style="color:#a855f7;">support@makejahomes.co.ke</a></p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: `Invite resent to ${user.email}` });
  } catch (error: any) {
    console.error("Resend invite error:", error?.message);
    return NextResponse.json({ error: "Failed to resend invite" }, { status: 500 });
  }
}
