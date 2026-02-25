import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const completeSchema = z.object({
  actualCost: z.number().min(0).optional(),
  afterImages: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// POST /api/maintenance/[id]/complete - Complete maintenance request
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER", "TECHNICAL"]);

    const body = await req.json();
    const validatedData = completeSchema.parse(body);

    // Check if request exists
    const existingRequest = await prisma.maintenance_requests.findFirst({
      where: {
        id: params.id,
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Maintenance request not found",
        },
        { status: 404 }
      );
    }

    // Check if in progress
    if (existingRequest.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot complete request with status: ${existingRequest.status}. Work must be in progress.`,
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      status: "COMPLETED",
      actualEndDate: new Date(),
    };

    if (validatedData.actualCost !== undefined) {
      updateData.actualCost = new Prisma.Decimal(validatedData.actualCost);
    }

    if (validatedData.afterImages) {
      updateData.afterImages = validatedData.afterImages;
    }

    if (validatedData.notes) {
      updateData.notes = validatedData.notes;
    }

    // Complete the work
    const request = await prisma.maintenance_requests.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    // Log the activity
    await prisma.activity_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        action: "UPDATE",
        entityType: "RenovationRequest",
        entityId: request.id,
        details: `Completed maintenance request: ${request.title} for unit ${request.unit.unitNumber}${
          validatedData.actualCost ? `. Actual cost: KSh ${validatedData.actualCost}` : ""
        }`,
      },
    });

    return NextResponse.json({
      success: true,
      data: request,
      message: "Maintenance request completed successfully",
    });
  } catch (error: any) {
    console.error("Error completing maintenance request:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to complete maintenance request",
      },
      { status: error.status || 500 }
    );
  }
}
