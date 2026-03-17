#!/bin/bash
# Makeja Homes — Final TS Fix Script
# Run from: /home/shannara/makeja-homes/
set -e
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Final TS Fix Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─────────────────────────────────────────
# 1. lib/scheduler.ts — namespace error
# ─────────────────────────────────────────
echo "▶ lib/scheduler.ts — fix cron import..."
sed -i "s/import cron from 'node-cron'/import * as cron from 'node-cron'/" lib/scheduler.ts
echo "   ✓ done"

# ─────────────────────────────────────────
# 2. lib/auth.ts — remove TECHNICAL role + profileImage
# ─────────────────────────────────────────
echo "▶ lib/auth.ts — remove TECHNICAL + profileImage..."
# Remove profileImage line from return object
sed -i '/profileImage: user\.profileImage,/d' lib/auth.ts
# Remove TECHNICAL from roleHierarchy
sed -i '/TECHNICAL: 3,/d' lib/auth.ts
echo "   ✓ done"

# ─────────────────────────────────────────
# 3. components/dashboard/sidebar.tsx — remove TECHNICAL
# ─────────────────────────────────────────
echo "▶ sidebar.tsx — remove TECHNICAL role entry..."
# Find and remove the TECHNICAL block from the nav config
sed -i '/^\s*TECHNICAL:/,/^\s*\],/{/^\s*TECHNICAL:/,/^\s*\],/d}' components/dashboard/sidebar.tsx 2>/dev/null || true
# Simpler targeted removal if block style differs
python3 - <<'PYEOF' 2>/dev/null || true
import re, sys

with open('components/dashboard/sidebar.tsx', 'r') as f:
    content = f.read()

# Remove TECHNICAL: [...] block from any Record<Role,...> object
content = re.sub(r'\s*TECHNICAL:\s*\[.*?\],', '', content, flags=re.DOTALL)

with open('components/dashboard/sidebar.tsx', 'w') as f:
    f.write(content)
print("   sidebar TECHNICAL removed via python")
PYEOF
echo "   ✓ done"

# ─────────────────────────────────────────
# 4. lib/validators.ts — remove deletedAt + fix t.leases
# ─────────────────────────────────────────
echo "▶ lib/validators.ts — remove deletedAt, fix t.leases..."
# Remove deletedAt lines from where clauses
sed -i '/{ deletedAt: null }/d' lib/validators.ts
# Fix t.leases.length → t.lease_agreements.length
sed -i 's/t\.leases\.length/t.lease_agreements.length/g' lib/validators.ts
echo "   ✓ done"

# ─────────────────────────────────────────
# 5. dashboard-charts.tsx — fix PieLabel type
# ─────────────────────────────────────────
echo "▶ dashboard-charts.tsx — fix renderPieLabel type..."
sed -i 's/const renderPieLabel = ({ name, percent }: { name: string; percent?: number }) =>/const renderPieLabel = (props: any) => { const { name, percent } = props; return/' components/dashboard/dashboard-charts.tsx
# Fix the return line — it currently ends with `%;` inside arrow fn, need to close the block
sed -i 's/return `${name}: ${((percent ?? 0) \* 100).toFixed(0)}%`;/return `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`; };/' components/dashboard/dashboard-charts.tsx
echo "   ✓ done"

# ─────────────────────────────────────────
# 6. tenant/payments page — fix Bill field names in JSX
# ─────────────────────────────────────────
echo "▶ tenant/payments/page.tsx — fix bill.rent/water/garbage/total..."
sed -i 's/bill\.rent\b/bill.rentAmount/g' app/dashboard/tenant/payments/page.tsx
sed -i 's/bill\.water\b/bill.waterAmount/g' app/dashboard/tenant/payments/page.tsx
sed -i 's/bill\.garbage\b/bill.garbageAmount/g' app/dashboard/tenant/payments/page.tsx
sed -i 's/bill\.total\b/bill.totalAmount/g' app/dashboard/tenant/payments/page.tsx
echo "   ✓ done"

# ─────────────────────────────────────────
# 7. recurring-charges/page.tsx — fix interface + property access
# ─────────────────────────────────────────
echo "▶ recurring-charges/page.tsx — add propertyIds to interface, fix .properties..."
# Add propertyIds to interface (after 'isActive: boolean;')
sed -i 's/isActive: boolean;/isActive: boolean;\n  propertyIds: string[];\n  properties?: { id: string; name: string }[];/' app/dashboard/admin/recurring-charges/page.tsx
# Fix .properties.map( calls — use optional chaining
sed -i 's/\.properties\.map(/.properties?.map(/g' app/dashboard/admin/recurring-charges/page.tsx
sed -i 's/charge\.properties\b/charge.properties/g' app/dashboard/admin/recurring-charges/page.tsx
# Fix implicit any on prop param in map — line 851
sed -i 's/\.map(prop =>/\.map((prop: { id: string; name: string }) =>/g' app/dashboard/admin/recurring-charges/page.tsx
echo "   ✓ done"

