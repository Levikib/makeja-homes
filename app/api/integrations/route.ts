/**
 * GET  /api/integrations  — list all integration configs for this tenant
 * PUT  /api/integrations  — upsert an integration config
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromRequest } from '@/lib/auth-helpers'
import { getAllIntegrations, upsertIntegration, toggleIntegration, type IntegrationKey } from '@/lib/integrations'
import { resolveSchema } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

function getSlug(req: NextRequest): string {
  return resolveSchema(req).replace('tenant_', '')
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const slug = getSlug(req)
  const integrations = await getAllIntegrations(slug)
  return NextResponse.json({ integrations })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { key, enabled, settings } = await req.json()
  const validKeys: IntegrationKey[] = ['whatsapp', 'quickbooks', 'listings']
  if (!validKeys.includes(key)) {
    return NextResponse.json({ error: 'Invalid integration key' }, { status: 400 })
  }

  const slug = getSlug(req)
  await upsertIntegration(slug, key, enabled ?? false, settings ?? {})
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { key, enabled } = await req.json()
  const slug = getSlug(req)
  await toggleIntegration(slug, key, enabled)
  return NextResponse.json({ success: true })
}
