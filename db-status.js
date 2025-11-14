const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatus() {
  console.log('\n=== DATABASE STATUS ===\n');
  
  // Check properties
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: { units: true }
      }
    }
  });
  
  console.log('Properties:');
  properties.forEach(p => {
    console.log(`  ${p.name}: ${p._count.units} units (ID: ${p.id})`);
  });
  
  const total = await prisma.unit.count();
  console.log(`\nTotal units: ${total}\n`);
  
  await prisma.$disconnect();
}

checkStatus().catch(console.error);
