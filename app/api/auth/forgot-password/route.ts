import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration
    // In production, you would send an actual password reset email here
    if (user) {
      // TODO: Generate reset token and send email
      // For now, just log that we would send an email
      console.log(`Password reset requested for: ${email}`)
    }

    return NextResponse.json(
      { message: "If the email exists, a reset link has been sent" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    )
  }
}
