// Run with: node scripts/fix-fk.mjs
import { PrismaClient } from '@prisma/client'

const DB = 'postgresql://neondb_owner:npg_leuKn12zfGrh@ep-flat-heart-absp4pdu.eu-west-2.aws.neon.tech/neondb?sslmode=require'

for (const schema of ['tenant_makuti', 'tenant_mizpha', 'tenant_swiss']) {
  const prisma = new PrismaClient({ datasources: { db: { url: DB } } })
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT conname FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = '${schema}' AND t.relname = 'properties' AND c.contype = 'f'
    `)
    console.log(`${schema} FKs:`, rows.map(r => r.conname))
    for (const row of rows) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}"."properties" DROP CONSTRAINT "${row.conname}"`)
      console.log(`  Dropped: ${row.conname}`)
    }
  } catch(e) {
    console.error(`${schema} error:`, e.message)
  } finally {
    await prisma.$disconnect()
  }
}
console.log('Done')
