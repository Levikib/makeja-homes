import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Debug endpoint — disabled in production for security
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ status: 'ok', env: 'development' })
}

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ status: 'ok', env: 'development' })
}