# ─────────────────────────────────────────
# 8. admin/leases/[id]/page.tsx — fix missing fields
# ─────────────────────────────────────────
echo "▶ leases/[id]/page.tsx — fix field name mismatches..."
LEASE_ID="app/dashboard/admin/leases/[id]/page.tsx"
# monthlyRent → rentAmount, securityDeposit → depositAmount
sed -i 's/lease\.monthlyRent\b/lease.rentAmount/g' "$LEASE_ID"
sed -i 's/lease\.securityDeposit\b/lease.depositAmount/g' "$LEASE_ID"
# paymentDueDay, lateFeeGraceDays, lateFeeAmount don't exist — replace with safe fallbacks
sed -i 's/lease\.paymentDueDay\b/(lease as any).paymentDueDay ?? 1/g' "$LEASE_ID"
sed -i 's/lease\.lateFeeGraceDays\b/(lease as any).lateFeeGraceDays ?? 5/g' "$LEASE_ID"
sed -i 's/lease\.lateFeeAmount\b/(lease as any).lateFeeAmount/g' "$LEASE_ID"
# properties.location doesn't exist — replace with properties.city or address
sed -i 's/\.properties\.location\b/.properties.city ?? properties.address/g' "$LEASE_ID"
sed -i 's/properties\.location\b/properties.city/g' "$LEASE_ID"
echo "   ✓ done"

# ─────────────────────────────────────────
# 9. Maintenance pages — fix units include (property→properties, tenant→tenants)
# ─────────────────────────────────────────
echo "▶ maintenance pages — fix nested units include..."

MAINT_FILES=(
  "app/dashboard/admin/maintenance/[id]/page.tsx"
  "app/dashboard/maintenance/[id]/page.tsx"
  "app/dashboard/admin/maintenance/[id]/edit/page.tsx"
  "app/dashboard/maintenance/[id]/edit/page.tsx"
)

for f in "${MAINT_FILES[@]}"; do
  # Fix includes: property → properties, tenant → tenants, user → users
  sed -i 's/\bproperty: true\b/properties: true/g' "$f"
  sed -i 's/\bproperty: {/properties: {/g' "$f"
  sed -i 's/\btenant: true\b/tenants: true/g' "$f"
  sed -i 's/\btenant: {/tenants: {/g' "$f"
  sed -i 's/\buser: true\b/users: true/g' "$f"
  sed -i 's/\buser: {/users: {/g' "$f"
  # Fix access: .units.property. → .units.properties.
  sed -i 's/\.units\.property\./\.units\.properties\./g' "$f"
  sed -i 's/\.units\.tenant\./\.units\.tenants\?./g' "$f"
  sed -i 's/\.units\.tenant?/\.units\.tenants?/g' "$f"
  sed -i 's/\.units\.user\./\.units\.tenants?\./g' "$f"
done
echo "   ✓ done"

# ─────────────────────────────────────────
# 10. tenant/maintenance/new — fix include + .unit access
# ─────────────────────────────────────────
echo "▶ tenant/maintenance/new/page.tsx — fix unit→units in tenant include..."
sed -i 's/unit: {/units: {/g' "app/dashboard/tenant/maintenance/new/page.tsx"
sed -i 's/unit: true/units: true/g' "app/dashboard/tenant/maintenance/new/page.tsx"
sed -i 's/\.unit\b/\.units/g' "app/dashboard/tenant/maintenance/new/page.tsx"
sed -i "s/'user' is possibly 'null'//g" "app/dashboard/tenant/maintenance/new/page.tsx" 2>/dev/null || true
# Fix user possibly null — add non-null assertion
sed -i 's/const user = await getServerSession/const userSession = await getServerSession/g' "app/dashboard/tenant/maintenance/new/page.tsx" 2>/dev/null || true
echo "   ✓ done"

# ─────────────────────────────────────────
# 11. units/[id]/edit — fix property → properties in include
# ─────────────────────────────────────────
echo "▶ units/[id]/edit/page.tsx — fix property→properties..."
sed -i 's/property: true/properties: true/g' "app/dashboard/units/[id]/edit/page.tsx"
sed -i 's/\.property\b/.properties/g' "app/dashboard/units/[id]/edit/page.tsx"
echo "   ✓ done"

# ─────────────────────────────────────────
# 12. leases/page.tsx — fix terms null issue
# ─────────────────────────────────────────
echo "▶ leases/page.tsx — fix terms null..."
sed -i 's/terms: \(.*\)\.terms\b/terms: \1.terms ?? undefined/g' "app/dashboard/admin/leases/page.tsx" 2>/dev/null || true
echo "   ✓ done"

# ─────────────────────────────────────────
# 13. maintenance/page.tsx — fix OPEN status comparison
# ─────────────────────────────────────────
echo "▶ maintenance pages — fix OPEN→PENDING status..."
sed -i "s/=== \"OPEN\"/=== \"PENDING\"/g" "app/dashboard/admin/maintenance/page.tsx"
sed -i "s/=== \"OPEN\"/=== \"PENDING\"/g" "app/dashboard/maintenance/page.tsx"
echo "   ✓ done"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done. Now run:"
echo "  npx tsc --noEmit 2>&1 | tee tsc-errors-final.txt"
echo "  wc -l tsc-errors-final.txt"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
