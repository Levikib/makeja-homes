import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.properties.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });
    return NextResponse.json(property);
  } catch (error) {
    console.error("Error archiving property:", error);
    return NextResponse.json({ error: "Failed to archive property" }, { status: 500 });
  }
}
