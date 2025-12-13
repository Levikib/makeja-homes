import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Pre-migration: Preserving critical data...\n");

  // 1. Copy moveInDate to a temporary table
  console.log("1️⃣ Copying moveInDate values...");
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS tenant_migration_backup (
      tenant_id TEXT PRIMARY KEY,
      move_in_date TIMESTAMP,
      original_role TEXT
    )
  `;

  await prisma.$executeRaw`
    INSERT INTO tenant_migration_backup (tenant_id, move_in_date)
    SELECT t.id, t."moveInDate"
    FROM tenants t
    ON CONFLICT (tenant_id) DO UPDATE 
    SET move_in_date = EXCLUDED.move_in_date
  `;

  const tenantCount = await prisma.$queryRaw`SELECT COUNT(*) FROM tenant_migration_backup`;
  console.log(`   ✅ Backed up ${JSON.stringify(tenantCount)} tenant move-in dates\n`);

  // 2. Backup user roles
  console.log("2️⃣ Backing up user roles...");
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS user_role_backup (
      user_id TEXT PRIMARY KEY,
      role TEXT
    )
  `;

  await prisma.$executeRaw`
    INSERT INTO user_role_backup (user_id, role)
    SELECT id, role::TEXT
    FROM users
    ON CONFLICT (user_id) DO UPDATE 
    SET role = EXCLUDED.role
  `;

  const userCount = await prisma.$queryRaw`SELECT COUNT(*) FROM user_role_backup`;
  console.log(`   ✅ Backed up ${JSON.stringify(userCount)} user roles\n`);

  console.log("✅ Pre-migration backup complete!");
  console.log("\n📌 Safe to proceed with: npx prisma db push");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
