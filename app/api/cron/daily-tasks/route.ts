import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMasterPrisma } from "@/lib/get-prisma";
import { resend, EMAIL_CONFIG } from "@/lib/resend";

export const dynamic = 'force-dynamic'

function verifyCronSecret(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || "dev-secret-change-in-production";
  const authHeader = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const urlSecret = new URL(request.url).searchParams.get("secret");
  return (
    authHeader === `Bearer ${cronSecret}` ||
    headerSecret === cronSecret ||
    urlSecret === cronSecret
  );
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
    // Mark overdue bills
    const overdueResult = await markOverdueBills();
    (results as any).overdueBillsMarked = overdueResult.count;
    if (overdueResult.errors.length > 0) results.errors.push(...overdueResult.errors);

    // Auto-generate monthly bills on the 1st of each month
    if (new Date().getDate() === 1) {
      const billsResult = await generateMonthlyBills();
      (results as any).monthlyBillsGenerated = billsResult.count;
      if (billsResult.errors.length > 0) results.errors.push(...billsResult.errors);
    }

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

    // Subscription expiry notifications (master DB — cross-tenant)
    const subResult = await processSubscriptionExpiry();
    (results as any).trialExpiredNotified = subResult.expired;
    (results as any).trialWarningsSent = subResult.warnings;
    if (subResult.errors.length > 0) results.errors.push(...subResult.errors);

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

async function markOverdueBills() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const errors: string[] = [];
  let count = 0;
  try {
    const result = await prisma.monthly_bills.updateMany({
      where: { status: { in: ["PENDING", "UNPAID"] }, dueDate: { lt: today } },
      data: { status: "OVERDUE" },
    });
    count = result.count;
    console.log(`✅ [CRON] Marked ${count} bills as OVERDUE`);
  } catch (error: any) {
    console.error("❌ [CRON] Error marking overdue bills:", error);
    errors.push(`markOverdueBills: ${error.message}`);
  }
  return { count, errors };
}

async function generateMonthlyBills() {
  const errors: string[] = [];
  let count = 0;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 28);

  try {
    const activeLeases = await prisma.lease_agreements.findMany({
      where: { status: "ACTIVE" },
      include: { tenants: true },
    });

    for (const lease of activeLeases) {
      try {
        const existing = await prisma.monthly_bills.findFirst({
          where: { tenantId: lease.tenantId, month: { gte: monthStart } },
        });
        if (existing) continue;

        await prisma.monthly_bills.create({
          data: {
            id: `bill_${Date.now()}_${lease.tenantId}_${Math.random().toString(36).substring(7)}`,
            tenantId: lease.tenantId,
            unitId: lease.unitId,
            month: monthStart,
            rentAmount: Number(lease.rentAmount),
            waterAmount: 0,
            garbageAmount: 0,
            totalAmount: Number(lease.rentAmount),
            status: "PENDING",
            dueDate,
          },
        });
        count++;
      } catch (err: any) {
        errors.push(`Lease ${lease.id}: ${err.message}`);
      }
    }
    console.log(`✅ [CRON] Generated ${count} monthly bills`);
  } catch (error: any) {
    console.error("❌ [CRON] Error generating monthly bills:", error);
    errors.push(`generateMonthlyBills: ${error.message}`);
  }
  return { count, errors };
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

