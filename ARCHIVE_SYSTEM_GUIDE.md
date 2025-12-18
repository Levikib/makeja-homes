# Archive System - Data Preservation Guide

## Philosophy
The system NEVER deletes tenant/lease data. Instead, it uses status flags to maintain complete audit trails.

## When Property is Archived

### What Happens:
1. **Property:** `deletedAt` set (soft delete)
2. **Units:** `deletedAt` set (soft delete)
3. **Tenants:** Preserved! User account set to `isActive = false`
4. **Leases:** Status changed to `TERMINATED`, `deletedAt` set
5. **Payments:** Fully preserved (untouched)

### Why This Approach?
- ✅ **Legal Compliance:** Keep records for tax/legal purposes
- ✅ **Audit Trail:** See who lived where historically
- ✅ **Payment History:** Critical for accounting
- ✅ **Dispute Resolution:** Access historical lease terms
- ✅ **Business Intelligence:** Analyze long-term trends

## Filtering Active Records

### For Dashboard Statistics:
```typescript
// Active tenants only
const activeTenants = await prisma.users.count({
  where: {
    role: "TENANT",
    isActive: true, // Key filter
  },
});

// Active leases only
const activeLeases = await prisma.lease_agreements.count({
  where: {
    status: "ACTIVE", // Key filter
    deletedAt: null,
  },
});

// Active units only
const activeUnits = await prisma.units.count({
  where: {
    deletedAt: null, // Key filter
  },
});
```

### For Tenant List Page:
```typescript
// Show only active tenants
const tenants = await prisma.tenants.findMany({
  where: {
    users: {
      isActive: true, // Key filter
    },
  },
  include: {
    users: true,
    units: {
      where: { deletedAt: null }, // Only active units
    },
  },
});
```

### For Lease List Page:
```typescript
// Show only active leases
const leases = await prisma.lease_agreements.findMany({
  where: {
    status: "ACTIVE", // Key filter
    deletedAt: null,
  },
});
```

## Historical Reports

### To Get ALL Records (including archived):
```typescript
// All tenants ever (for audit/reporting)
const allTenants = await prisma.users.findMany({
  where: { role: "TENANT" },
  // No isActive filter - shows all
});

// All leases ever
const allLeases = await prisma.lease_agreements.findMany({
  // No status filter - shows all
});
```

## Benefits

1. **15+ Year Data Retention:** All records accessible forever
2. **Regulatory Compliance:** Meet audit requirements
3. **Historical Analysis:** Trends over decades
4. **Dispute Resolution:** Access any historical record
5. **Financial Audits:** Complete payment history
6. **No Data Loss:** Nothing ever truly deleted

## Best Practices

- Always filter by `isActive` for current tenants
- Always filter by `status = 'ACTIVE'` for current leases
- Always filter by `deletedAt = null` for current units/properties
- Create separate "Archive" or "History" views for historical data
- Never use hard deletes (DELETE) on tenant/lease/payment tables
