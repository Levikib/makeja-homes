import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function sqlCheck() {
  // Get Unit 11's ID
  const unit = await prisma.units.findFirst({
    where: { 
      unitNumber: '11',
      properties: {
        name: {
          contains: 'Eleazar'
        }
      }
    },
    select: { id: true, unitNumber: true, status: true }
  });

  console.log('Unit 11:', unit);

  if (unit) {
    // Check for tenants with this unit ID
    const tenants = await prisma.tenants.findMany({
      where: { unitId: unit.id },
      include: { users: true }
    });

    console.log(`\nTenants with unitId = ${unit.id}:`, tenants.length);
    tenants.forEach(t => {
      console.log(`  - ${t.users.firstName} ${t.users.lastName}`);
    });

    // Also check ALL tenants for Unit 11
    const allUnit11Tenants = await prisma.$queryRaw`
      SELECT t.*, u.firstName, u.lastName, un.unitNumber, p.name as propertyName
      FROM tenants t
      JOIN users u ON t.userId = u.id
      JOIN units un ON t.unitId = un.id
      JOIN properties p ON un.propertyId = p.id
      WHERE un.unitNumber = '11'
      AND p.name LIKE '%Eleazar%'
    `;

    console.log('\nRaw SQL query result:', allUnit11Tenants);
  }

  await prisma.$disconnect();
}

sqlCheck().catch(console.error);
