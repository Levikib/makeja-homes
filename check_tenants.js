const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenants.findMany({
    include: {
      users: true,
      units: true,
      lease_agreements: true,
    }
  });
  
  console.log('Total tenants:', tenants.length);
  
  if (tenants.length > 0) {
    console.log('\nSample tenant:');
    console.log('User:', tenants[0].users.firstName, tenants[0].users.lastName);
    console.log('Unit:', tenants[0].units.unitNumber);
    console.log('Lease agreements:', tenants[0].lease_agreements.length);
    if (tenants[0].lease_agreements.length > 0) {
      console.log('Latest lease status:', tenants[0].lease_agreements[0].status);
    }
  } else {
    console.log('\n⚠️ No tenants found in database!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
