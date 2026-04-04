import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

// Deprecated — registration is handled by /api/onboarding/register
// This stub prevents crashes from any legacy calls and points clients to the right path.
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is no longer active. Please visit /onboarding to create an account.",
      redirect: "/onboarding",
    },
    { status: 410 }
  );
}
