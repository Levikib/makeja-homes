import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    const role = payload.role as string;

    if (role !== "TENANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log("📤 Uploading proof of payment for user:", userId);

    // Get form data
    const formData = await request.formData();
    const paymentId = formData.get("paymentId") as string;
    const notes = formData.get("notes") as string;
    const file = formData.get("file") as File;

    if (!paymentId || !file) {
      return NextResponse.json(
        { error: "Payment ID and file are required" },
        { status: 400 }
      );
    }

    // Verify payment belongs to this tenant
    const payment = await prisma.payments.findFirst({
      where: {
        id: paymentId,
        tenants: {
          userId: userId,
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and PDF are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "proof-of-payment");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const fileName = `${timestamp}_${originalName}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/proof-of-payment/${fileName}`;

    console.log("✅ File uploaded:", fileUrl);

    // Update payment with proof
    const updatedPayment = await prisma.payments.update({
      where: { id: paymentId },
      data: {
        proofOfPaymentUrl: fileUrl,
        proofOfPaymentNotes: notes || null,
        proofUploadedAt: new Date(),
        verificationStatus: "PENDING",
        status: "AWAITING_VERIFICATION",
        updatedAt: new Date(),
      },
    });

    console.log("✅ Payment updated with proof of payment");

    return NextResponse.json({
      success: true,
      message: "Proof of payment uploaded successfully",
      payment: updatedPayment,
      fileUrl,
    });
  } catch (error: any) {
    console.error("❌ Error uploading proof of payment:", error);
    return NextResponse.json(
      { error: "Failed to upload proof of payment" },
      { status: 500 }
    );
  }
}
