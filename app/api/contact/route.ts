import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { sendContactFormNotification, sendContactFormAutoReply } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);
    const id = crypto.randomUUID();
    const now = new Date();

    await db.$executeRawUnsafe(`
      INSERT INTO contact_messages (id, name, email, phone, message, status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, 'NEW', $6, $6)
    `, id, name, email, phone || null, message, now);

    try {
      await sendContactFormNotification(name, email, phone, message);
    } catch (emailError) {
      console.error("❌ Failed to send notification email:", emailError);
    }

    try {
      await sendContactFormAutoReply(name, email);
    } catch (emailError) {
      console.error("❌ Failed to send auto-reply:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully! We'll get back to you soon.",
      id,
    });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
