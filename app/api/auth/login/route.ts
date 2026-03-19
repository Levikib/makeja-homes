import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
);

function getSchemaFromRequest(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const parts = host.split('.')
  if (parts.length >= 4) {
    const sub = parts[0].toLowerCase()
    const reserved = new Set(['www', 'app', 'api'])
    if (!reserved.has(sub) && /^[a-z0-9-]+$/.test(sub)) return `tenant_${sub}`
  }
  return 'public'
}

function buildDirectUrl(schemaName: string): string {
  // MUST use direct (non-pooler) connection for search_path
  // Neon pooler rejects search_path parameter
  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || ''
  // Strip pooler from URL if present
  const direct = url
    .replace('ep-flat-heart-absp4pdu-pooler.', 'ep-flat-heart-absp4pdu.')
    .replace('-pooler.eu-west', '.eu-west')
  const sep = direct.includes('?') ? '&' : '?'
  return `${direct}${sep}options=--search_path%3D${schemaName}`
}

export async function POST(request: NextRequest) {
  const schemaName = getSchemaFromRequest(request)
  const dbUrl = buildDirectUrl(schemaName)
  
  let prisma: PrismaClient | null = null

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Create client with explicit schema
    prisma = new PrismaClient({ 
      datasources: { db: { url: dbUrl } },
      log: ['error'],
    })

    // Test connection first
    await prisma.$queryRaw`SELECT current_schema()`

    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is inactive." }, { status: 403 });
    }

    await prisma.users.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = await new SignJWT({
      id: user.id, email: user.email, role: user.role,
      companyId: user.companyId, firstName: user.firstName, lastName: user.lastName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    });

    response.cookies.set("token", token, {
      httpOnly: true, secure: true, sameSite: "lax",
      domain: ".makejahomes.co.ke", maxAge: 86400,
    });

    return response;

  } catch (error: any) {
    console.error("LOGIN ERROR:", error?.message)
    console.error("Schema attempted:", schemaName)
    console.error("URL prefix:", dbUrl.substring(0, 80))
    return NextResponse.json(
      { error: "Login failed", detail: error?.message, schema: schemaName },
      { status: 500 }
    );
  } finally {
    await prisma?.$disconnect()
  }
}
