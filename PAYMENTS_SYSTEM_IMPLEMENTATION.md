# Makeja Homes - Payments System Implementation Guide

## PHASE 1: CRITICAL FOUNDATION (Week 1)

### Step 1: Install Payment Dependencies
```bash
npm install @paystack/inline-js
npm install jspdf jspdf-autotable  # For receipt generation
npm install date-fns  # For date calculations
npm install react-to-print  # For printing receipts
```

### Step 2: Configure Paystack
```bash
# Add to .env
echo 'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_xxxxx"' >> .env
echo 'PAYSTACK_SECRET_KEY="sk_test_xxxxx"' >> .env

# Get keys from: https://dashboard.paystack.com/#/settings/developers
```

### Step 3: Create Arrears Calculation API
**File:** app/api/payments/arrears/route.ts
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all active tenants with their payment history
    const tenants = await prisma.tenants.findMany({
      where: {
        leaseEndDate: { gte: new Date() }
      },
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
          }
        },
        units: {
          include: {
            properties: {
              select: { id: true, name: true }
            }
          }
        },
        payments: {
          where: {
            paymentType: 'RENT',
            status: 'COMPLETED',
            deletedAt: null
          }
        }
      }
    });

    const arrearsData = tenants.map(tenant => {
      // Calculate months since lease start
      const monthsElapsed = Math.floor(
        (new Date().getTime() - new Date(tenant.leaseStartDate).getTime()) 
        / (1000 * 60 * 60 * 24 * 30)
      );

      // Total rent due
      const totalDue = tenant.rentAmount * monthsElapsed;

      // Total paid (RENT payments only)
      const totalPaid = tenant.payments.reduce((sum, p) => sum + p.amount, 0);

      // Calculate arrears
      const arrears = totalDue - totalPaid;

      return {
        tenantId: tenant.id,
        tenantName: `${tenant.users.firstName} ${tenant.users.lastName}`,
        email: tenant.users.email,
        phone: tenant.users.phoneNumber,
        unit: tenant.units.unitNumber,
        property: tenant.units.properties.name,
        monthlyRent: tenant.rentAmount,
        monthsElapsed,
        totalDue,
        totalPaid,
        arrears,
        paymentsCount: tenant.payments.length,
        lastPayment: tenant.payments[tenant.payments.length - 1]?.paymentDate || null,
        leaseStart: tenant.leaseStartDate,
        leaseEnd: tenant.leaseEndDate
      };
    });

    // Sort by arrears (highest first)
    arrearsData.sort((a, b) => b.arrears - a.arrears);

    // Calculate totals
    const summary = {
      totalTenants: arrearsData.length,
      totalDue: arrearsData.reduce((sum, t) => sum + t.totalDue, 0),
      totalPaid: arrearsData.reduce((sum, t) => sum + t.totalPaid, 0),
      totalArrears: arrearsData.reduce((sum, t) => sum + t.arrears, 0),
      tenantsInArrears: arrearsData.filter(t => t.arrears > 0).length,
      tenantsUpToDate: arrearsData.filter(t => t.arrears <= 0).length
    };

    return NextResponse.json({
      summary,
      tenants: arrearsData
    });
  } catch (error) {
    console.error("Arrears calculation error:", error);
    return NextResponse.json({ error: "Failed to calculate arrears" }, { status: 500 });
  }
}
```

### Step 4: Enhance Payment Recording API
**File:** app/api/payments/route.ts (REPLACE EXISTING)
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// Generate unique reference number
function generateReferenceNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAY-${timestamp}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.tenantId || !data.amount || !data.paymentMethod || !data.paymentType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get tenant and unit info
    const tenant = await prisma.tenants.findUnique({
      where: { id: data.tenantId },
      include: { units: true }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Generate unique reference
    const referenceNumber = data.referenceNumber || generateReferenceNumber();

    // Create payment record
    const payment = await prisma.payments.create({
      data: {
        id: `payment_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        referenceNumber,
        tenantId: data.tenantId,
        unitId: tenant.unitId,
        leaseId: data.leaseId || null,
        amount: parseFloat(data.amount),
        paymentType: data.paymentType,
        paymentMethod: data.paymentMethod,
        status: data.status || "COMPLETED",
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        periodStart: data.periodStart ? new Date(data.periodStart) : null,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
        transactionId: data.transactionId || null,
        bankName: data.bankName || null,
        paystackReference: data.paystackReference || null,
        paystackStatus: data.paystackStatus || null,
        paystackData: data.paystackData ? JSON.stringify(data.paystackData) : null,
        notes: data.notes || null,
        createdById: user.id,
        updatedAt: new Date()
      },
      include: {
        tenants: {
          include: {
            users: true,
            units: {
              include: { properties: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      payment,
      message: "Payment recorded successfully"
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = { deletedAt: null };

    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (propertyId) {
      where.units = {
        propertyId
      };
    }
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const payments = await prisma.payments.findMany({
      where,
      include: {
        tenants: {
          include: {
            users: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            },
            units: {
              include: {
                properties: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        },
        users_payments_createdByIdTousers: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { paymentDate: "desc" }
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
```

## PHASE 2: BULK PAYMENT IMPORT (Week 1)

### Step 5: Create Excel Import API
**File:** app/api/payments/import/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { payments } = data;

    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: "No payments provided" },
        { status: 400 }
      );
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each payment
    for (const payment of payments) {
      try {
        // Find tenant by name or email
        const tenant = await prisma.tenants.findFirst({
          where: {
            OR: [
              { users: { email: payment.email } },
              {
                users: {
                  firstName: { contains: payment.tenantName?.split(' ')[0], mode: 'insensitive' }
                }
              }
            ]
          },
          include: { units: true }
        });

        if (!tenant) {
          results.errors.push(`Tenant not found: ${payment.tenantName || payment.email}`);
          results.failed++;
          continue;
        }

        // Create payment
        await prisma.payments.create({
          data: {
            id: `payment_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            referenceNumber: payment.referenceNumber || `PAY-${Date.now()}`,
            tenantId: tenant.id,
            unitId: tenant.unitId,
            amount: parseFloat(payment.amount),
            paymentType: payment.paymentType || 'RENT',
            paymentMethod: payment.paymentMethod || 'BANK_TRANSFER',
            status: 'COMPLETED',
            paymentDate: new Date(payment.paymentDate),
            transactionId: payment.transactionId,
            notes: payment.notes,
            createdById: user.id,
            updatedAt: new Date()
          }
        });

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to import payment for ${payment.tenantName}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { error: "Failed to import payments" },
      { status: 500 }
    );
  }
}
```

## PHASE 3: RECEIPT GENERATION (Week 2)

### Step 6: Create Receipt Generator
**File:** lib/receipt-generator.ts
```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReceiptData {
  referenceNumber: string;
  paymentDate: Date;
  tenant: {
    name: string;
    email: string;
    phone: string | null;
  };
  property: string;
  unit: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  notes?: string;
}

export function generateReceipt(data: ReceiptData): string {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(168, 85, 247); // Purple
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('MAKEJA HOMES', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('Official Payment Receipt', 105, 30, { align: 'center' });

  // Receipt details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  let y = 50;
  doc.text(`Receipt No: ${data.referenceNumber}`, 20, y);
  doc.text(`Date: ${new Date(data.paymentDate).toLocaleDateString()}`, 150, y);

  y += 15;
  doc.setFontSize(12);
  doc.text('Received From:', 20, y);
  y += 7;
  doc.setFontSize(10);
  doc.text(data.tenant.name, 20, y);
  y += 5;
  doc.text(data.tenant.email, 20, y);
  if (data.tenant.phone) {
    y += 5;
    doc.text(data.tenant.phone, 20, y);
  }

  // Payment details table
  y += 15;
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Details']],
    body: [
      ['Property', data.property],
      ['Unit', data.unit],
      ['Payment Type', data.paymentType],
      ['Payment Method', data.paymentMethod],
      ['Amount Paid', `KSH ${data.amount.toLocaleString()}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [168, 85, 247] }
  });

  // Amount in words
  y = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(11);
  doc.text(`Amount in Words: ${numberToWords(data.amount)} Shillings Only`, 20, y);

  // Notes
  if (data.notes) {
    y += 10;
    doc.setFontSize(9);
    doc.text(`Notes: ${data.notes}`, 20, y, { maxWidth: 170 });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Thank you for your payment!', 105, 280, { align: 'center' });
  doc.text('For queries: hello@makejahomes.co.ke | +254 XXX XXX XXX', 105, 285, { align: 'center' });

  // Return as base64
  return doc.output('datauristring');
}

function numberToWords(num: number): string {
  // Simplified - you can use a library like 'number-to-words'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';
  
  let result = '';
  
  // Thousands
  if (num >= 1000) {
    result += ones[Math.floor(num / 1000)] + ' Thousand ';
    num %= 1000;
  }
  
  // Hundreds
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  
  // Tens and ones
  if (num >= 20) {
    result += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  } else if (num >= 10) {
    result += teens[num - 10] + ' ';
    return result.trim();
  }
  
  if (num > 0) {
    result += ones[num];
  }
  
  return result.trim();
}
```

## WHEN TOKENS RESET - EXECUTE THIS:

1. Run npm install commands
2. Create the API routes (arrears, enhanced payments, import)
3. Create receipt generator
4. Build Arrears Dashboard page
5. Build Bulk Import UI
6. Test with real data

Total implementation time: 2-3 days of focused work
