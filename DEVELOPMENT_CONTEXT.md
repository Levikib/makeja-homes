# Mizpha Rentals - Development Context

## 🏢 Project Overview
Property management system for **5 properties, 171 units** in Nairobi, Kenya.

**Properties:**
- **Malindi Heights** (Westlands) - 8 units - KSH 360,000/month ⭐ Premium property
- Charis (Kasarani) - 37 units - KSH 173,000/month
- Peniel (Ngumba) - 37 units - KSH 205,000/month
- Eleazar (Umoja) - 58 units - KSH 299,000/month
- Benaiah (Umoja) - 31 units - KSH 161,000/month

**Total Monthly Revenue:** KSH 1,198,000  
**Occupancy Rate:** 79.53% (136 occupied / 171 total)  
**Active Tenants:** 132 (with 6 historical tenant records)

**Developer:** Levo (leviskibirie2110@gmail.com)  
**Repository:** https://github.com/Levikib/mizpha-rentals  
**Last Updated:** December 13, 2024

---

## ✅ COMPLETED FEATURES (Dec 2024)

### 1. Core Property Management
- Multi-property dashboard with real-time stats
- **5 properties managed** (added Malindi Heights during testing)
- **171 units** imported from Excel + manual additions
- Property types: Residential, Premium (Penthouses, Offices)
- Status tracking: VACANT, OCCUPIED, MAINTENANCE, RESERVED

### 2. Tenant Management ⭐ CRITICAL FIX APPLIED
**Problem Solved:** Units couldn't have multiple tenants over time  
**Solution:** Removed `@unique` constraint on `tenants.unitId`
- Now supports full tenant history per unit
- Current tenant = `WHERE leaseEndDate >= NOW()`
- Historical tenants preserved for auditing
- **132 active tenants, 6 historical records**

### 3. Lease Agreements
- Auto-created when tenant assigned
- Statuses: DRAFT, ACTIVE, EXPIRED, TERMINATED, CANCELLED
- **138 total leases** (136 active, 2 terminated)
- Linked to both unit and tenant

### 4. Vacate Workflow
- Updates `leaseEndDate` to current date
- Sets lease status to TERMINATED
- Changes unit status to VACANT
- **Preserves all historical data**
- Tested successfully (1 vacate in last 7 days)

### 5. Futuristic UI/UX
- Sci-fi theme with cyan/magenta/purple gradients
- Animated dashboard gauges (Framer Motion)
- Real-time occupancy tracking (79.53%)
- Responsive mobile design
- Property/unit filtering and search

### 6. Recent Activity (Last 7 Days)
- ✅ 7 new tenants created
- ✅ 3 new units added
- ✅ 7 lease agreements created
- ✅ 1 tenant vacated successfully

---

## 🚧 INCOMPLETE MODULES (Priority Order)

### Priority 1: PAYMENTS SYSTEM 💰 **CRITICAL**
**Schema Exists:** Yes  
**Records:** 0 payments (completely empty)  
**UI/Logic:** None

**Must Build:**
- [ ] Payment recording interface
- [ ] Paystack integration (Kenya M-Pesa)
- [ ] Rent arrears tracking (critical with KSH 1.2M/month)
- [ ] Auto-calculate late fees
- [ ] Payment reminders (SMS/Email)
- [ ] Receipt generation (PDF)
- [ ] Payment history per tenant
- [ ] Arrears dashboard (10+ tenants with expiring leases)

**Urgency:** HIGH - Managing KSH 1.2M monthly revenue manually is unsustainable

**Database Tables:**
- `payments` (0 records - needs implementation)
- `payment_type`: RENT, DEPOSIT, UTILITY, MAINTENANCE, LATE_FEE
- `payment_status`: PENDING, COMPLETED, FAILED, VERIFIED

### Priority 2: LEASE MANAGEMENT ENHANCEMENTS
**Current:** Basic functionality working (138 leases tracked)  
**Issue:** 10+ leases expiring in next 30 days with no alerts

**Needs:**
- [ ] Lease renewal workflow
- [ ] Auto-reminders (30/60/90 days before expiry) - **URGENT**
- [ ] Lease templates
- [ ] Bulk lease operations
- [ ] Rent escalation calculator

**Critical:** Several tenants have leases expiring Dec 2025 - Jan 2026

### Priority 3: EXPENSES & PURCHASE ORDERS
**Schema Exists:** Partial  
**Records:** None

**Needs:**
- [ ] Expense categorization UI
- [ ] Receipt upload to cloud storage
- [ ] Purchase order approval workflow
- [ ] Supplier management
- [ ] Budget tracking per property (5 properties need individual budgets)
- [ ] Monthly expense reports

### Priority 4: INVENTORY MANAGEMENT
**Schema Exists:** Yes  
**Records:** None

**Needs:**
- [ ] Stock movement tracking
- [ ] Low stock alerts
- [ ] Supplier linking
- [ ] Item usage history
- [ ] Maintenance supply requests

