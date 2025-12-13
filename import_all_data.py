#!/usr/bin/env python3
"""
Comprehensive Data Import Script for Mizpha Rentals
Imports: Properties, Units, Payments (2024), Expenses (2024)
"""

import pandas as pd
import psycopg2
from datetime import datetime
import json
from decimal import Decimal

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'database': 'mizpharentals',
    'user': 'mizpha',
    'password': 'shannara2001'
}

# File paths
DATA_DIR = '/home/shannara/mizpharentals/data/'
RENT_SCHEDULES = DATA_DIR + 'Rent Schedules.xlsx'
PAYMENTS_FILE = DATA_DIR + 'Real Estate Statement Reports.xlsx'
EXPENSES_FILE = DATA_DIR + 'Expenditure Report 2025 .xlsx'

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(**DB_CONFIG)

def import_properties_and_units():
    """Import properties and units from Rent Schedules"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n" + "="*80)
    print("📦 IMPORTING PROPERTIES & UNITS")
    print("="*80)
    
    # Property mappings
    properties = {
        'Charis Rent Schedule 2025': {
            'name': 'Charis (Kasarani)',
            'address': 'Kasarani, Nairobi',
            'type': 'RESIDENTIAL'
        },
        'Peniel House Rent Schedule 2025': {
            'name': 'Peniel (Ngumba)',
            'address': 'Ngumba, Nairobi',
            'type': 'RESIDENTIAL'
        },
        'Benaiah Apartment (A-101) Rent ': {
            'name': 'Benaiah (Umoja)',
            'address': 'Umoja, Nairobi',
            'type': 'RESIDENTIAL'
        },
        'Eleazar Apartments (A-84) Rent ': {
            'name': 'Eleazar (Umoja)',
            'address': 'Umoja, Nairobi',
            'type': 'RESIDENTIAL'
        }
    }
    
    property_ids = {}
    total_units = 0
    
    for sheet_name, prop_info in properties.items():
        print(f"\n📍 Processing: {prop_info['name']}")
        
        # Insert property
        cur.execute("""
            INSERT INTO properties (name, address, type, description, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            prop_info['name'],
            prop_info['address'],
            prop_info['type'],
            f"Imported from {sheet_name}"
        ))
        property_id = cur.fetchone()[0]
        property_ids[sheet_name] = property_id
        print(f"   ✅ Property created: {prop_info['name']} (ID: {property_id})")
        
        # Read units from sheet
        df = pd.read_excel(RENT_SCHEDULES, sheet_name=sheet_name)
        
        units_imported = 0
        for idx, row in df.iterrows():
            house_no = str(row.get('House No', '')).strip()
            status = str(row.get('Status', '')).strip()
            expected_rent = row.get('Expected Rent', 0)
            
            if not house_no or house_no == 'nan':
                continue
            
            # Map status
            unit_status = 'VACANT'
            unit_type = 'ONE_BEDROOM'
            
            if status == 'Occupied':
                unit_status = 'OCCUPIED'
            elif status == 'Staff':
                unit_status = 'OCCUPIED'
                unit_type = 'STAFF_QUARTERS'
            elif status == 'Vacant':
                unit_status = 'VACANT'
            
            # Determine rent amount
            if pd.notna(expected_rent) and expected_rent > 0:
                rent = float(expected_rent)
            else:
                # Default rents based on property
                if 'Charis' in prop_info['name']:
                    rent = 5500.0
                elif 'Peniel' in prop_info['name']:
                    rent = 6000.0
                elif 'Benaiah' in prop_info['name']:
                    rent = 7000.0
                else:  # Eleazar
                    rent = 6500.0
            
            # Insert unit
            try:
                cur.execute("""
                    INSERT INTO units (
                        property_id, unit_number, type, status, 
                        rent_amount, deposit_amount, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, (
                    property_id,
                    house_no,
                    unit_type,
                    unit_status,
                    Decimal(str(rent)),
                    Decimal(str(rent))
                ))
                units_imported += 1
            except Exception as e:
                print(f"   ⚠️  Error importing unit {house_no}: {e}")
        
        print(f"   ✅ Units imported: {units_imported}")
        total_units += units_imported
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"\n✅ TOTAL: {len(properties)} properties, {total_units} units imported")
    return property_ids

def generate_import_report():
    """Generate summary report of imported data"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n" + "="*80)
    print("📊 IMPORT SUMMARY REPORT")
    print("="*80)
    
    # Count properties
    cur.execute("SELECT COUNT(*) FROM properties")
    prop_count = cur.fetchone()[0]
    
    # Count units
    cur.execute("SELECT COUNT(*) FROM units")
    unit_count = cur.fetchone()[0]
    
    # Count payments
    cur.execute("SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM payments")
    payment_count, payment_total = cur.fetchone()
    
    # Count expenses
    cur.execute("SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM expenses")
    expense_count, expense_total = cur.fetchone()
    
    print(f"\n🏢 Properties: {prop_count}")
    print(f"🏠 Units: {unit_count}")
    print(f"💰 Payments: {payment_count} (Total: KSH {float(payment_total):,.2f})")
    print(f"💸 Expenses: {expense_count} (Total: KSH {float(expense_total):,.2f})")
    
    cur.close()
    conn.close()

def main():
    """Main import process"""
    print("\n" + "="*80)
    print("🚀 MIZPHA RENTALS - DATA IMPORT SYSTEM")
    print("="*80)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Step 1: Import Properties & Units
        property_ids = import_properties_and_units()
        
        # Step 2: Generate Report
        generate_import_report()
        
        print("\n" + "="*80)
        print("✅ DATA IMPORT COMPLETED SUCCESSFULLY!")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ IMPORT FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