async function processSubscriptionExpiry() {
  const errors: string[] = [];
  let expired = 0;
  let warnings = 0;

  try {
    const master = getMasterPrisma();
    const now = new Date();

    // 1. Expire trials that ended
    const expiredTrials = await master.companies.findMany({
      where: {
        subscriptionStatus: "TRIAL",
        trialEndsAt: { lt: now },
        isActive: true,
      },
      select: { id: true, name: true, email: true, slug: true },
    });

    for (const company of expiredTrials) {
      try {
        await master.companies.update({
          where: { id: company.id },
          data: { subscriptionStatus: "TRIAL_EXPIRED" },
        });
        await resend.emails.send({
          from: EMAIL_CONFIG.from,
          replyTo: EMAIL_CONFIG.replyTo,
          to: company.email,
          subject: `Your Makeja Homes trial has expired`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif;color:#fff;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;margin-bottom:24px;"><div style="display:inline-block;background:linear-gradient(135deg,#a855f7,#ec4899);border-radius:10px;padding:10px 18px;"><span style="color:#fff;font-size:18px;font-weight:700;">Makeja Homes</span></div></div>
  <div style="background:#111;border:1px solid rgba(239,68,68,0.4);border-radius:16px;padding:36px;text-align:center;">
    <div style="font-size:44px;margin-bottom:12px;">⏰</div>
    <h1 style="margin:0 0 10px;font-size:22px;color:#fca5a5;">Your Free Trial Has Ended</h1>
    <p style="color:#9ca3af;margin:0 0 24px;">Hi <strong style="color:#e5e7eb;">${company.name}</strong>, your 14-day free trial on Makeja Homes has expired.</p>
    <p style="color:#9ca3af;margin:0 0 28px;">Upgrade to keep managing your properties without interruption.</p>
    <a href="https://makejahomes.co.ke/onboarding" style="display:inline-block;background:linear-gradient(to right,#a855f7,#ec4899);color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:600;">Upgrade Now</a>
  </div>
  <p style="text-align:center;color:#4b5563;font-size:13px;margin-top:24px;">Questions? <a href="mailto:support@makejahomes.co.ke" style="color:#a855f7;">support@makejahomes.co.ke</a></p>
</div></body></html>`,
        });
        expired++;
      } catch (err: any) {
        errors.push(`Trial expiry notify ${company.id}: ${err.message}`);
      }
    }

    // 2. Send 3-day trial warning
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    in3Days.setHours(23, 59, 59, 999);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 3);
    tomorrow.setHours(0, 0, 0, 0);

    const expiringTrials = await master.companies.findMany({
      where: {
        subscriptionStatus: "TRIAL",
        trialEndsAt: { gte: tomorrow, lte: in3Days },
        isActive: true,
      },
      select: { id: true, name: true, email: true, slug: true, trialEndsAt: true },
    });

    for (const company of expiringTrials) {
      try {
        const daysLeft = Math.ceil(
          ((company.trialEndsAt?.getTime() ?? 0) - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        await resend.emails.send({
          from: EMAIL_CONFIG.from,
          replyTo: EMAIL_CONFIG.replyTo,
          to: company.email,
          subject: `⚠️ Your Makeja Homes trial expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif;color:#fff;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;margin-bottom:24px;"><div style="display:inline-block;background:linear-gradient(135deg,#a855f7,#ec4899);border-radius:10px;padding:10px 18px;"><span style="color:#fff;font-size:18px;font-weight:700;">Makeja Homes</span></div></div>
  <div style="background:#111;border:1px solid rgba(251,191,36,0.4);border-radius:16px;padding:36px;text-align:center;">
    <div style="font-size:44px;margin-bottom:12px;">⚠️</div>
    <h1 style="margin:0 0 10px;font-size:22px;color:#fde68a;">Trial Ending in ${daysLeft} Day${daysLeft === 1 ? "" : "s"}</h1>
    <p style="color:#9ca3af;margin:0 0 8px;">Hi <strong style="color:#e5e7eb;">${company.name}</strong>,</p>
    <p style="color:#9ca3af;margin:0 0 28px;">Your free trial expires on <strong style="color:#fbbf24;">${company.trialEndsAt?.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</strong>. Upgrade now to keep your data and avoid any interruption.</p>
    <a href="mailto:support@makejahomes.co.ke?subject=Upgrade%20Plan%20-%20${encodeURIComponent(company.name)}" style="display:inline-block;background:linear-gradient(to right,#a855f7,#ec4899);color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:600;">Upgrade Now</a>
  </div>
  <p style="text-align:center;color:#4b5563;font-size:13px;margin-top:24px;">Questions? <a href="mailto:support@makejahomes.co.ke" style="color:#a855f7;">support@makejahomes.co.ke</a></p>
</div></body></html>`,
        });
        warnings++;
      } catch (err: any) {
        errors.push(`Trial warning ${company.id}: ${err.message}`);
      }
    }

    console.log(`✅ [CRON] Subscription: ${expired} expired, ${warnings} warnings sent`);
  } catch (err: any) {
    console.error("❌ [CRON] processSubscriptionExpiry:", err?.message);
    errors.push(`Fatal: ${err.message}`);
  }

  return { expired, warnings, errors };
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
