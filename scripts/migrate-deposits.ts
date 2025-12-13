import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting deposit migration...");

  const tenants = await prisma.tenant.findMany({
    include: {
      securityDeposits: true,
    },
  });

  console.log(`Found ${tenants.length} tenants`);

  for (const tenant of tenants) {
    // Check if deposit already exists
    if (tenant.securityDeposits.length === 0) {
      await prisma.securityDeposit.create({
        data: {
          tenantId: tenant.id,
          amount: tenant.depositAmount,
          paidDate: tenant.leaseStartDate,
          status: "HELD",
        },
      });

      console.log(`✅ Created deposit for tenant ${tenant.id}`);
    } else {
      console.log(`⏭️  Deposit already exists for tenant ${tenant.id}`);
    }
  }

  console.log("✅ Migration complete!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
