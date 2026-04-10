import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const paymentId = formData.get("paymentId") as string;
    const notes = formData.get("notes") as string;
    const file = formData.get("file") as File;

    if (!paymentId || !file) {
      return NextResponse.json({ error: "Payment ID and file are required" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Verify payment belongs to this tenant
    const paymentRows = await db.$queryRawUnsafe<any[]>(`
      SELECT p.id FROM payments p
      JOIN tenants t ON t.id = p."tenantId"
      WHERE p.id = $1 AND t."userId" = $2
      LIMIT 1
    `, paymentId, userId);

    if (paymentRows.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPG, PNG, and PDF are allowed" }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    // Save file
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "proof-of-payment");
    await mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const fileName = `${timestamp}_${originalName}`;
    const filePath = path.join(uploadsDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/proof-of-payment/${fileName}`;
    const now = new Date();

    await db.$executeRawUnsafe(`
      UPDATE payments
      SET "proofOfPaymentUrl" = $1, "proofOfPaymentNotes" = $2, "proofUploadedAt" = $3,
          "verificationStatus" = 'PENDING'::"VerificationStatus",
          status = 'AWAITING_VERIFICATION'::"PaymentStatus", "updatedAt" = $3
      WHERE id = $4
    `, fileUrl, notes || null, now, paymentId);

    return NextResponse.json({
      success: true,
      message: "Proof of payment uploaded successfully",
      payment: { id: paymentId, proofOfPaymentUrl: fileUrl, verificationStatus: "PENDING", status: "AWAITING_VERIFICATION" },
      fileUrl,
    });
  } catch (error: any) {
    console.error("❌ Error uploading proof of payment:", error);
    return NextResponse.json({ error: "Failed to upload proof of payment" }, { status: 500 });
  }
}
