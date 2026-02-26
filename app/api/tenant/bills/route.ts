import { NextRequest, NextResponse } from "next/server";
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
        const allBills = await prisma.monthly_bills.findMany({
           where: {
             tenantId: tenant.id,
           },
           orderBy: {
              month: "desc",
          },
         });

        // Get current month bill (most recent)
        const currentBill = allBills[0] || null;

        // Get water reading for current month (if exists)
        let waterDetails = null;
        if (currentBill) {
           const waterReading = await prisma.water_readings.findFirst({
             where: {
               tenantId: tenant.id,
                         month: new Date(currentBill.month).getMonth() + 1, 
            year: new Date(currentBill.month).getFullYear(),
             },
           });

          if (waterReading) {
            waterDetails = {
              previousReading: waterReading.previousReading || 0,
              currentReading: waterReading.currentReading,
              unitsConsumed: waterReading.unitsConsumed,
              ratePerUnit: waterReading.ratePerUnit,
              amount: waterReading.amountDue,
              readingDate: waterReading.readingDate,
             };
           }
         }

         // Grabage details (from current bill)
         const garbageDetails = currentBill
          ? {
              amount: currentBill.garbageAmount || 0,
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
            billHistory: allBills.slice(1).map((bill) => ({
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

   //Also provide bills array for payment page
 const bills = currentBill
      ? [{
         id: currentBill?.id || `bill_${Date.now()}`,
         month: currentBill.month,
         rent: response.currentBill?.rent || 0,
         water: response.currentBill?.water || 0,
         garbage: response.currentBill?.garbage || 0,
         total: response.currentBill?.total || 0,
         status: currentBill.status,
         dueDate: currentBill.dueDate,
         paidDate: currentBill.paidDate,
         property: {
             id: tenant.units.properties.id,
             name: tenant.units.properties.name,
             paystackActive: tenant.units.properties.paystackActive,
             paystackSubaccountCode: tenant.units.properties.paystackSubaccountCode,
           },
           unit: {
             id: tenant.units.id,
             unitNumber: tenant.units.unitNumber,
           },
           tenant: {
             id: tenant.id,
             userId: tenant.userId,
           }
         }, ...response.billHistory.map((bill: any) => ({
           ...bill,
           property: {
              id: tenant.units.properties.id,
              name: tenant.units.properties.name,
              paystackActive: tenant.units.properties.paystackActive,
              paystackSubaccountCode: tenant.units.properties.paystackSubaccountCode,
             },
             unit: {
                id: tenant.units.id,
                unitNumber: tenant.units.unitNumber,
             },
             tenant: {
               id: tenant.id,
               userId: tenant.userId,
             }
             }))]
           : response.billHistory.map((bill: any) => ({
               ...bill,
               property: {
                  id: tenant.units.properties.id,
                  name: tenant.units.properties.name, 
                  paystackActive: tenant.units.properties.paystackActive,
                  paystackSubaccountCode: tenant.units.properties.paystackSubaccountCode,
                },
               unit: {
                  id: tenant.units.id,
                  unitNumber: tenant.units.unitNumber,
               },
               tenant: {
                   id: tenant.id,
                   userId: tenant.userId,
               }
             }));
      
 console.log("Sending bills[0]:", JSON.stringify(bills[0], null, 2));
         return NextResponse.json({ ...response, bills });
         } catch (error: any) {
           console.error("Error fetching tenant bills:", error);
           return NextResponse.json(
            { error: "Failed to fetch bills" },
            { status: 500 }
           );
         }
       }


          
