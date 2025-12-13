import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.properties.findUnique({
      where: { id: params.id },
    });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    return NextResponse.json(property);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch property" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    const updateData: any = {
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state || null,
      country: data.country,
      postalCode: data.postalCode || null,
      type: data.type,
      description: data.description || null,
      updatedAt: new Date()
    };

    // Handle manager assignment
    if (data.managerId === "") {
      updateData.managerId = null;
    } else if (data.managerId) {
      updateData.managerId = data.managerId;
    }

    // Handle caretaker assignment
    if (data.caretakerId === "") {
      updateData.caretakerId = null;
    } else if (data.caretakerId) {
      updateData.caretakerId = data.caretakerId;
    }

    const property = await prisma.properties.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error("Error updating property:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    if (password !== "admin") {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    await prisma.properties.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: "Property permanently deleted" });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
  }
}
