/**
 * GET /api/integrations/quickbooks/connect
 * Redirects admin to Intuit OAuth2 consent page.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromRequest } from '@/lib/auth-helpers'
import { getAuthUrl } from '@/lib/integrations/quickbooks'
import { resolveSchema } from '@/lib/get-prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'QUICKBOOKS_CLIENT_ID env var not set' }, { status: 500 })
  }

  const slug = resolveSchema(req).replace('tenant_', '')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://makejahomes.co.ke'
  const redirectUri = `${appUrl}/api/integrations/quickbooks/callback`

  // State encodes tenant slug so callback knows which tenant to store tokens for
  const state = Buffer.from(JSON.stringify({ slug, nonce: crypto.randomUUID() })).toString('base64url')

  const authUrl = getAuthUrl(clientId, redirectUri, state)
  return NextResponse.redirect(authUrl)
}
