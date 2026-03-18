// ═══════════════════════════════════════════════════════════
// lib/db/prisma-master.ts
//
// The master database client.
// Queries the PUBLIC schema — organizations, subscriptions, plans.
// Never used for tenant data.
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/master-client'

declare global {
  var __masterPrisma: PrismaClient | undefined
}

// Singleton pattern — prevents hot-reload from creating multiple connections
export const masterPrisma: PrismaClient =
  global.__masterPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.__masterPrisma = masterPrisma
}

export default masterPrisma
