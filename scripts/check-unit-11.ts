import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUnit11() {
  console.log('🔍 Checking Unit 11...\n');

  const unit = await prisma.units.findFirst({
    where: { unitNumber: '11' },
    include: {
      properties: true,
      tenants: {
        include: {
          users: true,
        },
      },
    },
  });

  if (!unit) {
    console.log('❌ Unit 11 not found!');
    return;
  }

  console.log('📊 Unit 11 Details:');
  console.log(`   ID: ${unit.id}`);
  console.log(`   Unit Number: ${unit.unitNumber}`);
  console.log(`   Property: ${unit.properties.name}`);
  console.log(`   Status: ${unit.status}`);
  console.log(`   Tenants Count: ${unit.tenants.length}`);
  
  if (unit.tenants.length > 0) {
    console.log('\n👥 Tenants:');
    unit.tenants.forEach((tenant, index) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const leaseEnd = new Date(tenant.leaseEndDate);
      leaseEnd.setHours(0, 0, 0, 0);
      const isActive = leaseEnd >= today;

      console.log(`\n   Tenant ${index + 1}:`);
      console.log(`   Name: ${tenant.users.firstName} ${tenant.users.lastName}`);
      console.log(`   Email: ${tenant.users.email}`);
      console.log(`   Lease Start: ${tenant.leaseStartDate.toLocaleDateString()}`);
      console.log(`   Lease End: ${tenant.leaseEndDate.toLocaleDateString()}`);
      console.log(`   Is Active: ${isActive ? '✅ YES' : '❌ NO (expired)'}`);
      console.log(`   Unit ID: ${tenant.unitId}`);
      console.log(`   Matches Unit: ${tenant.unitId === unit.id ? '✅ YES' : '❌ NO'}`);
    });
  } else {
    console.log('\n⚠️  No tenants found for this unit!');
    
    // Check if there are tenants that should be linked
    console.log('\n🔍 Searching for tenants that might belong to this unit...');
    const allTenants = await prisma.tenants.findMany({
      where: {
        units: {
          unitNumber: '11',
          properties: {
            name: 'Eleazar Apartments (A-84)',
          },
        },
      },
      include: {
        users: true,
        units: true,
      },
    });

    if (allTenants.length > 0) {
      console.log(`\n✅ Found ${allTenants.length} tenant(s) for Unit 11:`);
      allTenants.forEach((t) => {
        console.log(`   - ${t.users.firstName} ${t.users.lastName} (${t.users.email})`);
        console.log(`     Unit ID in record: ${t.unitId}`);
      });
    } else {
      console.log('   No tenants found.');
    }
  }

  await prisma.$disconnect();
}

checkUnit11().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
