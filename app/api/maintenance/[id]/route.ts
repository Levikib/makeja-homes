import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Validation schema for maintenance request update
const maintenanceUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priority: z.number().int().min(1).max(3).optional(),
  status: z.enum(["PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  estimatedCost: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  requestedStartDate: z.string().optional(),
  requestedEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  beforeImages: z.array(z.string()).optional(),
  afterImages: z.array(z.string()).optional(),
  notes: z.string().optional(),
  approvedById: z.string().optional(),
});

// GET /api/maintenance/[id] - Get single maintenance request
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER", "TECHNICAL", "CARETAKER", "TENANT"]);

    const request = await prisma.renovationRequest.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
      include: {
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
            currentTenant: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json(
        {
          success: false,
          error: "Maintenance request not found",
        },
        { status: 404 }
      );
    }

    // If tenant, verify they can access this request
    if (user.role === "TENANT") {
      const tenant = await prisma.tenant.findFirst({
        where: { userId: user.id },
      });

      if (!tenant || tenant.unitId !== request.unitId) {
        return NextResponse.json(
          {
            success: false,
            error: "Access denied",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: request,
    });
  } catch (error: any) {
    console.error("Error fetching maintenance request:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch maintenance request",
      },
      { status: error.status || 500 }
    );
  }
}

// PUT /api/maintenance/[id] - Update maintenance request
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER", "TECHNICAL", "CARETAKER"]);

    const body = await req.json();
    const validatedData = maintenanceUpdateSchema.parse(body);

    // Check if request exists
    const existingRequest = await prisma.renovationRequest.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
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

    // Prepare update data
    const updateData: any = { ...validatedData };

    // Handle decimal fields
    if (validatedData.estimatedCost !== undefined) {
      updateData.estimatedCost = new Prisma.Decimal(validatedData.estimatedCost);
    }

    if (validatedData.actualCost !== undefined) {
      updateData.actualCost = new Prisma.Decimal(validatedData.actualCost);
    }

    // Handle date fields
    if (validatedData.requestedStartDate) {
      updateData.requestedStartDate = new Date(validatedData.requestedStartDate);
    }

    if (validatedData.requestedEndDate) {
      updateData.requestedEndDate = new Date(validatedData.requestedEndDate);
    }

    if (validatedData.actualStartDate) {
      updateData.actualStartDate = new Date(validatedData.actualStartDate);
    }

    if (validatedData.actualEndDate) {
      updateData.actualEndDate = new Date(validatedData.actualEndDate);
    }

    // If approving, set approval fields
    if (validatedData.status === "APPROVED" && existingRequest.status === "PENDING") {
      updateData.approvedById = user.id;
      updateData.approvedAt = new Date();
    }

    // If starting work, set actual start date
    if (validatedData.status === "IN_PROGRESS" && !existingRequest.actualStartDate) {
      updateData.actualStartDate = new Date();
    }

    // If completing work, set actual end date
    if (validatedData.status === "COMPLETED" && !existingRequest.actualEndDate) {
      updateData.actualEndDate = new Date();
    }

    const request = await prisma.renovationRequest.update({
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
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log the activity
    let activityDetails = `Updated maintenance request: ${request.title}`;
    if (validatedData.status && validatedData.status !== existingRequest.status) {
      activityDetails = `Changed status of maintenance request "${request.title}" from ${existingRequest.status} to ${validatedData.status}`;
    }

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "RenovationRequest",
        entityId: request.id,
        details: activityDetails,
      },
    });

    return NextResponse.json({
      success: true,
      data: request,
      message: "Maintenance request updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating maintenance request:", error);

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
        error: error.message || "Failed to update maintenance request",
      },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/maintenance/[id] - Soft delete maintenance request
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);

    // Check if request exists
    const existingRequest = await prisma.renovationRequest.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
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

    // Prevent deletion of in-progress or completed requests
    if (existingRequest.status === "IN_PROGRESS") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete maintenance request that is in progress",
        },
        { status: 400 }
      );
    }

    // Soft delete the request
    const request = await prisma.renovationRequest.update({
      where: {
        id: params.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        entityType: "RenovationRequest",
        entityId: request.id,
        details: `Deleted maintenance request: ${request.title}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Maintenance request deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting maintenance request:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete maintenance request",
      },
      { status: error.status || 500 }
    );
  }
}
