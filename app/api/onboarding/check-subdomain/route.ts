import { NextRequest, NextResponse } from 'next/server'
import { getMasterPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const RESERVED_SLUGS = [
  'www', 'app', 'api', 'docs', 'status', 'mail',
  'admin', 'demo', 'test', 'staging',
]

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{3}$/

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json(
      { available: false, message: 'Subdomain is required.' },
      { status: 400 }
    )
  }

  // Validate format: lowercase alphanumeric + hyphens, 3-30 chars
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

  // Check reserved list
  if (RESERVED_SLUGS.includes(slug)) {
    return NextResponse.json({
      available: false,
      message: `"${slug}" is a reserved subdomain and cannot be used.`,
    })
  }

  try {
    const masterPrisma = getMasterPrisma()
    const existing = await masterPrisma.companies.findFirst({
      where: { slug: slug },
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
      message: `${slug}.makejahomes.co.ke is available!`,
    })
  } catch (error) {
    console.error('[CHECK-SUBDOMAIN] Error:', error)
    return NextResponse.json(
      { available: false, message: 'Could not check availability. Please try again.' },
      { status: 500 }
    )
  }
}
