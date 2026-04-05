import { NextRequest, NextResponse } from "next/server";
import { getPrismaForTenant } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getPrismaForTenant(request).users.update({
      where: { id: params.id },
      data: { isActive: true }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error activating user:", error);
    return NextResponse.json({ error: "Failed to activate user" }, { status: 500 });
  }
}
