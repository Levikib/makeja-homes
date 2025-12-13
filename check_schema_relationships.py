import psycopg2

conn = psycopg2.connect(
    dbname="mizpharentals",
    user="postgres",
    password="Qwerty@2022",
    host="localhost",
    port="5432"
)

cur = conn.cursor()

print("=== CHECKING DATABASE RELATIONSHIPS ===\n")

# Check foreign keys in lease_agreements
cur.execute("""
    SELECT 
        tc.constraint_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name='lease_agreements' 
      AND tc.constraint_type = 'FOREIGN KEY';
""")

print("LEASE_AGREEMENTS foreign keys:")
for row in cur.fetchall():
    print(f"  {row[1]} -> {row[2]}.{row[3]}")

# Check foreign keys in tenants
print("\nTENANTS foreign keys:")
cur.execute("""
    SELECT 
        tc.constraint_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name='tenants' 
      AND tc.constraint_type = 'FOREIGN KEY';
""")

for row in cur.fetchall():
    print(f"  {row[1]} -> {row[2]}.{row[3]}")

# Check foreign keys in units
print("\nUNITS foreign keys:")
cur.execute("""
    SELECT 
        tc.constraint_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name='units' 
      AND tc.constraint_type = 'FOREIGN KEY';
""")

for row in cur.fetchall():
    print(f"  {row[1]} -> {row[2]}.{row[3]}")

cur.close()
conn.close()
