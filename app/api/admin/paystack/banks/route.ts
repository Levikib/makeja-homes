import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { listBanks } from "@/lib/paystack";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ FIXED: Use JWT_SECRET (same as middleware)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    console.log("🏦 Fetching Kenyan banks...");

    const banks = await listBanks();

    console.log(`✅ Found ${banks.length} banks`);

    return NextResponse.json({ banks });
  } catch (error: any) {
    console.error("❌ Error fetching banks:", error);
    return NextResponse.json(
      { error: "Failed to fetch banks" },
      { status: 500 }
    );
  }
}