---

## 🗄️ DATABASE DETAILS

**PostgreSQL Database:** `mizpharentals`  
**User:** `mizpha`  
**Location:** localhost:5432  
**Size:** 9.9 MB (9916 kB)  
**Tables:** 18 models

### Current Data Statistics:
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
  "occupancy_rate": 79.53
}
```

### Key Schema Notes:

**CRITICAL CHANGE (Dec 12, 2024):**
```prisma
// BEFORE (Wrong - prevented tenant history):
model tenants {
  unitId String @unique  // ❌ Only one tenant per unit ever
}

// AFTER (Correct - allows history):
model tenants {
  unitId String  // ✅ Multiple tenants per unit over time
}

model units {
  tenants tenants[]  // ✅ One-to-many relationship
}
```

**Query Pattern for Current Tenant:**
```typescript
const currentTenant = await prisma.tenants.findFirst({
  where: {
    unitId: unitId,
    leaseEndDate: { gte: new Date() }  // Lease not expired
  },
  orderBy: { leaseStartDate: 'desc' }
});
```

### Database Models (18 tables):
- **properties** (5 records)
- **units** (171 records)
- **users** (role-based auth)
- **tenants** (138 records: 132 active + 6 historical)
- **lease_agreements** (138 records: 136 active + 2 terminated)
- **payments** (0 records - **NEEDS IMPLEMENTATION**)
- expenses (schema only)
- inventory_items (schema only)
- purchase_orders (schema only)
- maintenance_requests
- water_readings
- security_deposits
- damage_assessments
- vacate_notices
- activity_logs
- renovation_items
- renovation_plans
- payment_plans

---

## 🛠️ TECH STACK

**Framework:** Next.js 14.2.33  
**Language:** TypeScript  
**Styling:** Tailwind CSS + Shadcn/ui  
**ORM:** Prisma 5.22.0  
**Database:** PostgreSQL 14+  
**Auth:** NextAuth.js (basic implementation)  
**Animations:** Framer Motion  
**Payments:** Paystack (not yet integrated)

**Development Environment:**
- WSL (Windows Subsystem for Linux)
- VSCode
- Claude Code CLI (for rapid development)

---

## 📂 KEY FILE LOCATIONS

### Core Pages:
- `/app/dashboard/page.tsx` - Main dashboard with animated stats
- `/app/dashboard/properties/[id]/page.tsx` - Property details
- `/app/dashboard/properties/[id]/PropertyClient.tsx` - Units grid
- `/app/dashboard/properties/[id]/units/[unitId]/page.tsx` - Unit details
- `/app/dashboard/admin/tenants/new/page.tsx` - Tenant creation form

### API Routes:
- `/app/api/tenants/route.ts` - Tenant CRUD
- `/app/api/tenants/[id]/vacate/route.ts` - Vacate workflow
- `/app/api/properties/route.ts` - Property operations
- `/app/api/units/route.ts` - Unit operations
- `/app/api/payments/route.ts` - **EMPTY - needs implementation**

### Database:
- `/prisma/schema.prisma` - Database schema
- `/prisma/migrations/` - Migration history

---

## 🐛 CRITICAL BUGS FIXED

### 1. Tenant History Bug (Dec 12, 2024) ⭐ MAJOR FIX
**Problem:** `unitId @unique` prevented multiple tenants per unit  
**Impact:** Couldn't assign new tenant to previously occupied unit  
**Error:** `Unique constraint failed on the fields: (unitId)`

**Solution:** 
- Removed `@unique` constraint from `tenants.unitId`
- Changed `units.tenants` from one-to-one to one-to-many
- Updated all queries to filter by `leaseEndDate >= NOW()`
- Tested successfully: Unit AA3 now has Grace Wanja (current) + Pharis Ihaki (historical)

### 2. Prisma Array Handling (Dec 4, 2024)
**Problem:** `unit.tenants` returned object instead of array  
**Solution:** Always wrap in array check:
```typescript
let tenantsArray = Array.isArray(unit.tenants) 
  ? unit.tenants 
  : (unit.tenants ? [unit.tenants] : []);
