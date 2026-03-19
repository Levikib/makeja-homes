import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
);

// Get tenant-scoped Prisma client directly from request
function getTenantPrismaFromRequest(req: NextRequest): PrismaClient {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const parts = host.split('.')
  
  let schemaName = 'public'
  if (parts.length >= 4) {
    const reserved = new Set(['www', 'app', 'api', 'docs'])
    const sub = parts[0].toLowerCase()
    if (!reserved.has(sub) && /^[a-z0-9-]+$/.test(sub)) {
      schemaName = `tenant_${sub}`
    }
  }

  const baseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || ''
  const sep = baseUrl.includes('?') ? '&' : '?'
  const url = `${baseUrl}${sep}options=--search_path%3D${schemaName}`

  return new PrismaClient({ datasources: { db: { url } } })
}

export async function POST(request: NextRequest) {
  const prisma = getTenantPrismaFromRequest(request)

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive. Please contact administrator." },
        { status: 403 }
      );
    }

    if (user.mustChangePassword) {
      const token = await new SignJWT({
        id: user.id, email: user.email, role: user.role,
        companyId: user.companyId, firstName: user.firstName, lastName: user.lastName,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(JWT_SECRET);

      const response = NextResponse.json({
        mustChangePassword: true, userId: user.id, message: "Password change required"
      });
      response.cookies.set("token", token, {
        httpOnly: true, secure: true, sameSite: "lax",
        domain: ".makejahomes.co.ke", maxAge: 3600,
      });
      return response;
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

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
      user: {
        id: user.id, email: user.email,
        firstName: user.firstName, lastName: user.lastName, role: user.role,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true, secure: true, sameSite: "lax",
      domain: ".makejahomes.co.ke", maxAge: 86400,
    });

    return response;

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect()
  }
}
