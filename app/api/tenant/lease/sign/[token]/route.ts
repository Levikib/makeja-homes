import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Load lease data for signing
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Find lease by signature token
    const lease = await prisma.lease_agreements.findUnique({
      where: { signatureToken: token },
      include: {
        tenants: true,
        units: {
          include: {
            properties: true,
          },
        },
      },
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Invalid or expired lease agreement link' },
        { status: 404 }
      );
    }

    // Check if already signed
    if (lease.contractSignedAt) {
      return NextResponse.json({
        alreadySigned: true,
        message: 'This lease has already been signed',
      });
    }

    // Return lease data
    return NextResponse.json({
      id: lease.id,
      property: lease.units.properties.name,
      unitNumber: lease.units.unitNumber,
      tenant: `${lease.tenants.firstName} ${lease.tenants.lastName}`,
      email: lease.tenants.users.email,
      startDate: lease.startDate,
      endDate: lease.endDate,
      monthlyRent: lease.rentAmount,
      depositAmount: lease.depositAmount,
      terms: lease.contractTerms || lease.terms,
      alreadySigned: false,
    });

  } catch (error) {
    console.error('Error loading lease:', error);
    return NextResponse.json(
      { error: 'Failed to load lease agreement' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Process lease signature and create tenant account
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    const body = await request.json();
    const { signature, signatureType } = body;

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature is required' },
        { status: 400 }
      );
    }

    // Find lease by signature token
    const lease = await prisma.lease_agreements.findUnique({
      where: { signatureToken: token },
      include: {
        tenants: {
          include: {
            users: true,
          }
        },
        units: {
         include: {
          properties: true,
         },
       },
      },
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Invalid or expired lease agreement link' },
        { status: 404 }
      );
    }

    // Check if already signed
    if (lease.contractSignedAt) {
      return NextResponse.json(
        { error: 'This lease has already been signed' },
        { status: 400 }
      );
    }

    // Get request metadata for audit trail
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const signerIp = forwardedFor || realIp || 'unknown';
    const signerUserAgent = request.headers.get('user-agent') || 'unknown';

    // Import password utilities
    const bcrypt = require('bcryptjs');
    const { generateTempPassword } = require('@/lib/utils/password-generator');

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    console.log('Processing signature for: ', lease.tenants.users.email);

    // Start transaction - Update lease, create/update user, update unit, send email
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update lease agreement with signature
      const updatedLease = await tx.lease_agreements.update({
        where: { id: lease.id },
        data: {
          contractSignedAt: new Date(),
          signatureData: signature,
          signatureType: signatureType || 'typed',
          signerIp,
          signerUserAgent,
          signerDeviceInfo: signerUserAgent,
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });

      // 2. Create or update user account with temp password
      let user;
      const existingUser = await tx.users.findUnique({
        where: { email: lease.tenants.users.email },
      });

      if (existingUser) {
        // Update existing user with temp password
        user = await tx.users.update({
          where: { id: existingUser.id },
          data: {
            password: hashedPassword,
            password: tempPassword,
            mustChangePassword: true,
            isActive: true,
            updatedAt: new Date(),
          },
        });
       console.log('Updated existing user:', user.email);
      } else {
        // Create new user account
        const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        user = await tx.users.create({
          data: {
            id: userId,
            email: lease.tenants.users.email,
            password: hashedPassword,
            password: tempPassword,
            mustChangePassword: true,
            firstName: lease.tenants.users.firstName,
            lastName: lease.tenants.users.lastName,
            phoneNumber: lease.tenants.users.phone,
            role: 'TENANT',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log('Created new user:', user.email);

        // Link user to tenant record
        await tx.tenants.update({
          where: { id: lease.tenantId },
          data: { userId: user.id },
        });
      }

      // 3. Update unit status to OCCUPIED
      await tx.units.update({
        where: { id: lease.unitId },
        data: {
          status: 'OCCUPIED',
          updatedAt: new Date(),
        },
      });

      return { updatedLease, user, tempPassword };
    });

    console.log('Transaction completed successfully');

    // 4. Send welcome email with login credentials
    const { resend } = require('@/lib/resend');
    
    const welcomeEmailHTML = `
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
          <h1>🎉 Welcome to Makeja Homes!</h1>
          <p>Your lease has been successfully signed</p>
        </div>

        <div class="content">
          <h2>Hello ${lease.tenants.firstName}!</h2>
          
          <p>Congratulations! Your lease for <strong>${lease.units.properties.name}</strong>, Unit <strong>${lease.units.unitNumber}</strong> has been digitally signed and is now active.</p>

          <div class="credentials-box">
            <h3 style="margin-top: 0; color: #2563eb;">🔐 Your Login Credentials</h3>
            
            <div class="credential-item">
              <span class="label">Email:</span>
              <div class="value">${lease.tenants.email}</div>
            </div>

            <div class="credential-item">
              <span class="label">Temporary Password:</span>
              <div class="value">${result.tempPassword}</div>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Important:</strong> This is a temporary password. You will be required to change it on your first login for security purposes.
          </div>

          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/login" class="button">
              Login to Your Dashboard
            </a>
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
    `;

    await resend.emails.send({
      from: 'Makeja Homes <onboarding@resend.dev>',
      to: lease.tenants.email,
      subject: '🎉 Welcome to Makeja Homes - Your Login Credentials',
      html: welcomeEmailHTML,
    });

    console.log(`✅ Lease signed and welcome email sent to ${lease.tenants.email}`);

    return NextResponse.json({
      success: true,
      message: 'Lease signed successfully. Check your email for login credentials.',
    });

  } catch (error) {
    console.error('Error processing lease signature:', error);
    return NextResponse.json(
      { error: 'Failed to process lease signature' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
