import pandas as pd
import psycopg2
import uuid

conn = psycopg2.connect(host='localhost', database='mizpharentals', user='mizpha', password='shannara2001')
cur = conn.cursor()

print("="*80)
print("📦 IMPORTING PROPERTIES & UNITS")
print("="*80)

# Get or create admin user
cur.execute("SELECT id FROM users LIMIT 1")
result = cur.fetchone()
if result:
    admin_id = result[0]
else:
    admin_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO users (id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt")
        VALUES (%s, 'admin@mizpha.com', '$2a$10$placeholder', 'System', 'Admin', 'ADMIN', NOW(), NOW())
    """, (admin_id,))
    conn.commit()

print(f"✅ Using admin ID: {admin_id}\n")

properties = {
    'Charis Rent Schedule 2025': {'name': 'Charis (Kasarani)', 'address': 'Kasarani', 'city': 'Nairobi', 'country': 'Kenya'},
    'Peniel House Rent Schedule 2025': {'name': 'Peniel (Ngumba)', 'address': 'Ngumba', 'city': 'Nairobi', 'country': 'Kenya'},
    'Benaiah Apartment (A-101) Rent ': {'name': 'Benaiah (Umoja)', 'address': 'Umoja', 'city': 'Nairobi', 'country': 'Kenya'},
    'Eleazar Apartments (A-84) Rent ': {'name': 'Eleazar (Umoja)', 'address': 'Umoja', 'city': 'Nairobi', 'country': 'Kenya'}
}

total_units = 0

for sheet_name, prop_info in properties.items():
    print(f"📍 {prop_info['name']}")
    
    prop_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO properties (id, name, address, city, country, type, "createdById", "createdAt", "updatedAt")
        VALUES (%s, %s, %s, %s, %s, 'RESIDENTIAL', %s, NOW(), NOW())
    """, (prop_id, prop_info['name'], prop_info['address'], prop_info['city'], prop_info['country'], admin_id))
    
    df = pd.read_excel('/home/shannara/mizpharentals/data/Rent Schedules.xlsx', sheet_name=sheet_name)
    units_count = 0
    
    for idx, row in df.iterrows():
        house_no = str(row.get('House No', '')).strip()
        if not house_no or house_no == 'nan':
            continue
        
        status = str(row.get('Status', '')).strip()
        unit_status = 'OCCUPIED' if status == 'Occupied' else 'VACANT'
        unit_type = 'STAFF_QUARTERS' if status == 'Staff' else 'ONE_BEDROOM'
        
        rent = {'Charis': 5500, 'Peniel': 6000, 'Benaiah': 7000}.get(
            next((k for k in ['Charis', 'Peniel', 'Benaiah'] if k in prop_info['name']), None), 6500
        )
        
        try:
            cur.execute("""
                INSERT INTO units (id, "propertyId", "unitNumber", type, status, "rentAmount", "depositAmount", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), prop_id, house_no, unit_type, unit_status, rent, rent))
            units_count += 1
        except:
            pass
    
    print(f"   ✅ {units_count} units")
    total_units += units_count

conn.commit()

cur.execute("SELECT COUNT(*) FROM properties")
prop_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM units")
unit_count = cur.fetchone()[0]

print("\n" + "="*80)
print(f"🏢 Properties: {prop_count}")
print(f"🏠 Units: {unit_count}")
print("="*80)

cur.close()
conn.close()
