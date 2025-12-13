import psycopg2
import uuid
from datetime import datetime, timedelta
import random

conn = psycopg2.connect(host='localhost', database='mizpharentals', user='mizpha', password='shannara2001')
cur = conn.cursor()

print("="*80)
print("👥 CREATING TEMPLATE TENANTS FOR OCCUPIED UNITS")
print("="*80)

# Get admin user ID
cur.execute("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1")
admin_id = cur.fetchone()[0]

# Get all occupied units
cur.execute("""
    SELECT u.id, u."unitNumber", u."rentAmount", p.name
    FROM units u
    JOIN properties p ON u."propertyId" = p.id
    WHERE u.status = 'OCCUPIED'
    ORDER BY p.name, u."unitNumber"
""")
occupied_units = cur.fetchall()

print(f"\n📊 Found {len(occupied_units)} occupied units")
print("\nCreating tenants...\n")

tenant_count = 0
lease_count = 0

for unit_id, unit_number, rent_amount, property_name in occupied_units:
    try:
        # Create tenant user account
        user_id = str(uuid.uuid4())
        email = f"tenant.{unit_number.lower().replace(' ', '').replace('.', '')}@template.com"
        
        cur.execute("""
            INSERT INTO users (id, email, password, "firstName", "lastName", role, "phoneNumber", "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, 'TENANT', %s, NOW(), NOW())
            ON CONFLICT (email) DO NOTHING
            RETURNING id
        """, (
            user_id,
            email,
            '$2a$10$templatepasswordhash',
            f'Tenant',
            unit_number.upper(),
            f'+254700{str(random.randint(100000, 999999))}'
        ))
        
        user_result = cur.fetchone()
        if not user_result:
            print(f"   ⚠️  {property_name} - {unit_number}: User already exists")
            continue
            
        # Create tenant record
        tenant_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO tenants (
                id, "userId", "unitId",
                "nationalId", "emergencyContact", "emergencyPhone",
                "createdAt", "updatedAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (
            tenant_id,
            user_id,
            unit_id,
            f'{random.randint(10000000, 99999999)}',
            'Emergency Contact (Template)',
            f'+254700{str(random.randint(100000, 999999))}'
        ))
        
        # Create active lease agreement
        lease_id = str(uuid.uuid4())
        start_date = datetime.now() - timedelta(days=random.randint(30, 365))
        end_date = start_date + timedelta(days=365)
        
        cur.execute("""
            INSERT INTO lease_agreements (
                id, "unitId", "tenantId", "startDate", "endDate",
                "monthlyRent", "depositAmount", status,
                "createdById", "createdAt", "updatedAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'ACTIVE', %s, NOW(), NOW())
        """, (
            lease_id,
            unit_id,
            tenant_id,
            start_date,
            end_date,
            rent_amount,
            rent_amount,
            admin_id
        ))
        
        # Update unit with tenantId
        cur.execute("""
            UPDATE units SET "tenantId" = %s WHERE id = %s
        """, (tenant_id, unit_id))
        
        tenant_count += 1
        lease_count += 1
        
        print(f"   ✅ {property_name} - Unit {unit_number}")
        
    except Exception as e:
        print(f"   ❌ {property_name} - Unit {unit_number}: {e}")
        conn.rollback()
        continue
    
    conn.commit()

print(f"\n{'='*80}")
print(f"✅ COMPLETE!")
print(f"{'='*80}")
print(f"👥 Tenants created: {tenant_count}")
print(f"📄 Leases created: {lease_count}")
print(f"{'='*80}\n")

cur.close()
conn.close()
