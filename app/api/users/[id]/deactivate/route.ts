import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Deactivate user
    const user = await prisma.users.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    // Get all properties where this user is assigned
    const properties = await prisma.properties.findMany({
      where: {
        OR: [
          { managerIds: { has: params.id } },
          { caretakerIds: { has: params.id } },
          { storekeeperIds: { has: params.id } }
        ]
      }
    });

    // Remove ONLY this user from each property (keeping other staff)
    for (const property of properties) {
      await prisma.properties.update({
        where: { id: property.id },
        data: {
          managerIds: property.managerIds.filter(id => id !== params.id),
          caretakerIds: property.caretakerIds.filter(id => id !== params.id),
          storekeeperIds: property.storekeeperIds.filter(id => id !== params.id)
        }
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error deactivating user:", error);
    return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 });
  }
}
