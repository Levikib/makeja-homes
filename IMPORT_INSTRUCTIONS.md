# Excel Data Import Instructions

## 📊 What This Imports

**4 Buildings with 163 Total Units:**

| Building | Units | Occupied | Vacant | Staff | Shop |
|----------|-------|----------|--------|-------|------|
| CHARIS (Kasarani) | 37 | 30 | 5 | 2 | 0 |
| PENIEL (Ngumba) | 37 | 31 | 5 | 1 | 0 |
| BENAIAH (Umoja) | 31 | 23 | 4 | 2 | 2 |
| ELEAZAR (Umoja) | 58 | 46 | 3 | 1 | 8 |
| **TOTAL** | **163** | **130** | **17** | **6** | **10** |

---

## 🚀 How to Run the Import

### STEP 1: Copy files to your project

In WSL/Ubuntu terminal:

```bash
cd ~/mizpharentals

# Download the files from Claude and copy them here
# You should have:
# - import-all-buildings.js
# - buildings_data.json
```

### STEP 2: Run the import

```bash
node import-all-buildings.js
```

### STEP 3: Expected Output

You should see:

```
🚀 Starting COMPLETE Excel data import...
📋 Importing 4 buildings with 163 units total

✓ Loaded 163 units from Excel
✓ Found properties:
  - CHARIS
  - PENIEL
  - BENAIAH
  - ELEAZAR

============================================================
🏢 CHARIS (Charis (Kasarani))
============================================================
  ✓ G1 (Occupied)
    ↳ Tenant: tenant.charis.g1@mizpha.com
  ✓ G2 (Occupied)
    ↳ Tenant: tenant.charis.g2@mizpha.com
  ...

============================================================
✅ IMPORT COMPLETE!
============================================================
📦 Total Units Created: 163
👥 Total Tenants Created: 130
```

---

## 🔐 Login Credentials After Import

### Admin Access
- Email: `admin@mizpha.com`
- Password: `admin123`

### Tenant Access
- Password for ALL tenants: `tenant123`
- Email format: `tenant.[building].[unit]@mizpha.com`

**Examples:**
- `tenant.charis.g1@mizpha.com` / `tenant123`
- `tenant.peniel.a1@mizpha.com` / `tenant123`
- `tenant.benaiah.101@mizpha.com` / `tenant123`
- `tenant.eleazar.201@mizpha.com` / `tenant123`

---

## ⚠️ Default Values Used

The script uses these defaults (you can edit later in admin panel):

- **Rent Amount:** KSH 15,000 per unit
- **Deposit Amount:** KSH 15,000 per unit
- **Move-in Date:** January 1, 2024
- **Bedrooms:** 1 per unit (0 for shops)
- **Bathrooms:** 1 per unit

---

## 🎯 After Import - Verify

1. **Login** → http://localhost:3000
2. **Dashboard** → Should show:
   - 4 Properties
   - 163 Total Units
   - 130 Tenants
   - Occupancy charts updated

3. **Properties Page** → Click each building to see units
4. **Tenants Page** → Should list 130 tenants
5. **Units Page** → Should show all 163 units

---

## 🐛 Troubleshooting

**If you get "buildings_data.json not found":**
```bash
# Make sure the JSON file is in the same directory
ls -l buildings_data.json
```

**If you get "Admin user not found":**
```bash
# Run the seed first
npm run seed
```

**If you get Prisma errors:**
```bash
# Regenerate Prisma client
npx prisma generate
```

---

## 📝 Next Steps After Import

1. ✅ **Update Rent Amounts** → Edit units in admin panel with actual rent
2. ✅ **Add Tenant Details** → Add names, phones, IDs for actual tenants
3. ✅ **Create Leases** → Generate lease agreements for occupied units
4. ✅ **Test Tenant Login** → Login as a tenant to verify portal works
5. ✅ **Add Payment Records** → Record past payments if needed

---

## 💡 Tips

- **Staff Units:** These are imported as occupied but have no tenant record
- **Shop Units:** Imported as SHOP type, marked as occupied
- **Vacant Units:** Ready for new tenant assignment
- **Tenant Emails:** Change these to real emails when you have actual tenant info

---

**Questions? Check the main README or contact support.**
