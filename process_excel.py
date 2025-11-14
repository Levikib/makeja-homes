import pandas as pd
import json

print("Reading Excel file from data folder...")

# Read the Excel file with spaces in the name
excel_file = pd.read_excel("data/Rent Schedules.xlsx", sheet_name=None)

properties = {}

for sheet_name, df in excel_file.items():
    if "Charis" in sheet_name:
        prop_key = "charis"
        prop_name = "CHARIS"
    elif "Peniel" in sheet_name:
        prop_key = "peniel"
        prop_name = "PENIEL"
    elif "Benaiah" in sheet_name:
        prop_key = "benaiah"
        prop_name = "BENAIAH"
    elif "Eleazar" in sheet_name:
        prop_key = "eleazar"
        prop_name = "ELEAZAR"
    else:
        continue
    
    units = []
    for idx, row in df.iterrows():
        if pd.notna(row.get("House No")):
            unit_number = str(row["House No"]).replace(".0", "")
            status = "OCCUPIED" if "occupied" in str(row.get("Status", "")).lower() else "VACANT"
            rent = float(row.get("Expected Rent", 0)) if pd.notna(row.get("Expected Rent")) else 0
            
            units.append({
                "unitNumber": unit_number,
                "type": "TENANCY",
                "status": status,
                "floor": "Ground",
                "rentAmount": rent
            })
    
    properties[prop_key] = {
        "info": {"name": prop_name},
        "units": units
    }
    print(f"Found {len(units)} units for {prop_name}")

with open("units-data.json", "w") as f:
    json.dump(properties, f, indent=2)

print("Data saved to units-data.json")
