import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

// Magic bytes for allowed file types
const MAGIC = {
  jpg:  [0xFF, 0xD8, 0xFF],
  png:  [0x89, 0x50, 0x4E, 0x47],
  pdf:  [0x25, 0x50, 0x44, 0x46],
} as const

function detectFiletype(buf: Buffer): "jpg" | "png" | "pdf" | null {
  if (MAGIC.pdf.every((b, i) => buf[i] === b)) return "pdf"
  if (MAGIC.png.every((b, i) => buf[i] === b)) return "png"
  if (MAGIC.jpg.every((b, i) => buf[i] === b)) return "jpg"
  return null
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const paymentId = formData.get("paymentId");
    const notes = formData.get("notes");
    const file = formData.get("file");

    if (!paymentId || typeof paymentId !== 'string' || !file || !(file instanceof File)) {
      return NextResponse.json({ error: "Payment ID and file are required" }, { status: 400 });
    }

    // Validate file size (5MB max) before reading bytes
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate actual file content via magic bytes — not client-supplied MIME
    const detectedType = detectFiletype(buffer);
    if (!detectedType) {
      return NextResponse.json({ error: "Invalid file. Only JPG, PNG, and PDF are allowed" }, { status: 400 });
    }

    const extMap = { jpg: "jpg", png: "png", pdf: "pdf" } as const
    const ext = extMap[detectedType]

    const db = getPrismaForRequest(request);

    // Verify payment belongs to this tenant (ownership check)
    const paymentRows = await db.$queryRawUnsafe<any[]>(`
      SELECT p.id FROM payments p
      JOIN tenants t ON t.id = p."tenantId"
      WHERE p.id = $1 AND t."userId" = $2
      LIMIT 1
    `, paymentId, userId);

    if (paymentRows.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Generate UUID filename — never expose original filename on disk.
    // Store OUTSIDE /public so files are never directly accessible via URL.
    // Files are served through /api/uploads/proof/[filename] which verifies JWT + ownership.
    const safeFileName = `${crypto.randomUUID()}.${ext}`;
    const uploadsDir = path.join(process.cwd(), "private", "uploads", "proof-of-payment");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, safeFileName);
    await writeFile(filePath, buffer);

    // Store just the filename — the serving route reconstructs the full path
    const fileUrl = `/api/uploads/proof/${safeFileName}`;
    const now = new Date();

    await db.$executeRawUnsafe(`
      UPDATE payments
      SET "proofOfPaymentUrl" = $1, "proofOfPaymentNotes" = $2, "proofUploadedAt" = $3,
          "verificationStatus" = 'PENDING'::"VerificationStatus",
          status = 'AWAITING_VERIFICATION'::"PaymentStatus", "updatedAt" = $3
      WHERE id = $4
    `, fileUrl, typeof notes === 'string' ? notes.slice(0, 500) : null, now, paymentId);

    return NextResponse.json({
      success: true,
      message: "Proof of payment uploaded successfully",
      payment: { id: paymentId, proofOfPaymentUrl: fileUrl, verificationStatus: "PENDING", status: "AWAITING_VERIFICATION" },
      fileUrl,
    });
  } catch (error: any) {
    console.error("❌ Error uploading proof of payment:", error?.message);
    return NextResponse.json({ error: "Failed to upload proof of payment" }, { status: 500 });
  }
}
