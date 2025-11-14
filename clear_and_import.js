const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function clearAndImport() {
  // Clear existing units
  console.log('Clearing existing units...');
  const deleted = await prisma.unit.deleteMany({});
  console.log('Deleted ' + deleted.count + ' units\n');
  
  // Read new data
  const data = JSON.parse(fs.readFileSync('units-data.json', 'utf8'));
  const properties = await prisma.property.findMany();
  
  console.log('Found properties in database:');
  properties.forEach(p => console.log('  - ' + p.name));
  console.log('');
  
  let totalImported = 0;
  
  for (const [key, propData] of Object.entries(data)) {
    const property = properties.find(p => p.name === propData.info.name);
    
    if (!property) {
      console.log('Property not found: ' + propData.info.name);
      continue;
    }
    
    console.log('Importing ' + propData.info.name + '...');
    let count = 0;
    
    for (const unit of propData.units) {
      try {
        await prisma.unit.create({
          data: {
            unitNumber: unit.unitNumber,
            propertyId: property.id,
            type: unit.type,
            status: unit.status,
            floor: unit.floor,
            rentAmount: new Decimal(unit.rentAmount),
            features: [],
            images: []
          }
        });
        count++;
        process.stdout.write('.');
      } catch (error) {
        console.log('\n  Error with unit ' + unit.unitNumber + ': ' + error.message);
      }
    }
    
    console.log('\n  Imported ' + count + ' units');
    totalImported += count;
  }
  
  console.log('\nTotal imported: ' + totalImported + ' units');
  
  // Final verification
  console.log('\nFinal counts per property:');
  for (const prop of properties) {
    const count = await prisma.unit.count({
      where: { propertyId: prop.id }
    });
    console.log('  ' + prop.name + ': ' + count + ' units');
  }
  
  await prisma.$disconnect();
}

clearAndImport().catch(console.error);
