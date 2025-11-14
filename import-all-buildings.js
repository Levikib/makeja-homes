// import-all-buildings.js
// Import all 4 buildings with units and tenants from Excel data
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const prisma = new PrismaClient();

// Building name mapping - Excel names now match DB names exactly
const buildingMap = {
  'Charis (Kasarani)': 'Charis (Kasarani)',
  'Peniel House (Ngumba)': 'Peniel House (Ngumba)',
  'Benaiah Apartment (A-101) Umoja': 'Benaiah Apartment (A-101) Umoja',
  'Eleazar Apartments (A-84) Umoja': 'Eleazar Apartments (A-84) Umoja',
};

// Status mapping
const statusMap = {
  'Occupied': 'OCCUPIED',
  'Vacant': 'VACANT',
  'Staff': 'OCCUPIED', // Staff quarters are occupied
  'Shop': 'OCCUPIED', // Shops are occupied
};

// Unit type determination
const getUnitType = (unitNumber, status) => {
  if (status === 'Shop') return 'SHOP';
  
  // Convert to string and handle numeric unit numbers
  const unitStr = String(unitNumber).toUpperCase();
  
  // Staff quarters (usually G, H, J prefixes or C4)
  const prefix = unitStr.charAt(0);
  if (['G', 'H', 'J'].includes(prefix) || unitStr === 'C4') {
    return 'STAFF_QUARTERS';
  }
  
  // Default to ONE_BEDROOM
  return 'ONE_BEDROOM';
};

// Generate unique email
const generateEmail = (building, unitNumber) => {
  const buildingShort = building.split(' ')[0].toLowerCase();
  const unitClean = String(unitNumber).toLowerCase().replace(/[^a-z0-9]/g, '');
  return `tenant.${buildingShort}.${unitClean}@mizpha.com`;
};

async function main() {
  console.log('🚀 Starting COMPLETE Excel data import...\n');
  console.log('📋 Importing 4 buildings with 163 units total\n');

  // Get admin user
  const admin = await prisma.user.findUnique({ 
    where: { email: 'admin@mizpha.com' } 
  });

  if (!admin) {
    throw new Error('❌ Admin user not found! Run seed first: npm run seed');
  }

  // Load Excel data from JSON
  let excelData;
  try {
    excelData = JSON.parse(fs.readFileSync('/tmp/buildings_data.json', 'utf8'));
  } catch (e) {
    throw new Error('❌ Could not load Excel data. Make sure the Python script ran successfully.');
  }

  console.log(`✓ Loaded ${excelData.length} units from Excel\n`);

  // Get all properties
  const properties = await prisma.property.findMany({
    where: { deletedAt: null }
  });

  const propertyLookup = {};
  properties.forEach(p => {
    propertyLookup[p.name] = p;
  });

  console.log('✓ Found properties:');
  Object.keys(propertyLookup).forEach(name => {
    console.log(`  - ${name}`);
  });
  console.log('');

  const passwordHash = await bcrypt.hash('tenant123', 10);
  
  let stats = {
    unitsCreated: 0,
    tenantsCreated: 0,
    byBuilding: {},
  };

  // Group data by building
  const byBuilding = {};
  excelData.forEach(row => {
    if (!byBuilding[row.building]) {
      byBuilding[row.building] = [];
    }
    byBuilding[row.building].push(row);
  });

  // Process each building
  for (const [excelBuildingName, units] of Object.entries(byBuilding)) {
    const dbBuildingName = buildingMap[excelBuildingName];
    const property = propertyLookup[dbBuildingName];

    if (!property) {
      console.log(`⚠️  Skipping ${excelBuildingName} - not found in database`);
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏢 ${dbBuildingName} (${excelBuildingName})`);
    console.log(`${'='.repeat(60)}`);

    stats.byBuilding[dbBuildingName] = {
      total: 0,
      occupied: 0,
      vacant: 0,
      staff: 0,
      shop: 0,
    };

    for (const row of units) {
      const unitType = getUnitType(row.unitNumber, row.status);
      const prismaStatus = statusMap[row.status];
      
      // Convert unitNumber to string
      const unitNumberStr = String(row.unitNumber);
      
      // Create Unit
      const unit = await prisma.unit.create({
        data: {
          propertyId: property.id,
          unitNumber: unitNumberStr,
          type: unitType,
          status: prismaStatus,
          rentAmount: 15000, // Default rent (update later)
          depositAmount: 15000,
          bedrooms: unitType === 'SHOP' ? 0 : 1,
          bathrooms: unitType === 'SHOP' ? 1 : 1,
          createdById: admin.id,
        },
      });

      stats.unitsCreated++;
      stats.byBuilding[dbBuildingName].total++;

      console.log(`  ✓ ${unitNumberStr} (${row.status})`);

      // Create Tenant for Occupied units (not Staff or Shop)
      if (row.status === 'Occupied') {
        stats.byBuilding[dbBuildingName].occupied++;

        const tenantEmail = generateEmail(dbBuildingName, unitNumberStr);
        const firstName = 'Tenant';
        const lastName = `${dbBuildingName.split(' ')[0]} ${unitNumberStr}`;

        // Create User
        const user = await prisma.user.create({
          data: {
            email: tenantEmail,
            password: passwordHash,
            firstName,
            lastName,
            phoneNumber: `+25470${String(stats.tenantsCreated + 1).padStart(8, '0')}`,
            role: 'TENANT',
            isActive: true,
            emailVerified: new Date(),
          },
        });

        // Create Tenant
        await prisma.tenant.create({
          data: {
            userId: user.id,
            unitId: unit.id,
            moveInDate: new Date('2024-01-01'),
          },
        });

        stats.tenantsCreated++;
        console.log(`    ↳ Tenant: ${tenantEmail}`);
      } else if (row.status === 'Vacant') {
        stats.byBuilding[dbBuildingName].vacant++;
      } else if (row.status === 'Staff') {
        stats.byBuilding[dbBuildingName].staff++;
      } else if (row.status === 'Shop') {
        stats.byBuilding[dbBuildingName].shop++;
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ IMPORT COMPLETE!');
  console.log(`${'='.repeat(60)}`);
  console.log(`📦 Total Units Created: ${stats.unitsCreated}`);
  console.log(`👥 Total Tenants Created: ${stats.tenantsCreated}`);

  console.log('\n📊 Breakdown by Building:');
  for (const [building, data] of Object.entries(stats.byBuilding)) {
    console.log(`\n${building}:`);
    console.log(`  Total: ${data.total}`);
    console.log(`  Occupied: ${data.occupied}`);
    console.log(`  Vacant: ${data.vacant}`);
    console.log(`  Staff: ${data.staff}`);
    console.log(`  Shop: ${data.shop}`);
  }

  console.log('\n🔐 TENANT LOGIN CREDENTIALS:');
  console.log('Password for all tenants: tenant123');
  console.log('\nEmail format: tenant.[building].[unit]@mizpha.com');
  console.log('Examples:');
  console.log('  - tenant.charis.g1@mizpha.com');
  console.log('  - tenant.peniel.a1@mizpha.com');
  console.log('  - tenant.benaiah.101@mizpha.com');
  console.log('  - tenant.eleazar.201@mizpha.com');

  console.log('\n✅ DONE! Refresh your dashboard to see the data.');
}

main()
  .catch((e) => {
    console.error('\n❌ ERROR:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
