import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTenantSlugFromHost } from '@/lib/get-tenant-slug'

export async function GET(req: NextRequest) {
  const h = headers()
  const slug = getTenantSlugFromHost()
  return NextResponse.json({
    'resolved-slug': slug,
    'resolved-schema': slug ? `tenant_${slug}` : 'public',
    'x-tenant-slug-header': h.get('x-tenant-slug'),
    'host': h.get('host'),
    'x-forwarded-host': h.get('x-forwarded-host'),
  })
}
