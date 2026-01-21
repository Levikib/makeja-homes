import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend, EMAIL_CONFIG } from "@/lib/resend";

function verifyCronSecret(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "dev-secret-change-in-production";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  console.log("🤖 [CRON] Daily tasks started at", new Date().toISOString());

  if (!verifyCronSecret(request)) {
    console.log("❌ [CRON] Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    expiredLeases: 0,
    renewalReminders30: 0,
    renewalReminders60: 0,
    renewalReminders90: 0,
    errors: [] as string[],
  };

  try {
    const expiredResult = await autoExpireLeases();
    results.expiredLeases = expiredResult.count;
    if (expiredResult.errors.length > 0) {
      results.errors.push(...expiredResult.errors);
    }

    const reminder90Result = await sendRenewalReminders(90);
    results.renewalReminders90 = reminder90Result.count;
    if (reminder90Result.errors.length > 0) {
      results.errors.push(...reminder90Result.errors);
    }

    const reminder60Result = await sendRenewalReminders(60);
    results.renewalReminders60 = reminder60Result.count;
    if (reminder60Result.errors.length > 0) {
      results.errors.push(...reminder60Result.errors);
    }

    const reminder30Result = await sendRenewalReminders(30);
    results.renewalReminders30 = reminder30Result.count;
    if (reminder30Result.errors.length > 0) {
      results.errors.push(...reminder30Result.errors);
    }

    console.log("✅ [CRON] Daily tasks completed:", results);

    return NextResponse.json({
      success: true,
      message: "Daily tasks completed successfully",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ [CRON] Fatal error:", error);
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 });
  }
}

async function autoExpireLeases() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const errors: string[] = [];
  let count = 0;

  try {
    const expiredLeases = await prisma.lease_agreements.findMany({
      where: { status: "ACTIVE", endDate: { lt: today } },
      include: { units: true, tenants: { include: { users: true } } },
    });

    console.log(`🔍 [CRON] Found ${expiredLeases.length} expired leases`);

    for (const lease of expiredLeases) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.lease_agreements.update({
            where: { id: lease.id },
            data: { status: "EXPIRED", updatedAt: new Date() },
          });
          await tx.units.update({
            where: { id: lease.unitId },
            data: { status: "VACANT", updatedAt: new Date() },
          });
        });

        await sendLeaseExpiryEmail(lease);
        count++;
        console.log(`✅ [CRON] Expired lease ${lease.id}`);
      } catch (error: any) {
        console.error(`❌ [CRON] Failed to expire lease ${lease.id}:`, error.message);
        errors.push(`Lease ${lease.id}: ${error.message}`);
      }
    }
  } catch (error: any) {
    console.error("❌ [CRON] Error in autoExpireLeases:", error);
    errors.push(`Fatal: ${error.message}`);
  }

  return { count, errors };
}

async function sendRenewalReminders(daysBeforeExpiry: number) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysBeforeExpiry);
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const errors: string[] = [];
  let count = 0;

  try {
    const expiringLeases = await prisma.lease_agreements.findMany({
      where: {
        status: "ACTIVE",
        endDate: { gte: targetDate, lt: nextDay },
      },
      include: {
        units: { include: { properties: true } },
        tenants: { include: { users: true } },
      },
    });

    console.log(`🔍 [CRON] Found ${expiringLeases.length} leases expiring in ${daysBeforeExpiry} days`);

    for (const lease of expiringLeases) {
      try {
        await sendRenewalReminderEmail(lease, daysBeforeExpiry);
        count++;
        console.log(`✅ [CRON] Sent ${daysBeforeExpiry}-day reminder for lease ${lease.id}`);
      } catch (error: any) {
        console.error(`❌ [CRON] Failed to send reminder for lease ${lease.id}:`, error.message);
        errors.push(`Lease ${lease.id}: ${error.message}`);
      }
    }
  } catch (error: any) {
    console.error(`❌ [CRON] Error in sendRenewalReminders:`, error);
    errors.push(`Fatal: ${error.message}`);
  }

  return { count, errors };
}

async function sendLeaseExpiryEmail(lease: any) {
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;background:#f4f4f4"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:30px;text-align:center"><h1 style="color:#fff;margin:0">🏠 Makeja Homes</h1><p style="color:#fee2e2;margin:10px 0 0">Lease Expiry Notice</p></div><div style="padding:40px 30px"><h2 style="color:#1f2937">Hello ${lease.tenants.users.firstName}!</h2><p style="color:#4b5563;line-height:1.6">Your lease for Unit ${lease.units.unitNumber} has expired as of ${new Date(lease.endDate).toLocaleDateString()}.</p><p style="color:#4b5563">Contact us at support@makejahomes.co.ke to discuss renewal options.</p></div></div></body></html>`;

  await resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: lease.tenants.users.email,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: `⚠️ Lease Expired - ${lease.units.unitNumber}`,
    html,
  });
}

async function sendRenewalReminderEmail(lease: any, daysRemaining: number) {
  const urgencyColor = daysRemaining === 30 ? "#ef4444" : daysRemaining === 60 ? "#f59e0b" : "#3b82f6";
  const urgencyText = daysRemaining === 30 ? "URGENT" : daysRemaining === 60 ? "Important" : "Reminder";

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;background:#f4f4f4"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:${urgencyColor};padding:30px;text-align:center"><h1 style="color:#fff;margin:0">🏠 Makeja Homes</h1><p style="color:rgba(255,255,255,0.9);margin:10px 0 0">${urgencyText}: Lease Renewal Reminder</p></div><div style="padding:40px 30px"><h2 style="color:#1f2937">Hello ${lease.tenants.users.firstName}!</h2><p style="color:#4b5563;line-height:1.6">Your lease expires in <strong style="color:${urgencyColor}">${daysRemaining} days</strong>.</p><div style="background:#f3f4f6;border-radius:8px;padding:20px;margin:20px 0"><p style="margin:5px 0"><strong>Property:</strong> ${lease.units.properties.name}</p><p style="margin:5px 0"><strong>Unit:</strong> ${lease.units.unitNumber}</p><p style="margin:5px 0"><strong>Rent:</strong> KSH ${lease.rentAmount.toLocaleString()}/month</p><p style="margin:5px 0"><strong>Expires:</strong> ${new Date(lease.endDate).toLocaleDateString()}</p></div><p style="color:#4b5563">Contact support@makejahomes.co.ke to renew!</p></div></div></body></html>`;

  await resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: lease.tenants.users.email,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: `${urgencyText}: Lease Expires in ${daysRemaining} Days - ${lease.units.unitNumber}`,
    html,
  });
}
