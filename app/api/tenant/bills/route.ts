import { NexrRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
 
export async function GET(request: NextRequest) {
  try {
     const token = request.cookies.get("token")?.value;
     if (!token) {
       return NextResponse.json({ error: "unauthorized" }, { status: 401 });
     }

     const secret = new TextEncoder().encode(process.env.JWT_SECRET);
     const { payload } = await jwtVerify(token, secret);
     const userId = payload.id as string;
     const role = payload.role as string;

     if (role !== "TENANT") {
       return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
     }

     // Get tenant record with unit and property
     const tenant = await prisma.tenants.findUnique({
       where: { userId: userId },
       include: {
          units: {
            include: {
              properties: true,
             },
            },
          },
        });

        if (!tenant) {
          return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }
    
        // Get all bills for this tenant
        const bills = await prisma.monthly_bills.findMany({
           where: {
             tenantId: tenant.id,
           },
           orderBy: {
              month: "desc",
          },
         });

        // Get current month bill (most recent)
        const currentBill = bills[0] || null;

        // Get water reading for current month (if exists)
        let waterDetails = null;
        if (currentBill) {
           const waterReading = await prisma.water_readings.findFirst({
             where: {
               tenantId: tenant.id,
               month: currentBill.month,
             },
           });

          if (waterReading) {
            waterDetails = {
              previousReading: waterReading.previousReading || 0,
              currentReading: waterReading.currentReading,
              unitConsumed: waterReading.unitsConsumed,
              ratePerUnit: waterReading.ratePerUnit,
              amount: waterReading.amount,
              readingDate: waterReading.readingDate,
             };
           }
         }

         // Grabage details (from current bill)
         const garbageDetails = currentBill
          ? {
              amount: currentDetail.garbageAmount || 0,
              isApplicable: (currentBill.garbageAmount || 0) > 0,
            }
          : null;

          // Format response to match page expectations
          const response = {
            tenant: {
               unitNumber: tenant.units.unitNumber,
               propertyName: tenant.units.properties.name,
            },
            currentBill: currentBill
               ? {
                  month: currentBill.month,
                  rent: currentBill.rentAmount || 0,
                  water: currentBill.waterAmount || 0,
                  garbage: currentBill.garbageAmount || 0,
                  total: currentBill.totalAmount,
                  status: currentBill.status,
                  dueDate: currentBill.dueDate,
                  paidDate: currentBill.paidDate,
                }
              : null,
            waterDetails, 
            garbageDetails,
            billHistory: bills.slice(1).map((bill) => ({
              id: bill.id,
              month: bill.month,
              rent: bill.rentAmount || 0,
              water: bill.waterAmount || 0,
              garbage: bill.garbageAmount || 0,
              total: bill.totalAmount,
              status: bill.status,
              dueDate: bill.dueDate,
              paidDate: bill.paidDate,
            })),
           };

           return NextResponse.json(response);
         } catch (error: any) {
           console.error("Error fetching tenant bills:", error);
           return NextResponse.json(
            { error: "Failed to fetch bills" },
            { status: 500 }
           );
         }
       }


          
