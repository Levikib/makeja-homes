const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@mizpharentals.com' }
  });
  
  console.log('User found:', user ? 'YES' : 'NO');
  console.log('Email:', user?.email);
  console.log('Password hash:', user?.password);
  console.log('Password starts with $2:', user?.password?.startsWith('$2'));
  
  if (user) {
    const isValid = await bcrypt.compare('password123', user.password);
    console.log('Password "password123" valid:', isValid);
  }
  
  await prisma.$disconnect();
}

testAuth();
