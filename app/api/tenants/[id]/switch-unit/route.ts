import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { resend, EMAIL_CONFIG } from "@/lib/resend";
import { sanitizeOptional, sanitizeAmount } from "@/lib/sanitize";

export const dynamic = 'force-dynamic'

// GET /api/tenants/[id]/switch-unit — preview eligible vacant units for transfer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: params.id },
      include: {
        users: { select: { firstName: true, lastName: true, email: true } },
        units: { include: { properties: { select: { id: true, name: true } } } },
        lease_agreements: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    })
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 })

    // Eligible: vacant units in same or any property
    const vacantUnits = await prisma.units.findMany({
      where: { status: "VACANT", deletedAt: null, id: { not: tenant.unitId } },
      include: { properties: { select: { id: true, name: true } } },
      orderBy: [{ properties: { name: "asc" } }, { unitNumber: "asc" }],
    })

    const activeLease = tenant.lease_agreements[0]
    return NextResponse.json({
      tenant: { id: tenant.id, name: `${tenant.users.firstName} ${tenant.users.lastName}`, email: tenant.users.email },
      currentUnit: { id: tenant.unitId, unitNumber: tenant.units.unitNumber, propertyName: tenant.units.properties.name, rentAmount: activeLease?.rentAmount ?? tenant.rentAmount },
      currentLease: activeLease ? { id: activeLease.id, endDate: activeLease.endDate, depositAmount: activeLease.depositAmount } : null,
      vacantUnits: vacantUnits.map(u => ({ id: u.id, unitNumber: u.unitNumber, propertyId: u.propertyId, propertyName: u.properties.name, rentAmount: u.rentAmount, depositAmount: u.depositAmount, bedrooms: (u as any).bedrooms, type: (u as any).type })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to load transfer data" }, { status: 500 })
  }
}

// POST /api/tenants/[id]/switch-unit — execute the unit transfer
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth guard — only ADMIN or MANAGER
  const token = request.cookies.get("token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let adminId: string
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    adminId = payload.id as string
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  try {
    const body = await request.json();
    const newUnitId = sanitizeOptional(body.newUnitId, 100);
    const keepDeposit: boolean = body.keepDeposit !== false;
    const effectiveDate = sanitizeOptional(body.effectiveDate, 20);
    const rentOverride = body.rentOverride != null ? sanitizeAmount(body.rentOverride, "rentOverride") : undefined;
    const notes = sanitizeOptional(body.notes, 500);
    const tenantId = params.id;

    // Validate inputs
    if (!newUnitId) {
      return NextResponse.json({ error: "New unit ID is required" }, { status: 400 });
    }

    // Execute the unit switch in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get tenant with current unit and active lease
      const tenant = await tx.tenants.findUnique({
        where: { id: tenantId },
        include: {
          users: true,
          units: {
            include: {
              properties: true,
            },
          },
          lease_agreements: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!tenant) {
        throw new Error("Tenant not found");
      }

      const activeLease = tenant.lease_agreements[0];
      if (!activeLease) {
        throw new Error("No active lease found for tenant");
      }

      // 2. Get new unit
      const newUnit = await tx.units.findUnique({
        where: { id: newUnitId },
        include: {
          properties: true,
        },
      });

      if (!newUnit) {
        throw new Error("New unit not found");
      }

      if (newUnit.status !== "VACANT") {
        throw new Error("Selected unit is not vacant");
      }

      // 3. Terminate current lease
      await tx.lease_agreements.update({
        where: { id: activeLease.id },
        data: {
          status: "TERMINATED",
          updatedAt: new Date(),
        },
      });

      // 4. Update old unit to VACANT
      await tx.units.update({
        where: { id: tenant.unitId },
        data: {
          status: "VACANT",
          updatedAt: new Date(),
        },
      });

      // 5. Update new unit to RESERVED (will become OCCUPIED when lease is signed)
      await tx.units.update({
        where: { id: newUnitId },
        data: {
          status: "RESERVED",
          updatedAt: new Date(),
        },
      });

      // 6. Update tenant's unitId
      await tx.tenants.update({
        where: { id: tenantId },
        data: {
          unitId: newUnitId,
          updatedAt: new Date(),
        },
      });

      // 7. Calculate deposit for new lease
      const depositAmount = keepDeposit
        ? activeLease.depositAmount
        : newUnit.depositAmount;

      // 8. Create new PENDING lease for new unit
      const effectiveDateObj = effectiveDate ? new Date(effectiveDate) : new Date();
      const oneYearLater = new Date(effectiveDateObj);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const newRentAmount = rentOverride ? Number(rentOverride) : newUnit.rentAmount;

      // Generate lease ID
      const leaseId = `lease_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const signatureToken = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const fmtDate = (d: Date) => d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
      const contractTerms = `UNIT TRANSFER LEASE AGREEMENT

PROPERTY: ${newUnit.properties.name}
UNIT: ${newUnit.unitNumber}
TENANT: ${tenant.users.firstName} ${tenant.users.lastName}

This agreement supersedes the previous lease for Unit ${tenant.units.unitNumber} at ${tenant.units.properties.name}.

LEASE PERIOD:
Effective Date: ${fmtDate(effectiveDateObj)}
End Date: ${fmtDate(oneYearLater)}

FINANCIAL TERMS:
Monthly Rent: KES ${newRentAmount.toLocaleString()}
Security Deposit: KES ${(depositAmount ?? 0).toLocaleString()}
${keepDeposit ? "Security deposit transferred from previous unit." : "New deposit required."}
${notes ? `\nTransfer Notes: ${notes}` : ""}

PAYMENT:
Rent is due on the 1st of each month.

PROPERTY CONDITION:
The tenant accepts the unit in its current condition upon transfer.

By digitally signing this agreement, the tenant confirms understanding and acceptance of all terms.`;

      const newLease = await tx.lease_agreements.create({
        data: {
          id: leaseId,
          tenantId,
          unitId: newUnitId,
          status: "PENDING",
          startDate: effectiveDateObj,
          endDate: oneYearLater,
          rentAmount: newRentAmount,
          depositAmount: depositAmount ?? 0,
          contractTerms,
          signatureToken,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 9. Audit log the transfer
      await tx.activity_logs.create({
        data: {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          userId: adminId,
          action: "UNIT_TRANSFER",
          entityType: "tenant",
          entityId: tenantId,
          details: JSON.stringify({
            fromUnit: tenant.units.unitNumber,
            fromProperty: tenant.units.properties.name,
            toUnit: newUnit.unitNumber,
            toProperty: newUnit.properties.name,
            depositTransferred: keepDeposit,
            oldRent: activeLease.rentAmount,
            newRent: newRentAmount,
            effectiveDate: effectiveDateObj.toISOString(),
            notes: notes ?? null,
          }),
          createdAt: new Date(),
        },
      }).catch(() => {}) // Non-fatal if activity_logs unavailable

      return {
        tenant,
        oldUnit: tenant.units,
        newUnit,
        newLease,
        depositAmount,
      };
    });

    // 9. Send email to tenant with new lease agreement
    const signUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sign-lease/${result.newLease.signatureToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🏠 Unit Switch Approved!</h1>
      <p style="color: #fed7aa; margin: 10px 0 0 0; font-size: 16px;">New Lease Agreement Ready</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #1f2937; margin-top: 0;">Hello ${result.tenant.users.firstName}! 👋</h2>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Great news! Your unit switch request has been approved. You're moving from <strong>${result.oldUnit.properties.name} - Unit ${result.oldUnit.unitNumber}</strong> to <strong>${result.newUnit.properties.name} - Unit ${result.newUnit.unitNumber}</strong>!
      </p>

      <!-- New Unit Details -->
      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 4px; margin: 30px 0;">
        <h3 style="color: #059669; margin-top: 0; margin-bottom: 15px;">📋 New Unit Details</h3>
        <div style="color: #065f46;">
          <p style="margin: 5px 0;"><strong>Property:</strong> ${result.newUnit.properties.name}</p>
          <p style="margin: 5px 0;"><strong>Unit:</strong> ${result.newUnit.unitNumber}</p>
          <p style="margin: 5px 0;"><strong>Monthly Rent:</strong> KSH ${result.newUnit.rentAmount.toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Security Deposit:</strong> KSH ${(result.depositAmount ?? 0).toLocaleString()} ${keepDeposit ? "(transferred)" : ""}</p>
        </div>
      </div>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        To complete the unit switch, please review and sign your new lease agreement by clicking the button below:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${signUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          Sign New Lease Agreement
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
        Or copy and paste this link into your browser:<br>
        <a href="${signUrl}" style="color: #3b82f6; word-break: break-all;">${signUrl}</a>
      </p>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 30px;">
        Once you sign the agreement, your new unit will be activated and you can start moving in!
      </p>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        If you have any questions, please contact us at <strong>${EMAIL_CONFIG.replyTo}</strong>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
        © ${new Date().getFullYear()} Makeja Homes. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: result.tenant.users.email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `🏠 Unit Switch Approved - Sign New Lease for ${result.newUnit.properties.name} Unit ${result.newUnit.unitNumber}`,
      html,
    });

    console.log("✅ Unit switch completed:", {
      tenant: `${result.tenant.users.firstName} ${result.tenant.users.lastName}`,
      from: `${result.oldUnit.properties.name} - ${result.oldUnit.unitNumber}`,
      to: `${result.newUnit.properties.name} - ${result.newUnit.unitNumber}`,
      newRent: result.newUnit.rentAmount,
      depositTransferred: keepDeposit,
      newLeaseId: result.newLease.id,
    });

    return NextResponse.json({
      success: true,
      message: "Unit switch completed successfully",
      data: {
        oldUnit: result.oldUnit.unitNumber,
        newUnit: result.newUnit.unitNumber,
        newLeaseId: result.newLease.id,
      },
    });
  } catch (error: any) {
    console.error("❌ Unit switch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to switch unit" },
      { status: 500 }
    );
  }
}
