#!/bin/bash
# Makeja Homes — TypeScript Build Error Fix Script
# Groups A–E: ~75 errors fixed mechanically
# Run from: /home/shannara/makeja-homes/
# Usage: bash fix-errors.sh

set -e
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Makeja Homes — TS Error Fix Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ────────────────────────────────────────────
# GROUP A: Prisma model name fixes
# ────────────────────────────────────────────
echo ""
echo "▶ Group A: Prisma model names..."

# lib/auth.ts
sed -i 's/prisma\.user\b/prisma.users/g' lib/auth.ts

# lib/validators.ts
sed -i 's/prisma\.leases\b/prisma.lease_agreements/g' lib/validators.ts
sed -i "s/include: { leases:/include: { lease_agreements:/g" lib/validators.ts
sed -i "s/leases: {/lease_agreements: {/g" lib/validators.ts

# app/api/water-readings/route.ts
sed -i 's/prisma\.waterReadings\b/prisma.water_readings/g' app/api/water-readings/route.ts

# app/dashboard/units/[id]/edit/page.tsx
sed -i 's/prisma\.unit\b/prisma.units/g' "app/dashboard/units/[id]/edit/page.tsx"

# app/dashboard/tenant/maintenance/new/page.tsx
sed -i 's/prisma\.tenant\b/prisma.tenants/g' "app/dashboard/tenant/maintenance/new/page.tsx"

# scripts (don't affect Vercel build but clean them up)
sed -i 's/prisma\.user\b/prisma.users/g' scripts/reset-admin.ts 2>/dev/null || true
sed -i 's/prisma\.tenant\b/prisma.tenants/g' scripts/migrate-deposits.ts 2>/dev/null || true
sed -i 's/prisma\.securityDeposit\b/prisma.security_deposits/g' scripts/migrate-deposits.ts 2>/dev/null || true

echo "   ✓ auth.ts, validators.ts, water-readings, units/edit, tenant/maintenance"

# ────────────────────────────────────────────
# GROUP B+C: Maintenance relation name fixes
# unit → units in include AND in result access
# ────────────────────────────────────────────
echo ""
echo "▶ Group B+C: Maintenance unit→units + relation renames..."

MAINT_DETAIL=(
  "app/dashboard/admin/maintenance/[id]/page.tsx"
  "app/dashboard/maintenance/[id]/page.tsx"
)

MAINT_EDIT=(
  "app/dashboard/admin/maintenance/[id]/edit/page.tsx"
  "app/dashboard/maintenance/[id]/edit/page.tsx"
)

# Fix include key: unit → units (in include object literals)
for f in "${MAINT_DETAIL[@]}" "${MAINT_EDIT[@]}"; do
  sed -i 's/\bunit: true\b/units: true/g' "$f"
  sed -i 's/\bunit: {/units: {/g' "$f"
done

# Fix result property access: .unit. → .units. (only dot-unit-dot, not unitId)
for f in "${MAINT_DETAIL[@]}"; do
  sed -i 's/\.unit\./\.units\./g' "$f"
done

# Fix assignedTo relation name in includes
for f in "${MAINT_DETAIL[@]}"; do
  sed -i 's/\bassignedTo: true\b/users_maintenance_requests_assignedToIdTousers: true/g' "$f"
  sed -i 's/\bassignedTo: {/users_maintenance_requests_assignedToIdTousers: {/g' "$f"
done

# Fix createdBy relation name in includes
for f in "${MAINT_DETAIL[@]}"; do
  sed -i 's/\bcreatedBy: true\b/users_maintenance_requests_createdByIdTousers: true/g' "$f"
  sed -i 's/\bcreatedBy: {/users_maintenance_requests_createdByIdTousers: {/g' "$f"
done

# Fix property access: .assignedTo. and .assignedTo?. in JSX/TS
for f in "${MAINT_DETAIL[@]}"; do
  sed -i 's/\.assignedTo?\./\.users_maintenance_requests_assignedToIdTousers?\./g' "$f"
  sed -i 's/\.assignedTo\./\.users_maintenance_requests_assignedToIdTousers\./g' "$f"
  sed -i 's/\.assignedTo\b/\.users_maintenance_requests_assignedToIdTousers/g' "$f"
done

