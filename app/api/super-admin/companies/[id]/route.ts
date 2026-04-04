import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getMasterPrisma, buildTenantUrl } from '@/lib/get-prisma'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

function getSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-min-32-characters-long!!'
  )
}

async function verifySuperAdmin(req: NextRequest): Promise<boolean> {
  const headerSecret = req.headers.get('x-super-admin-secret')
  if (
    headerSecret &&
    (headerSecret === process.env.SUPER_ADMIN_PASSWORD ||
      headerSecret === process.env.SUPER_ADMIN_SECRET)
  ) {
    return true
  }
  const token = req.cookies.get('super_admin_token')?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload.role === 'super_admin'
  } catch {
    return false
  }
}

function getTenantPrisma(slug: string): PrismaClient {
  const url = buildTenantUrl(`tenant_${slug}`)
  return new PrismaClient({ datasources: { db: { url } } })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifySuperAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const prisma = getMasterPrisma()

  try {
    const company = await prisma.companies.findUnique({
      where: { id: params.id },
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            createdAt: true,
            lastLoginAt: true,
          },
          take: 1,
        },
        properties: {
          select: { id: true, name: true, city: true },
          where: { deletedAt: null },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Try to get usage stats from the tenant schema
    let usageStats = {
      propertiesCount: company.properties.length,
      unitsCount: 0,
      usersCount: 0,
      tenantsCount: 0,
    }

    const slug = (company as any).subdomain ?? company.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (slug) {
      let tenantPrisma: PrismaClient | null = null
      try {
        tenantPrisma = getTenantPrisma(slug)
        const [units, users, tenants] = await Promise.all([
          tenantPrisma.units.count({ where: { deletedAt: null } }),
          tenantPrisma.users.count({ where: { isActive: true } }),
          tenantPrisma.tenants.count(),
        ])
        usageStats = {
          propertiesCount: company.properties.length,
          unitsCount: units,
          usersCount: users,
          tenantsCount: tenants,
        }
      } catch (tenantErr) {
        // Tenant schema may not exist yet — silently ignore
        console.warn(`Could not query tenant schema for ${slug}:`, tenantErr)
      } finally {
        if (tenantPrisma) await tenantPrisma.$disconnect()
      }
    }

    return NextResponse.json({
      company: {
        ...company,
        subdomain: (company as any).subdomain ?? (company as any).slug ?? null,
        subscriptionStatus: (company as any).subscriptionStatus ?? null,
        subscriptionTier: (company as any).subscriptionTier ?? null,
        trialEndsAt: (company as any).trialEndsAt ?? null,
        subscriptionEndsAt: (company as any).subscriptionEndsAt ?? null,
        billedAmount: (company as any).billedAmount ?? null,
        unitLimit: (company as any).unitLimit ?? null,
        adminUser: company.users[0] ?? null,
      },
      usageStats,
    })
  } catch (err: any) {
    console.error('Super admin company GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifySuperAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const prisma = getMasterPrisma()

  try {
    const body = await req.json()

    // Only allow updating known subscription/status fields
    const allowedFields = [
      'subscriptionTier',
      'subscriptionStatus',
      'trialEndsAt',
      'subscriptionEndsAt',
      'billedAmount',
      'unitLimit',
      'isActive',
      'subdomain',
    ]

    const updateData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await prisma.companies.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ success: true, company: updated })
  } catch (err: any) {
    console.error('Super admin company PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifySuperAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const prisma = getMasterPrisma()

  try {
    // Soft delete — set isActive = false
    // Also attempt to set deletedAt (field may not exist yet — handled gracefully)
    try {
      await prisma.companies.update({
        where: { id: params.id },
        data: { isActive: false, deletedAt: new Date() } as any,
      })
    } catch {
      // deletedAt may not exist yet in schema — fall back to isActive only
      await prisma.companies.update({
        where: { id: params.id },
        data: { isActive: false },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Super admin company DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
