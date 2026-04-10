import { getPrismaForRequest } from "@/lib/get-prisma";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/log-activity";

// GET - Load lease data for signing
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    const db = getPrismaForRequest(request);

    // Find lease by signature token
    const leaseRows = await db.$queryRawUnsafe<any[]>(`
      SELECT la.id, la."startDate", la."endDate", la."rentAmount", la."depositAmount",
        la."contractSignedAt", la.terms, la."contractTerms",
        u."firstName", u."lastName", u.email,
        un."unitNumber", p.name AS "propertyName"
      FROM lease_agreements la
      JOIN tenants t ON t.id = la."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = la."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE la."signatureToken" = $1 LIMIT 1
    `, token);

    if (leaseRows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired lease agreement link' }, { status: 404 });
    }
    const lease = leaseRows[0];

    if (lease.contractSignedAt) {
      return NextResponse.json({ alreadySigned: true, message: 'This lease has already been signed' });
    }

    return NextResponse.json({
      id: lease.id,
      property: lease.propertyName,
      unitNumber: lease.unitNumber,
      tenant: `${lease.firstName} ${lease.lastName}`,
      email: lease.email,
      startDate: lease.startDate,
      endDate: lease.endDate,
      monthlyRent: lease.rentAmount,
      depositAmount: lease.depositAmount,
      terms: lease.contractTerms || lease.terms,
      alreadySigned: false,
    });

  } catch (error) {
    console.error('Error loading lease:', error);
    return NextResponse.json({ error: 'Failed to load lease agreement' }, { status: 500 });
  }
}

// POST - Process lease signature and create tenant account
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    const body = await request.json();
    const { signature, signatureType } = body;

    if (!signature) {
      return NextResponse.json({ error: 'Signature is required' }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Find lease by signature token with all needed fields
    const leaseRows = await db.$queryRawUnsafe<any[]>(`
      SELECT la.id, la."tenantId", la."unitId", la."contractSignedAt",
        t."userId",
        u."firstName", u."lastName", u.email, u."phoneNumber",
        un."unitNumber", p.name AS "propertyName"
      FROM lease_agreements la
      JOIN tenants t ON t.id = la."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = la."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE la."signatureToken" = $1 LIMIT 1
    `, token);

    if (leaseRows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired lease agreement link' }, { status: 404 });
    }
    const lease = leaseRows[0];

    if (lease.contractSignedAt) {
      return NextResponse.json({ error: 'This lease has already been signed' }, { status: 400 });
    }

    // Get request metadata
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const signerIp = forwardedFor || realIp || 'unknown';
    const signerUserAgent = request.headers.get('user-agent') || 'unknown';

    // Generate temporary password
    const { generateTempPassword } = require('@/lib/utils/password-generator');
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const now = new Date();

    console.log('Processing signature for:', lease.email);

    // 1. Update lease as signed
    await db.$executeRawUnsafe(`
      UPDATE lease_agreements
      SET "contractSignedAt" = $1, "signatureData" = $2, "signatureType" = $3,
          "signerIp" = $4, "signerUserAgent" = $5, "signerDeviceInfo" = $5,
          status = 'ACTIVE'::"LeaseStatus", "updatedAt" = $1
      WHERE id = $6
    `, now, signature, signatureType || 'typed', signerIp, signerUserAgent, lease.id);

    // 2. Create or update user account
    const existingUserRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id FROM users WHERE email = $1 LIMIT 1
    `, lease.email);

    if (existingUserRows.length > 0) {
      await db.$executeRawUnsafe(`
        UPDATE users SET password = $1, "mustChangePassword" = true, "isActive" = true, "updatedAt" = $2
        WHERE id = $3
      `, hashedPassword, now, existingUserRows[0].id);
      console.log('Updated existing user:', lease.email);
    } else {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      await db.$executeRawUnsafe(`
        INSERT INTO users (id, email, password, "mustChangePassword", "firstName", "lastName", "phoneNumber", role, "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, true, $4, $5, $6, 'TENANT'::"UserRole", true, $7, $7)
      `, userId, lease.email, hashedPassword, lease.firstName, lease.lastName, lease.phoneNumber || null, now);
      console.log('Created new user:', lease.email);

      // Link user to tenant
      await db.$executeRawUnsafe(`
        UPDATE tenants SET "userId" = $1, "updatedAt" = $2 WHERE id = $3
      `, userId, now, lease.tenantId);
    }

    // 3. Update unit status to OCCUPIED
    await db.$executeRawUnsafe(`
      UPDATE units SET status = 'OCCUPIED'::"UnitStatus", "updatedAt" = $1 WHERE id = $2
    `, now, lease.unitId);

    console.log('Lease signing completed successfully');

    // Log lease signing
    await logActivity(db, {
      userId: lease.tenantId,
      action: "LEASE_SIGNED",
      entityType: "lease_agreement",
      entityId: lease.id,
      details: { tenant: `${lease.firstName} ${lease.lastName}`, email: lease.email, property: lease.propertyName, unit: lease.unitNumber, signerIp },
    });

    // 4. Send welcome email
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      });

      await transporter.sendMail({
        from: `"Makeja Homes" <${process.env.SMTP_USER}>`,
        to: lease.email,
        subject: 'Welcome to Makeja Homes - Your Login Credentials',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .credentials-box { background: #f9fafb; border: 2px solid #2563eb; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .credential-item { margin: 15px 0; }
              .label { font-weight: bold; color: #4b5563; display: block; margin-bottom: 5px; }
              .value { font-size: 1.1em; color: #1e40af; font-family: monospace; background: white; padding: 10px; border-radius: 4px; border: 1px solid #d1d5db; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; color: #6b7280; font-size: 0.9em; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Welcome to Makeja Homes!</h1>
              <p>Your lease has been successfully signed</p>
            </div>
            <div class="content">
              <h2>Hello ${lease.firstName}!</h2>
              <p>Congratulations! Your lease for <strong>${lease.propertyName}</strong>, Unit <strong>${lease.unitNumber}</strong> has been digitally signed and is now active.</p>
              <div class="credentials-box">
                <h3 style="margin-top: 0; color: #2563eb;">Your Login Credentials</h3>
                <div class="credential-item">
                  <span class="label">Email:</span>
                  <div class="value">${lease.email}</div>
                </div>
                <div class="credential-item">
                  <span class="label">Temporary Password:</span>
                  <div class="value">${tempPassword}</div>
                </div>
              </div>
              <div class="warning">
                <strong>Important:</strong> This is a temporary password. You will be required to change it on your first login for security purposes.
              </div>
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/login" class="button">Login to Your Dashboard</a>
              </div>
              <h3>What's Next?</h3>
              <ul>
                <li>Login to your tenant dashboard using the credentials above</li>
                <li>Change your password to something secure and memorable</li>
                <li>View your lease agreement and payment history</li>
                <li>Submit maintenance requests</li>
                <li>Make rent payments</li>
              </ul>
              <div class="footer">
                <p>Need help? Contact us at <a href="mailto:makejahomes@gmail.com">makejahomes@gmail.com</a></p>
                <p>&copy; ${new Date().getFullYear()} Makeja Homes. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      console.log(`✅ Welcome email sent to ${lease.email}`);
    } catch (emailErr) {
      console.error("⚠️ Failed to send welcome email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Lease signed successfully. Check your email for login credentials.',
    });

  } catch (error) {
    console.error('Error processing lease signature:', error);
    return NextResponse.json({ error: 'Failed to process lease signature' }, { status: 500 });
  }
}
