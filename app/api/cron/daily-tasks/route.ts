import { NextRequest, NextResponse } from "next/server";
import { getMasterPrisma, buildTenantUrl } from "@/lib/get-prisma";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}
const SMTP_FROM = `"Makeja Homes" <${process.env.SMTP_USER}>`;

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

async function getAllTenantSlugs(): Promise<string[]> {
  const master = getMasterPrisma();
  const rows = await master.$queryRaw<{ schema_name: string }[]>`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
  `;
  return rows.map(r => r.schema_name.replace('tenant_', ''));
}

function getTenantPrisma(slug: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: buildTenantUrl(`tenant_${slug}`) } } });
}

export async function GET(request: NextRequest) {
  console.log("🤖 [CRON] Daily tasks started at", new Date().toISOString());

  if (!verifyCronSecret(request)) {
    console.log("❌ [CRON] Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {
    overdueBillsMarked: 0,
    monthlyBillsGenerated: 0,
    expiredLeases: 0,
    renewalReminders30: 0,
    renewalReminders60: 0,
    renewalReminders90: 0,
    errors: [] as string[],
  };

  try {
    const slugs = await getAllTenantSlugs();
    console.log(`🔍 [CRON] Processing ${slugs.length} tenants: ${slugs.join(', ')}`);

    for (const slug of slugs) {
      const prisma = getTenantPrisma(slug);
      try {
        // Mark overdue bills
        const overdueResult = await markOverdueBills(prisma, slug);
        results.overdueBillsMarked += overdueResult.count;
        results.errors.push(...overdueResult.errors);

        // Auto-generate monthly bills on the 1st of each month
        if (new Date().getDate() === 1) {
          const billsResult = await generateMonthlyBills(prisma, slug);
          results.monthlyBillsGenerated += billsResult.count;
          results.errors.push(...billsResult.errors);
        }

        const expiredResult = await autoExpireLeases(prisma, slug);
        results.expiredLeases += expiredResult.count;
        results.errors.push(...expiredResult.errors);

        const r90 = await sendRenewalReminders(prisma, slug, 90);
        results.renewalReminders90 += r90.count;
        results.errors.push(...r90.errors);

        const r60 = await sendRenewalReminders(prisma, slug, 60);
        results.renewalReminders60 += r60.count;
        results.errors.push(...r60.errors);

        const r30 = await sendRenewalReminders(prisma, slug, 30);
        results.renewalReminders30 += r30.count;
        results.errors.push(...r30.errors);
      } finally {
        await prisma.$disconnect();
      }
    }

    // Subscription expiry notifications (master DB — cross-tenant)
    const subResult = await processSubscriptionExpiry();
    results.trialExpiredNotified = subResult.expired;
    results.trialWarningsSent = subResult.warnings;
    results.errors.push(...subResult.errors);

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

async function markOverdueBills(prisma: PrismaClient, slug: string) {
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
    if (count > 0) console.log(`✅ [CRON][${slug}] Marked ${count} bills as OVERDUE`);
  } catch (error: any) {
    console.error(`❌ [CRON][${slug}] Error marking overdue bills:`, error);
    errors.push(`[${slug}] markOverdueBills: ${error.message}`);
  }
  return { count, errors };
}

async function generateMonthlyBills(prisma: PrismaClient, slug: string) {
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
        errors.push(`[${slug}] Lease ${lease.id}: ${err.message}`);
      }
    }
    if (count > 0) console.log(`✅ [CRON][${slug}] Generated ${count} monthly bills`);
  } catch (error: any) {
    console.error(`❌ [CRON][${slug}] Error generating monthly bills:`, error);
    errors.push(`[${slug}] generateMonthlyBills: ${error.message}`);
  }
  return { count, errors };
}

async function autoExpireLeases(prisma: PrismaClient, slug: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const errors: string[] = [];
  let count = 0;

  try {
    const expiredLeases = await prisma.lease_agreements.findMany({
      where: { status: "ACTIVE", endDate: { lt: today } },
      include: { units: true, tenants: { include: { users: true } } },
    });

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
      } catch (error: any) {
        errors.push(`[${slug}] Lease ${lease.id}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`[${slug}] autoExpireLeases fatal: ${error.message}`);
  }

  return { count, errors };
}

async function sendRenewalReminders(prisma: PrismaClient, slug: string, daysBeforeExpiry: number) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysBeforeExpiry);
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const errors: string[] = [];
  let count = 0;

  try {
    const expiringLeases = await prisma.lease_agreements.findMany({
      where: { status: "ACTIVE", endDate: { gte: targetDate, lt: nextDay } },
      include: {
        units: { include: { properties: true } },
        tenants: { include: { users: true } },
      },
    });

    for (const lease of expiringLeases) {
      try {
        await sendRenewalReminderEmail(lease, daysBeforeExpiry);
        count++;
      } catch (error: any) {
        errors.push(`[${slug}] Lease ${lease.id}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`[${slug}] sendRenewalReminders(${daysBeforeExpiry}d) fatal: ${error.message}`);
  }

  return { count, errors };
}

