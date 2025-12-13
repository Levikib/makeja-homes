import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncUnitTenantStatus() {
  console.log('🔄 Starting unit-tenant sync...\n');

  // Get all units
  const units = await prisma.units.findMany({
    include: {
      tenants: true,
    },
  });

  let fixedCount = 0;

  for (const unit of units) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find active tenants (lease hasn't ended)
    const activeTenants = unit.tenants.filter((t) => {
      const leaseEnd = new Date(t.leaseEndDate);
      leaseEnd.setHours(0, 0, 0, 0);
      return leaseEnd >= today;
    });

    const hasActiveTenant = activeTenants.length > 0;
    const currentStatus = unit.status;
    const correctStatus = hasActiveTenant ? 'OCCUPIED' : 'VACANT';

    if (currentStatus !== correctStatus) {
      console.log(`🔧 Fixing Unit ${unit.unitNumber}:`);
      console.log(`   Current Status: ${currentStatus}`);
      console.log(`   Active Tenants: ${activeTenants.length}`);
      console.log(`   Correct Status: ${correctStatus}`);
      
      await prisma.units.update({
        where: { id: unit.id },
        data: { status: correctStatus },
      });
      
      fixedCount++;
      console.log(`   ✅ Updated to ${correctStatus}\n`);
    }
  }

  console.log(`\n✅ Sync complete! Fixed ${fixedCount} units.`);
  await prisma.$disconnect();
}

syncUnitTenantStatus().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
