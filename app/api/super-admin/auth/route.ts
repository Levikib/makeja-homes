import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'

function getSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-min-32-characters-long!!'
  )
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    const expected = process.env.SUPER_ADMIN_PASSWORD
    if (!expected) {
      return NextResponse.json(
        { error: 'Super admin not configured' },
        { status: 500 }
      )
    }

    if (!password || password !== expected) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = await new SignJWT({ role: 'super_admin', sub: 'super_admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(getSecret())

    const response = NextResponse.json({ success: true })

    response.cookies.set('super_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 12, // 12 hours
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Super admin auth error:', err)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('super_admin_token')?.value
    if (!token) {
      return NextResponse.json({ authenticated: false })
    }

    await jwtVerify(token, getSecret())
    return NextResponse.json({ authenticated: true })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}

export async function DELETE(_req: NextRequest) {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('super_admin_token')
  return response
}