async function sendLeaseExpiryEmail(lease: any) {
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;background:#f4f4f4"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:30px;text-align:center"><h1 style="color:#fff;margin:0">🏠 Makeja Homes</h1><p style="color:#fee2e2;margin:10px 0 0">Lease Expiry Notice</p></div><div style="padding:40px 30px"><h2 style="color:#1f2937">Hello ${lease.tenants.users.firstName}!</h2><p style="color:#4b5563;line-height:1.6">Your lease for Unit ${lease.units.unitNumber} has expired as of ${new Date(lease.endDate).toLocaleDateString()}.</p><p style="color:#4b5563">Contact us at support@makejahomes.co.ke to discuss renewal options.</p></div></div></body></html>`;
  await createTransporter().sendMail({
    from: SMTP_FROM,
    to: lease.tenants.users.email,
    subject: `Lease Expired - ${lease.units.unitNumber}`,
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

    const expiredTrials = await master.companies.findMany({
      where: { subscriptionStatus: "TRIAL", trialEndsAt: { lt: now }, isActive: true },
      select: { id: true, name: true, email: true, slug: true },
    });

    for (const company of expiredTrials) {
      try {
        // Set to EXPIRED and deactivate — trial over, no payment received
        await master.companies.update({
          where: { id: company.id },
          data: { subscriptionStatus: "EXPIRED", isActive: false } as any,
        });
        await createTransporter().sendMail({
          from: SMTP_FROM,
          to: company.email,
          subject: `Your Makeja Homes trial has expired`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif;color:#fff;"><div style="max-width:560px;margin:0 auto;padding:40px 20px;"><div style="text-align:center;margin-bottom:24px;"><div style="display:inline-block;background:linear-gradient(135deg,#a855f7,#ec4899);border-radius:10px;padding:10px 18px;"><span style="color:#fff;font-size:18px;font-weight:700;">Makeja Homes</span></div></div><div style="background:#111;border:1px solid rgba(239,68,68,0.4);border-radius:16px;padding:36px;text-align:center;"><div style="font-size:44px;margin-bottom:12px;">⏰</div><h1 style="margin:0 0 10px;font-size:22px;color:#fca5a5;">Your Free Trial Has Ended</h1><p style="color:#9ca3af;margin:0 0 24px;">Hi <strong style="color:#e5e7eb;">${company.name}</strong>, your 14-day free trial on Makeja Homes has expired.</p><a href="https://makejahomes.co.ke/onboarding" style="display:inline-block;background:linear-gradient(to right,#a855f7,#ec4899);color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:600;">Upgrade Now</a></div></div></body></html>`,
        });
        expired++;
      } catch (err: any) {
        errors.push(`Trial expiry notify ${company.id}: ${err.message}`);
      }
    }

    // Enforce ACTIVE subscription expiry — subscriptionEndsAt has passed
    const expiredSubs = await master.companies.findMany({
      where: {
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: { lt: now },
        isActive: true,
      } as any,
      select: { id: true, name: true, email: true, slug: true },
    });

    for (const company of expiredSubs) {
      try {
        await (master.companies.update as any)({
          where: { id: company.id },
          data: { subscriptionStatus: "EXPIRED", isActive: false },
        });
        await createTransporter().sendMail({
          from: SMTP_FROM,
          to: company.email,
          subject: `Your Makeja Homes subscription has expired`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif;color:#fff;"><div style="max-width:560px;margin:0 auto;padding:40px 20px;"><div style="background:#111;border:1px solid rgba(239,68,68,0.4);border-radius:16px;padding:36px;text-align:center;"><div style="font-size:44px;margin-bottom:12px;">🔒</div><h1 style="margin:0 0 10px;font-size:22px;color:#fca5a5;">Subscription Expired</h1><p style="color:#9ca3af;margin:0 0 24px;">Hi <strong style="color:#e5e7eb;">${company.name}</strong>, your Makeja Homes subscription has expired and your account has been suspended.</p><a href="mailto:support@makejahomes.co.ke" style="display:inline-block;background:linear-gradient(to right,#a855f7,#ec4899);color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:600;">Contact Support to Renew</a></div></div></body></html>`,
        }).catch(() => {});
        expired++;
      } catch (err: any) {
        errors.push(`Sub expiry enforce ${company.id}: ${err.message}`);
      }
    }

    // Send 3-day warning for ACTIVE subscriptions expiring soon
    const subIn3Days = new Date(now);
    subIn3Days.setDate(subIn3Days.getDate() + 3);
    subIn3Days.setHours(23, 59, 59, 999);

    const expiringActiveSubs = await master.companies.findMany({
      where: {
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: { gte: now, lte: subIn3Days },
        isActive: true,
      } as any,
      select: { id: true, name: true, email: true, subscriptionEndsAt: true, subscriptionTier: true },
    });

    for (const company of expiringActiveSubs) {
      try {
        const daysLeft = Math.ceil(((company as any).subscriptionEndsAt?.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        await createTransporter().sendMail({
          from: SMTP_FROM,
          to: company.email,
          subject: `Action required: Makeja Homes subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif;color:#fff;"><div style="max-width:560px;margin:0 auto;padding:40px 20px;"><div style="background:#111;border:1px solid rgba(251,191,36,0.4);border-radius:16px;padding:36px;text-align:center;"><h1 style="color:#fde68a;">Subscription Expiring Soon</h1><p style="color:#9ca3af;">Hi <strong style="color:#e5e7eb;">${company.name}</strong>, your ${(company as any).subscriptionTier} plan expires in <strong style="color:#fbbf24;">${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>. Contact us to renew and avoid service interruption.</p><a href="mailto:support@makejahomes.co.ke" style="display:inline-block;background:linear-gradient(to right,#a855f7,#ec4899);color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:600;">Renew Now</a></div></div></body></html>`,
        }).catch(() => {});
        warnings++;
      } catch (err: any) {
        errors.push(`Sub warning ${company.id}: ${err.message}`);
      }
    }

    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    in3Days.setHours(23, 59, 59, 999);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 3);
    tomorrow.setHours(0, 0, 0, 0);

    const expiringTrials = await master.companies.findMany({
      where: { subscriptionStatus: "TRIAL", trialEndsAt: { gte: tomorrow, lte: in3Days }, isActive: true },
      select: { id: true, name: true, email: true, slug: true, trialEndsAt: true },
    });

    for (const company of expiringTrials) {
      try {
        const daysLeft = Math.ceil(((company.trialEndsAt?.getTime() ?? 0) - now.getTime()) / (1000 * 60 * 60 * 24));
        await createTransporter().sendMail({
          from: SMTP_FROM,
          to: company.email,
          subject: `Your Makeja Homes trial expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif;color:#fff;"><div style="max-width:560px;margin:0 auto;padding:40px 20px;"><div style="background:#111;border:1px solid rgba(251,191,36,0.4);border-radius:16px;padding:36px;text-align:center;"><h1 style="color:#fde68a;">Trial Ending in ${daysLeft} Day${daysLeft === 1 ? "" : "s"}</h1><p style="color:#9ca3af;">Hi <strong style="color:#e5e7eb;">${company.name}</strong>, your trial expires on <strong style="color:#fbbf24;">${company.trialEndsAt?.toLocaleDateString("en-KE")}</strong>.</p><a href="mailto:support@makejahomes.co.ke" style="display:inline-block;background:linear-gradient(to right,#a855f7,#ec4899);color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:600;">Upgrade Now</a></div></div></body></html>`,
        });
        warnings++;
      } catch (err: any) {
        errors.push(`Trial warning ${company.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    errors.push(`processSubscriptionExpiry fatal: ${err.message}`);
  }

  return { expired, warnings, errors };
}

async function sendRenewalReminderEmail(lease: any, daysRemaining: number) {
  const urgencyColor = daysRemaining === 30 ? "#ef4444" : daysRemaining === 60 ? "#f59e0b" : "#3b82f6";
  const urgencyText = daysRemaining === 30 ? "URGENT" : daysRemaining === 60 ? "Important" : "Reminder";
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;background:#f4f4f4"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:${urgencyColor};padding:30px;text-align:center"><h1 style="color:#fff;margin:0">🏠 Makeja Homes</h1><p style="color:rgba(255,255,255,0.9);margin:10px 0 0">${urgencyText}: Lease Renewal Reminder</p></div><div style="padding:40px 30px"><h2 style="color:#1f2937">Hello ${lease.tenants.users.firstName}!</h2><p style="color:#4b5563;line-height:1.6">Your lease expires in <strong style="color:${urgencyColor}">${daysRemaining} days</strong>.</p><div style="background:#f3f4f6;border-radius:8px;padding:20px;margin:20px 0"><p style="margin:5px 0"><strong>Property:</strong> ${lease.units.properties.name}</p><p style="margin:5px 0"><strong>Unit:</strong> ${lease.units.unitNumber}</p><p style="margin:5px 0"><strong>Rent:</strong> KSH ${lease.rentAmount.toLocaleString()}/month</p><p style="margin:5px 0"><strong>Expires:</strong> ${new Date(lease.endDate).toLocaleDateString()}</p></div><p style="color:#4b5563">Contact support@makejahomes.co.ke to renew!</p></div></div></body></html>`;
  await createTransporter().sendMail({
    from: SMTP_FROM,
    to: lease.tenants.users.email,
    subject: `${urgencyText}: Lease Expires in ${daysRemaining} Days - ${lease.units.unitNumber}`,
    html,
  });
}
