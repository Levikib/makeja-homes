import { getPrismaForRequest } from "@/lib/get-prisma";
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

function getSchemaFromRequest(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const parts = host.split('.')
  if (parts.length >= 4) {
    const sub = parts[0].toLowerCase()
    if (!['www','app','api'].includes(sub) && /^[a-z0-9-]+$/.test(sub)) return `tenant_${sub}`
  }
  return 'public'
}

function buildTenantUrl(schemaName: string): string {
  const base = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || ''
  const clean = base.replace(/[?&]schema=[^&]*/g, '')
  const sep = clean.includes('?') ? '&' : '?'
  return `${clean}${sep}schema=${schemaName}`
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const schemaName = getSchemaFromRequest(req)
  const dbUrl = buildTenantUrl(schemaName)

  const result: any = {
    host: req.headers.get('x-forwarded-host') || req.headers.get('host'),
    schemaName,
    urlSample: dbUrl.substring(0, 80) + '...',
  }

  try {
    const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })
    const user = await prisma.users.findUnique({ where: { email: email.toLowerCase() } })
    result.userFound = !!user
    result.userEmail = user?.email || null
    result.userActive = user?.isActive || null
    if (user && password) {
      result.passwordMatch = await bcrypt.compare(password, user.password)
    }
    await prisma.$disconnect()
  } catch (err: any) {
    result.dbError = err.message
  }

  return NextResponse.json(result)
}

export async function GET(req: NextRequest) {
  const schemaName = getSchemaFromRequest(req)
  return NextResponse.json({
    host: req.headers.get('x-forwarded-host') || req.headers.get('host'),
    'x-tenant-slug': req.headers.get('x-tenant-slug'),
    schemaName,
    DIRECT_URL_SET: !!process.env.DIRECT_DATABASE_URL,
  })
}
