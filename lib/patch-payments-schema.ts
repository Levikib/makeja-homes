/**
 * Patches the payments table on older schemas that were created before the
 * column rename (type→paymentType, method→paymentMethod, reference→referenceNumber, etc).
 * Safe to call on every request — all statements are ADD COLUMN IF NOT EXISTS.
 */
export async function patchPaymentsSchema(db: any) {
  const patches = [
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS "paymentType"     TEXT NOT NULL DEFAULT 'RENT'`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS "paymentMethod"   TEXT NOT NULL DEFAULT 'CASH'`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS "paystackReference" TEXT`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS "paystackStatus"    TEXT`,
  ];
  for (const sql of patches) {
    try { await db.$executeRawUnsafe(sql) } catch { /* column already exists */ }
  }
}
