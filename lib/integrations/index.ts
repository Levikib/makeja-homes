/**
 * Makeja Homes — Integrations Hub
 *
 * Self-heal table: tenant_integrations
 * Stores per-tenant integration configs (encrypted tokens, settings).
 *
 * Supported integrations:
 *   - whatsapp   (Twilio WhatsApp Business API)
 *   - quickbooks (Intuit QuickBooks Online)
 *   - listings   (property portal auto-push: Jumia House, BuyRentKenya, PropertyPro)
 */

import { buildTenantUrl } from '@/lib/get-prisma'
import { PrismaClient } from '@prisma/client'

function getPrismaClient(slug: string) {
  return new PrismaClient({ datasources: { db: { url: buildTenantUrl(`tenant_${slug}`) } } })
}

export type IntegrationKey = 'whatsapp' | 'quickbooks' | 'listings'

export interface IntegrationConfig {
  id: string
  key: IntegrationKey
  enabled: boolean
  settings: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const SELF_HEAL = `
  CREATE TABLE IF NOT EXISTS integrations (
    id          TEXT PRIMARY KEY,
    key         TEXT NOT NULL UNIQUE,
    enabled     BOOLEAN NOT NULL DEFAULT false,
    settings    JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`

export async function getIntegration(slug: string, key: IntegrationKey): Promise<IntegrationConfig | null> {
  const db = getPrismaClient(slug)
  try {
    await db.$executeRawUnsafe(SELF_HEAL)
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM integrations WHERE key = $1 LIMIT 1`, key
    )
    if (!rows[0]) return null
    return { ...rows[0], settings: rows[0].settings ?? {} }
  } finally {
    await db.$disconnect()
  }
}

export async function getAllIntegrations(slug: string): Promise<IntegrationConfig[]> {
  const db = getPrismaClient(slug)
  try {
    await db.$executeRawUnsafe(SELF_HEAL)
    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM integrations ORDER BY key`)
    return rows.map(r => ({ ...r, settings: r.settings ?? {} }))
  } finally {
    await db.$disconnect()
  }
}

export async function upsertIntegration(
  slug: string,
  key: IntegrationKey,
  enabled: boolean,
  settings: Record<string, any>
): Promise<void> {
  const db = getPrismaClient(slug)
  try {
    await db.$executeRawUnsafe(SELF_HEAL)
    const id = `intg_${key}_${Date.now()}`
    await db.$executeRawUnsafe(
      `INSERT INTO integrations (id, key, enabled, settings)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (key) DO UPDATE
         SET enabled = EXCLUDED.enabled,
             settings = EXCLUDED.settings,
             "updatedAt" = NOW()`,
      id, key, enabled, JSON.stringify(settings)
    )
  } finally {
    await db.$disconnect()
  }
}

export async function toggleIntegration(slug: string, key: IntegrationKey, enabled: boolean): Promise<void> {
  const db = getPrismaClient(slug)
  try {
    await db.$executeRawUnsafe(SELF_HEAL)
    await db.$executeRawUnsafe(
      `UPDATE integrations SET enabled = $1, "updatedAt" = NOW() WHERE key = $2`,
      enabled, key
    )
  } finally {
    await db.$disconnect()
  }
}
