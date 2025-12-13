import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Resetting admin password...\n");

  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@mizpha.com" },
    update: {
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      emailVerified: new Date(),
    },
    create: {
      email: "admin@mizpha.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      isActive: true,
      emailVerified: new Date(),
      phoneNumber: "+254700000000",
    },
  });

  console.log("✅ Admin user ready:");
  console.log("   Email: admin@mizpha.com");
  console.log("   Password: admin123");
  console.log(`   Role: ${admin.role}`);
  console.log(`   Active: ${admin.isActive}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
