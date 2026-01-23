import { prisma } from "@/lib/prisma";

/**
 * Background job to mark bills as OVERDUE if past due date
 * Should run daily via cron
 */
export async function markOverdueBills() {
  try {
    const now = new Date();
    
    // Find all pending bills past their due date
    const overdueBills = await prisma.monthly_bills.updateMany({
      where: {
        status: "PENDING",
        dueDate: {
          lt: now
        }
      },
      data: {
        status: "OVERDUE"
      }
    });

    console.log(`✅ Marked ${overdueBills.count} bills as OVERDUE`);
    return overdueBills.count;
  } catch (error) {
    console.error("❌ Error marking overdue bills:", error);
    throw error;
  }
}
