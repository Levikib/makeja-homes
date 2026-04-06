/**
 * GET /api/onboarding/check-slug?slug=xxx
 *
 * Checks whether a given subdomain slug is available for registration.
 * Returns { available: boolean, message: string }
 *
 * This route mirrors /api/onboarding/check-subdomain and exists as an
 * alternate endpoint name for the onboarding wizard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMasterPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'docs', 'status',
  'mail', 'makeja', 'billing', 'demo', 'test', 'staging', 'smtp',
])

// Valid: lowercase alphanum + hyphens, 3-30 chars, no leading/trailing hyphen
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{3}$/

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')?.toLowerCase().trim()

  if (!slug) {
    return NextResponse.json(
      { available: false, message: 'Subdomain is required.' },
      { status: 400 }
    )
  }

  if (slug.length < 3 || slug.length > 30) {
    return NextResponse.json({
      available: false,
      message: 'Subdomain must be between 3 and 30 characters.',
    })
  }

  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json({
      available: false,
      message: 'Only lowercase letters, numbers, and hyphens are allowed. Cannot start or end with a hyphen.',
    })
  }

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({
      available: false,
      message: `"${slug}" is a reserved subdomain and cannot be used.`,
    })
  }

  try {
    const prisma = getMasterPrisma()
    const existing = await prisma.companies.findFirst({
      where: { slug },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({
        available: false,
        message: 'This subdomain is already taken. Please choose another.',
      })
    }

    return NextResponse.json({
      available: true,
      message: `"${slug}" is available!`,
    })
  } catch (error) {
    console.error('[CHECK-SLUG] Error:', error)
    return NextResponse.json(
      { available: false, message: 'Could not check availability. Please try again.' },
      { status: 500 }
    )
  }
}
