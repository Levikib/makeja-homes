import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { listBanks } from "@/lib/paystack";

export const dynamic = 'force-dynamic'

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

    const rawBanks = await listBanks();

    // Deduplicate by name (Paystack returns duplicates)
    const seen = new Set<string>();
    const banks = rawBanks.filter((b: any) => {
      const key = b.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`✅ Found ${banks.length} banks (deduped from ${rawBanks.length})`);

    return NextResponse.json({ banks });
  } catch (error: any) {
    console.error("❌ Error fetching banks:", error);
    return NextResponse.json(
      { error: "Failed to fetch banks" },
      { status: 500 }
    );
  }
}
