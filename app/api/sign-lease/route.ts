 import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
 import { syncUnitStatus } from "@/lib/utils/sync-unit-status";
 import { generateTempPassword } from "@/lib/utils/password-generator";
 import { resend } from "@/lib/resend";
 import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { leaseId, agreed } = await request.json();

    if (!agreed) {
     return NextResponse.json(
       { error: "You must agree to the terms to sign the lease" },
       { status: 400 }
      );
     }

    // Get client information for audit trail
    const ip = request.headers.get("x-forwarded-for") ||
               request.headers.get("x-real-ip") ||
               "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Create comprehensive signature data
    const now = new Date();
    const signatureData = {
      signedAt: now.toISOString(),
      ip,
      userAgent,
      agreed: true,
      method: "DIGITAL_CONSENT",
      timestamp: now.getTime(),
     };

     console.log('Processing lease signature for:', leaseId);

     // Get lease with tenant and user data
     const lease = await prisma.lease_agreements.findUnique({
       where: { id: leaseId },
       include: {
        tenants: {
         include: {
           users: true
          }
         },
         units: {
           include: {
             properties: true
            }
           }
          }
        });

       if (!lease) {
        return NextResponse.json(
          { error: "Lease not found" },
          { status: 404 }
         );
       }

       const user = lease.tenants.users;
       console.log('User email:', user.email);

       // Generate temp password
       const tempPassword = generateTempPassword();
       const hashedPassword = await bcrypt.hash(tempPassword, 10);

       console.log('Generated temp password');

      // Start transaction: Update lease, update user, sync unit, send email
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update lease with signature information
        const updatedLease = await tx.lease_agreements.update({
          where: { id: leaseId },
          data: {
            status: "ACTIVE",
            contractSignedAt: now,
            signerIp: ip,
            signerUserAgent: userAgent,
            signatureType: "DIGITAL_CONSENT",
            signatureData: JSON.stringify(signatureData),
            agreementCheckboxes: JSON.stringify({
                termsAgreed: true,
                agreedAt: now.toISOString(),
            }),
             updatedAt: now,
           },
           include: {
             units: true,
           },
         });

         console.log('Lease updated to ACTIVE');

         // 2. Update user temp password and require password change
         const updatedUser = await tx.users.update({
           where: { id: user.id },
           data: {
            password: hashedPassword,
            mustChangePassword: true,
            isActive: true,
            updatedAt: now,
           },
          });

          console.log('User updated with temp password');

          return { updatedLease, updatedUser, tempPassword };
        });

        // Sync unit status (RESERVED > OCCUPIED)
        await syncUnitStatus(result.updatedLease.unitId);

        console.log('Unit status synced');

        // Send welcome email with login credentials
        const welcomeEmailHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #256eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8 px; }
              .credentials-box { background: #f9fafb; border: 2px solid #2563b; padding: 20px; border-radius: 8px; marging: 20px 0; }
              .credential-item { margin: 15px 0 }
              .label { font-weight: bold; color: #4b5563; display: block; margin-bottom: 5px }
              .value { font-size: 1.1em; color: #1e40af; font-family: monospace; background: white; padding: 10px; border-radius: 4px; border: 1px solid #d1d5db; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; color: #6b7280; font-size: 0.9em; margin-top: 30px }
          </style>
          </head>
          <body>
            <div class="header">
               <h1> Welcome to Makeja Homes!</h1>
               <p> Your Lease has been successfully signed </p>
             </div>

             <div class="content">
                <h2>Hello ${user.firstName}!</h2>
     
                <p> Congratulation! Your lease for <strong>${lease.units.properties.name}</strong>, Unit <strong>${lease.units.unitNumber}</strong> has been digitally signed and is now active.</p>

                <div class="credential-item">
                  <span class="label">Email:</span>
                  <div class="value">${user.email}</div>
                </div>
         
                <div class="credential-item">
                  <span class="label">Temporary Password:</span>
                  <div class="value">${result.tempPassword}</div>
                </div>
               </div>

              <div class="warning">
                <strong> Important:</strong> This is is temporary password. You willbe required to change it on your first login for security purposes.
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
              <li>View your lease agreements and payment history</li>
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

       console.log('Sending welcome email to:', user.email);

       const emailResult = await resend.emails.send({
         from: 'Makeja Homes <noreply@makejahomes.co.ke>',
         to: user.email,
         subject: 'Welcome to Makeja Homesn - Your Login Credentials',
         html: welcomeEmailHTML,
        });

        console.log('Email result:', JSON.stringify(emailResult, null, 2));

        if (emailResult.error) {
          console.error('Email send error:', emailResult.error);
        } else {
          console.log('Welcome email sent successfully!');
        }

        return NextResponse.json({
          success: true,
          message: "Lease signed successfully!",
          lease: {
            id: result.updatedLease.id,
            status: result.updatedLease.status,
            signedAt: result.updatedLease.contractSignedAt,
           },
         });

       } catch (error: any) {
          console.error("Error signing lease:", error);
          return NextResponse.json(
            { error: "Failed to sign lease", details: error.message },
            { status: 500 }
        );
      }
    }


