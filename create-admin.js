const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  try {
    // Generate a unique ID
    const userId = 'user_' + crypto.randomBytes(12).toString('hex');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    const now = new Date();
    
    // Create admin user
    const user = await prisma.users.create({
      data: {
        id: userId,
        email: 'levo@makejahomes.co.ke',
        password: hashedPassword,
        firstName: 'Levo',
        lastName: 'Kibirie',
        phoneNumber: '+254700000000',
        role: 'ADMIN',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Password: Admin@123');
    console.log('\nYou can now login at http://localhost:3000/auth/login');
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });