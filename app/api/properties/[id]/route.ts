import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.properties.findUnique({
      where: { id: params.id },
      include: {
        units: true
      }
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error("Error fetching property:", error);
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
      updatedAt: new Date()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state || null;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode || null;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined) updateData.description = data.description || null;
    
    if (data.managerIds !== undefined) {
      updateData.managerIds = Array.isArray(data.managerIds) ? data.managerIds : [];
    }
    if (data.caretakerIds !== undefined) {
      updateData.caretakerIds = Array.isArray(data.caretakerIds) ? data.caretakerIds : [];
    }
    if (data.storekeeperIds !== undefined) {
      updateData.storekeeperIds = Array.isArray(data.storekeeperIds) ? data.storekeeperIds : [];
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
    // Get all units for this property
    const units = await prisma.units.findMany({
      where: { propertyId: params.id },
      select: { id: true }
    });

    const unitIds = units.map(u => u.id);

    // Get all tenants for these units
    const tenants = await prisma.tenants.findMany({
      where: { unitId: { in: unitIds } },
      select: { id: true }
    });

    const tenantIds = tenants.map(t => t.id);

    // Delete cascade in correct order
    if (tenantIds.length > 0) {
      // Delete water_readings (references tenants via tenantId)
      await prisma.water_readings.deleteMany({
        where: { tenantId: { in: tenantIds } }
      });

      // Delete vacate_notices (references tenants)
      await prisma.vacate_notices.deleteMany({
        where: { tenantId: { in: tenantIds } }
      });

      // Delete security_deposits (references tenants)
      await prisma.security_deposits.deleteMany({
        where: { tenantId: { in: tenantIds } }
      });

      // Delete payments (references tenants)
      await prisma.payments.deleteMany({
        where: { tenantId: { in: tenantIds } }
      });

      // Delete lease_agreements (references tenants)
      await prisma.lease_agreements.deleteMany({
        where: { tenantId: { in: tenantIds } }
      });

      // Delete damage_assessments (references tenants)
      await prisma.damage_assessments.deleteMany({
        where: { tenantId: { in: tenantIds } }
      });
    }

    if (unitIds.length > 0) {
      // Delete maintenance_requests (might reference units)
      await prisma.maintenance_requests.deleteMany({
        where: { unitId: { in: unitIds } }
      });

      // Delete tenants (references units)
      await prisma.tenants.deleteMany({
        where: { unitId: { in: unitIds } }
      });

      // Delete units (references properties)
      await prisma.units.deleteMany({
        where: { propertyId: params.id }
      });
    }

    // Delete expenses (references properties)
    await prisma.expenses.deleteMany({
      where: { propertyId: params.id }
    });

    // Finally delete the property
    await prisma.properties.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json({ 
      error: "Failed to delete property", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