```

### 3. Date Conversion (Dec 3, 2024)
**Problem:** HTML date inputs sent strings, Prisma needed Date objects  
**Solution:** `new Date(data.leaseStartDate)` before Prisma create

### 4. Schema Field Mismatch (Dec 11, 2024)
**Problem:** `lease_agreements` expected `rentAmount` but API sent `monthlyRent`  
**Solution:** Updated API to use correct field names

---

## 🎨 DESIGN PHILOSOPHY

### Color Scheme:
- Primary: Cyan (#06b6d4)
- Secondary: Magenta (#ec4899)
- Accent: Purple (#a855f7)
- Background: Dark gray (#1f2937)
- Text: White/Gray

### Animation Principles:
- Smooth transitions (300ms)
- Pulsing indicators for active items
- Gradient backgrounds on hover
- Framer Motion for page transitions
- Real-time stat updates

### UI Components (Shadcn):
- Button, Card, Dialog, Table
- Form, Input, Select
- Badge, Alert Dialog
- Custom CircularProgress component
- Animated stat cards

---

## 🚀 SAAS ROADMAP

### Phase 1: Complete Core Features (Q1 2025)
**Target:** Fully functional single-tenant system

- [ ] **Payments system** (CRITICAL - KSH 1.2M/month needs tracking)
- [ ] Lease renewal workflows
- [ ] Basic reporting & analytics
- [ ] Email notifications for lease expiry
- [ ] Receipt generation

**Success Metric:** Manage Mizpha's 5 properties end-to-end without manual intervention

### Phase 2: Multi-Tenancy Architecture (Q2 2025)
**Target:** Convert to SaaS platform

- [ ] Database-per-tenant architecture
- [ ] Signup/onboarding flow
- [ ] Subscription billing (Stripe/Paystack)
- [ ] White-label options
- [ ] API for integrations

**Success Metric:** 5-10 paying customers

### Phase 3: Domain & Launch (Q3 2025)
**Target:** Public launch

**Domain Options:**
- mizpharentals.com ⭐ (Primary choice)
- mizpha.io (Modern, tech-focused)
- mizpha.app (SaaS-friendly)
- rentalmizpha.com
- managemizpha.com

**Pricing Tiers:**
- **Basic** ($49/mo): Up to 50 units, 3 properties, basic reporting
- **Pro** ($99/mo): Up to 200 units, unlimited properties, payments, analytics
- **Enterprise** ($249/mo): Unlimited units, white-label, API access, dedicated support

**Success Metric:** $1,000+ MRR

### Phase 4: Scale & Expand (Q4 2025)
- [ ] Mobile apps (React Native)
- [ ] Advanced ML analytics
- [ ] Multi-currency support
- [ ] Expand to West Africa markets

**Success Metric:** 100+ customers, $10K+ MRR

---

## 📝 DEVELOPMENT NOTES

### Best Practices:
1. **Always use server components** for data fetching
2. **Client components** only for interactivity
3. **API routes** for all mutations
4. **Prisma transactions** for multi-step operations
5. **Role-based auth** via `requireRole()` helper

### Common Patterns:
```typescript
// Server component data fetching:
const property = await prisma.properties.findUnique({
  where: { id: params.id },
  include: {
    units: {
      include: {
        tenants: {
          where: { leaseEndDate: { gte: new Date() } }  // Current only
        }
      }
    }
  }
});

// API mutation:
export async function POST(request: NextRequest) {
  await requireRole(["ADMIN", "MANAGER"]);
  const data = await request.json();
  const result = await prisma.model.create({ data });
  return NextResponse.json(result);
}
```

### Testing Data:
- Real data imported from `data/Rent Schedules.xlsx`
- 5 properties with actual unit numbers
- Malindi Heights added manually during testing
- Test credentials: admin@mizpha.com / admin123

---

## 🔐 SECURITY NOTES

### Current Auth:
- NextAuth.js with credentials provider
- Password hashing with bcrypt
- Session-based authentication
- Role validation on API routes

### Todo:
- [ ] Email verification
- [ ] Password reset flow
- [ ] 2FA for admin accounts
- [ ] API rate limiting
- [ ] HTTPS enforcement (production)

---

## 📊 SUCCESS METRICS

### Current Stats (Dec 13, 2024):
- **5 properties** managed
- **171 units** tracked
- **79.53% occupancy** rate
- **KSH 1,198,000** monthly revenue potential
- **132 active tenants**
- **138 lease agreements**

### Growth Indicators:
- +1 property added (Malindi Heights - premium segment)
- +8 units added in last 7 days
- +7 new tenants in last 7 days
- System handling 100K+ rent penthouses successfully

### Target (6 months):
- 10+ client companies
- 1,000+ units under management
- $5K MRR
- 90%+ customer retention

---

## 🤝 COLLABORATION

**Primary Developer:** Levo (leviskibirie2110@gmail.com)  
**GitHub:** https://github.com/Levikib/mizpha-rentals

**For New Contributors:**
1. Clone repo
2. Install dependencies: `npm install`
3. Setup database (see README.md)
4. Run migrations: `npx prisma migrate deploy`
5. Start dev server: `npm run dev`

**Branch Strategy:**
- `main` - Production-ready code
- `develop` - Active development
- `feature/*` - New features
- `fix/*` - Bug fixes

---

## 📞 SUPPORT & CONTACT

**Email:** leviskibirie2110@gmail.com  
**GitHub Issues:** https://github.com/Levikib/mizpha-rentals/issues  
**Working Hours:** UTC+3 (Nairobi, Kenya)

---

**Last Updated:** December 13, 2024  
**Version:** 1.0.0-alpha  
**Database Audit:** See `system_audit.txt` for detailed breakdown
