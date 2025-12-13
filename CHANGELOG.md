# Changelog

All notable changes to Mizpha Rentals will be documented in this file.

## [1.0.0-alpha] - 2024-12-13

### System Overview
- **5 Properties** managed across Nairobi
- **171 Units** total (136 occupied, 34 vacant)
- **KSH 1,198,000** monthly revenue
- **132 Active Tenants**
- **79.53% Occupancy Rate**

### Added During Testing Phase

#### New Property
- **Malindi Heights** (Westlands)
  - 8 premium units
  - KSH 360,000 monthly revenue
  - Highest rent units in system (BB3: KSH 100,000)
  - Unit types: Penthouse, Three-Bedroom, Office, Warehouse, Studio
  - Created: December 3, 2024

#### Recent Activity (Last 7 Days)
- 7 new tenants created
- 3 new units added
- 7 lease agreements created
- 1 tenant vacated successfully

### Fixed

#### [CRITICAL] Tenant History Support - Dec 12, 2024
**Problem:** 
- `unitId` had `@unique` constraint in `tenants` table
- Prevented assigning new tenant to previously occupied unit
- Error: "Unique constraint failed on the fields: (unitId)"

**Solution:**
- Removed `@unique` constraint from `tenants.unitId`
- Changed `units.tenants` relationship from one-to-one to one-to-many
- Updated all queries to filter current tenants by `leaseEndDate >= NOW()`
- Historical tenant records now preserved

**Impact:**
- 6 historical tenant records preserved
- Full audit trail for compliance
- Better reporting capabilities

**Test Case:**
- Unit AA3: Successfully reassigned from Pharis Ihaki (vacated) to Grace Wanja (current)

#### Property Details Display - Dec 13, 2024
**Problem:** Unit cards showing historical tenants instead of current tenants

**Solution:** Updated server-side query to filter tenants:
```typescript
tenants: {
  where: {
    leaseEndDate: { gte: new Date() }
  }
}
```

**Impact:** Property pages now correctly show only current tenants

### Database Statistics

#### Current State (Dec 13, 2024)
```json
{
  "properties": 5,
  "units": 171,
  "occupied_units": 136,
  "vacant_units": 34,
  "current_tenants": 132,
  "historical_tenants": 6,
  "total_leases": 138,
  "active_leases": 136,
  "monthly_revenue": 1198000,
  "occupancy_rate": 79.53,
  "database_size": "9.9 MB"
}
```

#### Top Revenue Units
1. BB3 (Malindi Heights) - Alex Karanja - KSH 100,000/month (Penthouse)
2. BB4 (Malindi Heights) - Pharis Muriuki - KSH 90,000/month (Penthouse)
3. AA2 (Malindi Heights) - Lilian Njeri - KSH 85,000/month (Penthouse)

#### Properties Breakdown
| Property | Units | Occupied | Vacant | Monthly Revenue | Occupancy % |
|----------|-------|----------|--------|-----------------|-------------|
| Malindi Heights | 8 | 6 | 1 | KSH 360,000 | 75.00% |
| Eleazar (Umoja) | 58 | 46 | 12 | KSH 299,000 | 79.31% |
| Peniel (Ngumba) | 37 | 31 | 6 | KSH 205,000 | 83.78% |
| Charis (Kasarani) | 37 | 30 | 7 | KSH 173,000 | 81.08% |
| Benaiah (Umoja) | 31 | 23 | 8 | KSH 161,000 | 74.19% |

### Known Issues

#### Expiring Leases (Action Required)
- 10+ tenants with leases expiring in next 30 days
- No automated reminder system yet
- Manual tracking required

#### Missing Modules
- **Payments System**: 0 payment records (CRITICAL for KSH 1.2M monthly revenue)
- **Expenses Tracking**: No expense records
- **Inventory Management**: No inventory items tracked
- **Purchase Orders**: No PO system implemented

### Security
- NextAuth.js authentication implemented
- bcrypt password hashing
- Role-based access control (6 roles)
- Session management active

### Performance
- Database size: 9.9 MB
- 18 database tables
- Average page load: <2s
- Real-time stats updates

### Technical Debt
- Payment gateway integration needed (Paystack)
- Lease renewal automation needed
- Email notification system needed
- Receipt generation needed
- Expense categorization UI needed

## [Unreleased]

### Planned Features
- Payment recording and tracking
- Paystack M-Pesa integration
- Automated lease renewal workflows
- Email/SMS notifications
- PDF receipt generation
- Expense management
- Inventory tracking
- Advanced reporting and analytics

### Planned Fixes
- Lease expiry reminder system
- Bulk operations for lease renewals
- Payment reconciliation tools

---

## Version History

- **1.0.0-alpha** (2024-12-13): Initial production-ready alpha with tenant history support
- **0.9.0** (2024-12-03): Core features complete, testing phase
- **0.1.0** (2024-11-30): Initial development start

---

For detailed development context, see `DEVELOPMENT_CONTEXT.md`  
For audit trail, see `system_audit.txt`
