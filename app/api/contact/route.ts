import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendContactFormNotification, sendContactFormAutoReply } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, message } = await request.json();

    console.log("📨 Contact form submission received");
    console.log("From:", name, email);

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    console.log("💾 Saving to database...");

    // Save to database
    const contactMessage = await prisma.contact_messages.create({
      data: {
        name,
        email,
        phone: phone || null,
        message,
        status: "NEW",
      },
    });

    console.log("✅ Message saved to database");
    console.log("📧 Sending email notifications...");

    // Send notification email to admin
    try {
      await sendContactFormNotification(name, email, phone, message);
      console.log("✅ Notification email sent to admin");
    } catch (emailError) {
      console.error("❌ Failed to send notification email:", emailError);
      // Continue even if email fails
    }

    // Send auto-reply to customer
    try {
      await sendContactFormAutoReply(name, email);
      console.log("✅ Auto-reply sent to customer");
    } catch (emailError) {
      console.error("❌ Failed to send auto-reply:", emailError);
      // Continue even if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully! We'll get back to you soon.",
      id: contactMessage.id,
    });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}