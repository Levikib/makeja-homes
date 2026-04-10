/**
 * Shared activity logging helper.
 * Non-fatal — never throws, never breaks the caller.
 * Uses raw SQL so it works on any tenant schema via getPrismaForRequest.
 */

type PrismaLike = {
  $executeRawUnsafe: (query: string, ...args: any[]) => Promise<any>;
};

export async function logActivity(
  db: PrismaLike,
  opts: {
    userId: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: Record<string, any>;
  }
): Promise<void> {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    await db.$executeRawUnsafe(
      `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
       ON CONFLICT (id) DO NOTHING`,
      id,
      opts.userId ?? null,
      opts.action,
      opts.entityType ?? null,
      opts.entityId ?? null,
      JSON.stringify(opts.details ?? {})
    );
  } catch {
    // non-fatal — never interrupt the caller
  }
}
