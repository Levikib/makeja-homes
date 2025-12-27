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

    // Remove user from all properties (managerIds, caretakerIds, storekeeperIds arrays)
    await prisma.properties.updateMany({
      where: {
        OR: [
          { managerIds: { has: params.id } },
          { caretakerIds: { has: params.id } },
          { storekeeperIds: { has: params.id } }
        ]
      },
      data: {
        managerIds: { set: [] },
        caretakerIds: { set: [] },
        storekeeperIds: { set: [] }
      }
    });

    // More precise removal - get all properties and update individually
    const properties = await prisma.properties.findMany({
      where: {
        OR: [
          { managerIds: { has: params.id } },
          { caretakerIds: { has: params.id } },
          { storekeeperIds: { has: params.id } }
        ]
      }
    });

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
