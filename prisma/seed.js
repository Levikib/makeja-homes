// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  // === DELETE ALL EXISTING DATA FIRST ===
  console.log('Cleaning existing data...');
  await prisma.property.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✓ Cleaned\n');

  // === USERS & ROLES ===
  const users = [
    { email: 'admin@mizpha.com', role: 'ADMIN', firstName: 'Super', lastName: 'Admin', phone: '+254700000001' },
    { email: 'manager@mizpha.com', role: 'MANAGER', firstName: 'Jane', lastName: 'Doe', phone: '+254700000002' },
    { email: 'store@mizpha.com', role: 'STOREKEEPER', firstName: 'Tom', lastName: 'Store', phone: '+254700000003' },
    { email: 'tech@mizpha.com', role: 'TECHNICAL', firstName: 'Mike', lastName: 'Tech', phone: '+254700000004' },
    { email: 'care@mizpha.com', role: 'CARETAKER', firstName: 'Sarah', lastName: 'Care', phone: '+254700000005' },
  ];

  console.log('Seeding users...');
  for (const u of users) {
    await prisma.user.create({
      data: {
        email: u.email,
        password: passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        phoneNumber: u.phone,
        role: u.role,
        isActive: true,
        emailVerified: new Date(),
      },
    });
    console.log(`Created: ${u.email}`);
  }

  // === PROPERTIES (BUILDINGS) ===
  const admin = await prisma.user.findUnique({ where: { email: 'admin@mizpha.com' } });

  const properties = [
    { name: 'Charis (Kasarani)', address: 'Ngong Road', city: 'Nairobi', totalUnits: 37 },
    { name: 'Peniel House (Ngumba)', address: 'Mombasa Road', city: 'Nairobi', totalUnits: 37 },
    { name: 'Eleazar Apartments (A-84) Umoja', address: 'Thika Road', city: 'Nairobi', totalUnits: 58 },
    { name: 'Benaiah Apartment (A-101) Umoja', address: 'Kilimani', city: 'Nairobi', totalUnits: 31 },
  ];

  console.log('\nSeeding properties...');
  for (const p of properties) {
    await prisma.property.create({
      data: {
        ...p,
        country: 'Kenya',
        createdById: admin.id,
      },
    });
    console.log(`Created: ${p.name}`);
  }

  console.log('\n✅ Seed complete!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
