import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  const h = headers()
  return NextResponse.json({
    'x-tenant-slug': h.get('x-tenant-slug'),
    'x-tenant-schema': h.get('x-tenant-schema'),
    'host': req.headers.get('host'),
    'x-forwarded-host': req.headers.get('x-forwarded-host'),
  })
}
