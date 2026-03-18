import { PrismaClient } from '@prisma/client'

declare global {
  var __masterPrisma: PrismaClient | undefined
}

export const masterPrisma: PrismaClient =
  global.__masterPrisma ??
  new PrismaClient({
    datasources: {
      db: { url: process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL }
    },
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.__masterPrisma = masterPrisma
}

export default masterPrisma
