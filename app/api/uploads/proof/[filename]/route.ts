import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
}

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    // 1. Auth — must be a logged-in user
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.id as string
    const role = payload.role as string

    // 2. Sanitize filename — UUID.ext only, no path traversal
    const filename = params.filename
    if (!filename || !/^[0-9a-f-]{36}\.(jpg|png|pdf)$/i.test(filename)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const db = getPrismaForRequest(request)

    // 3. Ownership check:
    //    - TENANT: can only access their own payment proofs
    //    - ADMIN/MANAGER: can access any proof in their tenant schema
    //    - Others: denied
    // Match against both old path (/uploads/proof-of-payment/) and new (/api/uploads/proof/)
    const filePattern = `%${filename}%`

    if (role === "TENANT") {
      const rows = await db.$queryRawUnsafe<any[]>(`
        SELECT p.id FROM payments p
        JOIN tenants t ON t.id = p."tenantId"
        WHERE p."proofOfPaymentUrl" LIKE $1 AND t."userId" = $2
        LIMIT 1
      `, filePattern, userId)
      if (rows.length === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
    } else if (["ADMIN", "MANAGER"].includes(role)) {
      const rows = await db.$queryRawUnsafe<any[]>(`
        SELECT id FROM payments WHERE "proofOfPaymentUrl" LIKE $1 LIMIT 1
      `, filePattern)
      if (rows.length === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 4. Read file — check private/ first, fall back to legacy public/ location
    const privatePath = path.join(process.cwd(), "private", "uploads", "proof-of-payment", filename)
    const legacyPath  = path.join(process.cwd(), "public",  "uploads", "proof-of-payment", filename)
    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(privatePath)
    } catch {
      try {
        fileBuffer = await readFile(legacyPath)
      } catch {
        return NextResponse.json({ error: "File not found" }, { status: 404 })
      }
    }

    const ext = filename.split(".").pop()!.toLowerCase()
    const contentType = MIME[ext] ?? "application/octet-stream"

    return new NextResponse(fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Force download for PDFs; inline display for images
        "Content-Disposition": ext === "pdf"
          ? `attachment; filename="proof-of-payment.pdf"`
          : `inline; filename="proof-of-payment.${ext}"`,
        // Prevent caching of sensitive files
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error: any) {
    console.error("[upload-serve]", error?.message)
    return NextResponse.json({ error: "Failed to retrieve file" }, { status: 500 })
  }
}
