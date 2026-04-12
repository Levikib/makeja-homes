/**
 * GET /api/integrations/quickbooks/callback
 * Intuit redirects here after OAuth consent.
 * Exchanges code for tokens and stores them.
 */
import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/integrations/quickbooks'
import { upsertIntegration } from '@/lib/integrations'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const realmId = searchParams.get('realmId')
  const stateRaw = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://makejahomes.co.ke'

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard/admin/integrations?qbo=error&reason=${encodeURIComponent(error)}`)
  }

  if (!code || !realmId || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/dashboard/admin/integrations?qbo=error&reason=missing_params`)
  }

  let slug: string
  try {
    const state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString())
    slug = state.slug
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/admin/integrations?qbo=error&reason=invalid_state`)
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID!
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/integrations/quickbooks/callback`

  try {
    const tokens = await exchangeCodeForTokens(clientId, clientSecret, code, redirectUri)
    const now = Date.now()

    await upsertIntegration(slug, 'quickbooks', true, {
      clientId,
      clientSecret,
      realmId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: now + tokens.expiresIn * 1000,
      refreshExpiresAt: now + tokens.refreshExpiresIn * 1000,
      environment: process.env.QUICKBOOKS_ENV === 'production' ? 'production' : 'sandbox',
      connectedAt: new Date().toISOString(),
    })

    return NextResponse.redirect(`${appUrl}/dashboard/admin/integrations?qbo=connected`)
  } catch (err: any) {
    console.error('[QBO callback]', err.message)
    return NextResponse.redirect(`${appUrl}/dashboard/admin/integrations?qbo=error&reason=token_exchange`)
  }
}
