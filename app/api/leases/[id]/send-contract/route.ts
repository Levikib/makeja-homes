import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend, EMAIL_CONFIG } from "@/lib/resend";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("=== SEND CONTRACT STARTED ===");
  console.log("Lease ID:", params.id);
  
  try {
    // Get lease with full details
    const lease = await prisma.lease_agreements.findUnique({
      where: { id: params.id },
      include: {
        tenants: {
          include: {
            users: true,
          },
        },
        units: {
          include: {
            properties: true,
          },
        },
      },
    });

    if (!lease) {
      console.log("ERROR: Lease not found");
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    console.log("Lease found for tenant:", lease.tenants.users.email);

    // Generate unique signature token
    const signatureToken = crypto.randomBytes(32).toString("hex");
    console.log("Generated signature token:", signatureToken.substring(0, 10) + "...");
    
    // Create signature link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const signatureLink = `${baseUrl}/sign-lease/${signatureToken}`;
    console.log("Signature link:", signatureLink);

    // Prepare contract terms
    const contractTerms = `
RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on ${new Date().toLocaleDateString()} between:

LANDLORD: Makeja Homes
Property Management Company

TENANT: ${lease.tenants.users.firstName} ${lease.tenants.users.lastName}
Email: ${lease.tenants.users.email}
Phone: ${lease.tenants.users.phoneNumber || "N/A"}

PROPERTY DETAILS:
Property: ${lease.units.properties.name}
Unit: ${lease.units.unitNumber}
Address: ${lease.units.properties.address}, ${lease.units.properties.city}

LEASE TERMS:
1. TERM: This lease shall commence on ${new Date(lease.startDate).toLocaleDateString()} and terminate on ${new Date(lease.endDate).toLocaleDateString()}.

2. RENT: Tenant agrees to pay monthly rent of KSH ${lease.rentAmount.toLocaleString()} due on the 1st day of each month.

3. SECURITY DEPOSIT: Tenant has paid a security deposit of KSH ${lease.depositAmount.toLocaleString()}.

4. USE OF PREMISES: The premises shall be used solely for residential purposes.

5. UTILITIES: Tenant is responsible for payment of electricity, water, and other utilities.

6. MAINTENANCE: Tenant agrees to maintain the premises in good condition and report any damages immediately.

7. PETS: No pets allowed without prior written consent from landlord.

8. SUBLETTING: Tenant shall not sublet the premises without written consent from landlord.

9. TERMINATION: Either party may terminate this agreement with 30 days written notice.

10. GOVERNING LAW: This agreement shall be governed by the laws of Kenya.

By signing this agreement digitally, tenant acknowledges having read, understood, and agreed to all terms and conditions stated above.
    `.trim();

    console.log("Contract terms prepared");

    // Update lease with contract data
    await prisma.lease_agreements.update({
      where: { id: params.id },
      data: {
        signatureToken,
        contractTerms,
        contractSentAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("Database updated with signature token");

    // Create HTML email
    const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🏠 Makeja Homes</h1>
      <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Property Management</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #1f2937; margin-top: 0;">Hello ${lease.tenants.users.firstName}! 👋</h2>
      
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Your lease agreement is ready for review and signature. Please review the details below and sign digitally to activate your lease.
      </p>

      <!-- Lease Details Card -->
      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
          📋 Lease Details
        </h3>
        
        <div style="margin-bottom: 15px;">
          <span style="color: #6b7280; font-size: 14px; display: block;">Property</span>
          <span style="color: #1f2937; font-size: 16px; font-weight: bold;">${lease.units.properties.name}</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <span style="color: #6b7280; font-size: 14px; display: block;">Unit</span>
          <span style="color: #1f2937; font-size: 16px; font-weight: bold;">Unit ${lease.units.unitNumber}</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <span style="color: #6b7280; font-size: 14px; display: block;">Monthly Rent</span>
          <span style="color: #059669; font-size: 20px; font-weight: bold;">KSH ${lease.rentAmount.toLocaleString()}</span>
        </div>
        
        <div>
          <span style="color: #6b7280; font-size: 14px; display: block;">Lease Period</span>
          <span style="color: #1f2937; font-size: 16px; font-weight: bold;">${new Date(lease.startDate).toLocaleDateString()} - ${new Date(lease.endDate).toLocaleDateString()}</span>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a 
          href="${signatureLink}"
          style="display: inline-block; background-color: #667eea; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);"
        >
          📝 Review & Sign Lease Agreement
        </a>
      </div>

      <!-- Important Notice -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 30px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          ⚠️ <strong>Important:</strong> This link is unique to you and valid for the duration of your lease. Please keep it secure and do not share it with others.
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
        If you have any questions about your lease agreement, please contact our office at support@makejahomes.com or reply to this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
        © ${new Date().getFullYear()} Makeja Homes. All rights reserved.
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0; text-align: center;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    console.log("HTML email template created");
    console.log("Preparing to send email...");
    console.log("TO:", lease.tenants.users.email);
    console.log("FROM:", EMAIL_CONFIG.from);
    console.log("SUBJECT:", `📝 Your Lease Agreement - ${lease.units.properties.name}, Unit ${lease.units.unitNumber}`);

    // Check if Resend client is properly initialized
    console.log("Resend client:", resend ? "initialized" : "NOT INITIALIZED");
    console.log("API Key present:", process.env.RESEND_API_KEY ? "YES" : "NO");

    // Send email
    console.log("Calling Resend API...");
    const emailData = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: lease.tenants.users.email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `📝 Your Lease Agreement - ${lease.units.properties.name}, Unit ${lease.units.unitNumber}`,
      html: htmlEmail,
    });

    console.log("=== RESEND API RESPONSE ===");
    console.log("Full response:", JSON.stringify(emailData, null, 2));
    console.log("Email ID:", emailData.data?.id);
    console.log("Error:", emailData.error);
    console.log("=========================");

    return NextResponse.json({
      success: true,
      message: "Contract sent successfully!",
      emailId: emailData.data?.id,
      signatureLink,
      recipientEmail: lease.tenants.users.email,
      debug: {
        resendResponse: emailData,
      }
    });
  } catch (error: any) {
    console.error("=== ERROR IN SEND CONTRACT ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("==============================");
    
    return NextResponse.json(
      { 
        error: "Failed to send contract", 
        details: error.message,
        errorName: error.name,
      },
      { status: 500 }
    );
  }
}