# Fix property access: .createdBy. in JSX/TS
for f in "${MAINT_DETAIL[@]}"; do
  sed -i 's/\.createdBy?\./\.users_maintenance_requests_createdByIdTousers?\./g' "$f"
  sed -i 's/\.createdBy\./\.users_maintenance_requests_createdByIdTousers\./g' "$f"
  sed -i 's/\.createdBy\b/\.users_maintenance_requests_createdByIdTousers/g' "$f"
done

echo "   ✓ 4 maintenance files patched"

# ────────────────────────────────────────────
# GROUP D: UserRole → Role
# ────────────────────────────────────────────
echo ""
echo "▶ Group D: UserRole → Role..."

sed -i 's/\bUserRole\b/Role/g' lib/auth.ts
sed -i 's/\bUserRole\b/Role/g' components/dashboard/dashboard-layout.tsx
sed -i 's/\bUserRole\b/Role/g' components/dashboard/sidebar.tsx

echo "   ✓ auth.ts, dashboard-layout.tsx, sidebar.tsx"

# ────────────────────────────────────────────
# GROUP E: Missing packages + wrong import paths
# ────────────────────────────────────────────
echo ""
echo "▶ Group E: Installing missing packages..."

npm install @radix-ui/react-toast --legacy-peer-deps --silent
npm install --save-dev @types/node-cron --silent

# Fix wrong import path: components/hooks/use-toast → hooks/use-toast
sed -i "s|@/components/hooks/use-toast|@/hooks/use-toast|g" components/ui/toaster.tsx

echo "   ✓ @radix-ui/react-toast installed, @types/node-cron installed"
echo "   ✓ toaster.tsx import path fixed"

# ────────────────────────────────────────────
# BONUS MECHANICAL FIXES (high confidence)
# ────────────────────────────────────────────
echo ""
echo "▶ Bonus: Other high-confidence mechanical fixes..."

# switch-unit route: result.depositAmount possibly null
sed -i 's/result\.depositAmount\.toLocaleString()/(result.depositAmount ?? 0).toLocaleString()/g' "app/api/tenants/[id]/switch-unit/route.ts"

# leases/page.tsx: contractSignedBy → contractSignedAt
sed -i 's/\.contractSignedBy\b/.contractSignedAt/g' "app/dashboard/admin/leases/page.tsx"

# api/units/[id]/route.ts: property → properties in include
sed -i "s/\bproperty: true\b/properties: true/g" "app/api/units/[id]/route.ts"
sed -i "s/\bproperty: {/properties: {/g" "app/api/units/[id]/route.ts"

# auth-helpers.ts: user possibly null
sed -i "s/user\.role\b/user!.role/g" lib/auth-helpers.ts 2>/dev/null || true

# dashboard-charts.tsx: percent possibly undefined
sed -i 's/\bpercent\b/(percent ?? 0)/g' components/dashboard/dashboard-charts.tsx 2>/dev/null || true

# leases/page.tsx: terms null not assignable to string | undefined
# null IS assignable to undefined via ?? but not directly, cast via || undefined
sed -i 's/: terms\b/: terms ?? undefined/g' "app/dashboard/admin/leases/page.tsx" 2>/dev/null || true

# maintenance pages: category string|null → string
for f in "app/dashboard/admin/maintenance/page.tsx" "app/dashboard/maintenance/page.tsx"; do
  sed -i 's/category: \([a-zA-Z_]*\.category\)\b/category: \1 ?? "GENERAL"/g' "$f" 2>/dev/null || true
done

# tenants/page.tsx: phoneNumber string|null → string
sed -i 's/phoneNumber: \([a-zA-Z_]*\.phoneNumber\)\b/phoneNumber: \1 ?? ""/g' "app/dashboard/admin/tenants/page.tsx" 2>/dev/null || true

echo "   ✓ Bonus fixes applied"

# ────────────────────────────────────────────
# SUMMARY
# ────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Script complete. Now run:"
echo "  npx tsc --noEmit 2>&1 | tee tsc-errors-2.txt"
echo "  wc -l tsc-errors-2.txt"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Remaining errors will be in Groups F–I:"
echo "  F: Decimal → number (need interface files)"
echo "  G: Schema field mismatches (need schema)"
echo "  H: null → string coercions"
echo "  I: Component prop mismatches"
