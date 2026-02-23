import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { sendBulkPaymentReminders } from "@/lib/services/email-service";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { billIds, propertyId } = body;

    let bills;
    
    // Get bills - either specific IDs or all overdue for property
    if (billIds && billIds.length > 0) {
      bills = await prisma.monthly_bills.findMany({
        where: {
          id: { in: billIds },
          status: { in: ["PENDING", "OVERDUE"] }
        },
        include: {
          tenants: {
            include: {
              users: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                }
              },
              units: {
                select: {
                  unitNumber: true,
                }
              }
            }
          }
        }
      });
    } else if (propertyId) {
      bills = await prisma.monthly_bills.findMany({
        where: {
          units: {
            propertyId: propertyId
          },
          status: { in: ["PENDING", "OVERDUE"] }
        },
        include: {
          tenants: {
            include: {
              users: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                }
              },
              units: {
                select: {
                  unitNumber: true,
                }
              }
            }
          }
        }
      });
    } else {
      // No filter = send to ALL pending/overdue bills across all properties
      bills = await prisma.monthly_bills.findMany({
        where: { status: { in: ["PENDING", "OVERDUE"] } },
        include: {
          tenants: {
            include: {
              users: { select: { email: true, firstName: true, lastName: true } },
              units: { select: { unitNumber: true } }
            }
          }
        }
      });
    }

    if (bills.length === 0) {
      return NextResponse.json(
        { error: "No bills found" },
        { status: 404 }
      );
    }

    // Format data for email service
    const emailData = bills.map(bill => ({
      tenantEmail: bill.tenants.users.email,
      tenantName: `${bill.tenants.users.firstName} ${bill.tenants.users.lastName}`,
      amount: bill.totalAmount,
      dueDate: bill.dueDate,
      unitNumber: bill.tenants.units.unitNumber,
    }));

    // Send bulk reminders
    const result = await sendBulkPaymentReminders(emailData);

    return NextResponse.json({
      success: true,
      message: `Sent ${result.sent} reminders successfully`,
      stats: result
    });
  } catch (error: any) {
    console.error("❌ Error sending bulk reminders:", error);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}
