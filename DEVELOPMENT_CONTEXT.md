# Mizpha Rentals - Development Context

## 🏢 Project Overview
Property management system for 4 properties, 163 units in Nairobi, Kenya.

**Properties:**
- Charis (Kasarani)
- Peniel (Ngumba)
- Eleazar (Umoja)
- Benaiah (Umoja)

**Developer:** Levo (leviskibirie2110@gmail.com)
**Repository:** https://github.com/Levikib/mizpha-rentals

---

## ✅ COMPLETED FEATURES (Dec 2024)

### 1. Core Property Management
- Multi-property dashboard with real-time stats
- Unit CRUD operations (163 units imported from Excel)
- Property types: Residential (Tenancy, Staff Quarters, Shops)
- Status tracking: VACANT, OCCUPIED, MAINTENANCE, RESERVED

### 2. Tenant Management ⭐ CRITICAL FIX
**Problem Solved:** Units couldn't have multiple tenants over time
**Solution:** Removed `@unique` constraint on `tenants.unitId`
- Now supports full tenant history per unit
- Current tenant = `WHERE leaseEndDate >= NOW()`
- Historical tenants preserved for auditing

### 3. Lease Agreements
- Auto-created when tenant assigned
- Statuses: DRAFT, ACTIVE, EXPIRED, TERMINATED, CANCELLED
- Linked to both unit and tenant

### 4. Vacate Workflow
- Updates `leaseEndDate` to current date
- Sets lease status to TERMINATED
- Changes unit status to VACANT
- **Preserves all historical data**

### 5. Futuristic UI/UX
- Sci-fi theme with cyan/magenta/purple gradients
- Animated dashboard gauges (Framer Motion)
- Real-time occupancy tracking
- Responsive mobile design

---

## 🚧 INCOMPLETE MODULES (Priority Order)

### Priority 1: PAYMENTS SYSTEM 💰 **CRITICAL**
**Schema Exists:** Yes
**UI/Logic:** None

**Must Build:**
- [ ] Payment recording interface
- [ ] Paystack integration (Kenya M-Pesa)
- [ ] Rent arrears tracking
- [ ] Auto-calculate late fees
- [ ] Payment reminders (SMS/Email)
- [ ] Receipt generation (PDF)
- [ ] Payment history per tenant

**Database Tables:**
- `payments` (empty)
- `payment_type`: RENT, DEPOSIT, UTILITY, MAINTENANCE, LATE_FEE
- `payment_status`: PENDING, COMPLETED, FAILED, VERIFIED

### Priority 2: LEASE MANAGEMENT ENHANCEMENTS
**Current:** Basic create/read functionality
**Needs:**
- [ ] Lease renewal workflow
- [ ] Auto-reminders (30/60/90 days before expiry)
- [ ] Lease templates
- [ ] Bulk lease operations
- [ ] Rent escalation calculator

### Priority 3: EXPENSES & PURCHASE ORDERS
**Schema Exists:** Partial
**Needs:**
- [ ] Expense categorization UI
- [ ] Receipt upload to cloud storage
- [ ] Purchase order approval workflow
- [ ] Supplier management
- [ ] Budget tracking per property
- [ ] Monthly expense reports

### Priority 4: INVENTORY MANAGEMENT
**Schema Exists:** Yes
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

### Key Schema Notes:

**CRITICAL CHANGE (Dec 2024):**
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

### Database Models (15+ tables):
- properties (4 records)
- units (163 records)
- users (role-based auth)
- tenants (with history)
- lease_agreements
- payments (empty - needs implementation)
- expenses (schema only)
- inventory_items (schema only)
- purchase_orders (schema only)
- maintenance_requests
- water_readings
- security_deposits
- damage_assessments
- vacate_notices
- activity_logs

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

### 1. Tenant History Bug (Dec 11, 2024)
**Problem:** `unitId @unique` prevented multiple tenants per unit
**Impact:** Couldn't assign new tenant to previously occupied unit
**Solution:** 
- Removed `@unique` constraint from `tenants.unitId`
- Changed `units.tenants` from one-to-one to one-to-many
- Updated all queries to filter by `leaseEndDate >= NOW()`

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

### UI Components (Shadcn):
- Button, Card, Dialog, Table
- Form, Input, Select
- Badge, Alert Dialog
- Custom CircularProgress component

---

## 🚀 SAAS ROADMAP

### Phase 1: Complete Core Features (Q1 2025)
- [ ] Payments system
- [ ] Lease renewals
- [ ] Basic reporting

### Phase 2: Multi-Tenancy (Q2 2025)
- [ ] Database-per-tenant architecture
- [ ] Signup/onboarding flow
- [ ] Subscription billing (Stripe)

### Phase 3: Domain & Launch (Q3 2025)
**Domain Ideas:**
- mizpharentals.com
- rentalmizpha.io
- managemizpha.app
- mizpha.property

**Pricing Tiers:**
- Basic: $49/mo (50 units, 3 properties)
- Pro: $99/mo (200 units, unlimited properties)
- Enterprise: $249/mo (unlimited, white-label)

### Phase 4: Scale (Q4 2025)
- [ ] Mobile apps (React Native)
- [ ] API for integrations
- [ ] Advanced analytics/ML
- [ ] Multi-language support

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
- 4 properties with actual unit numbers (AA1-AA9, etc.)
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

### Current Stats:
- 4 properties managed
- 163 units tracked
- ~80% occupancy rate
- KSH 4.2M monthly revenue potential

### Target (6 months):
- 10+ client companies
- 1000+ units managed
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

Last Updated: December 13, 2024
Version: 1.0.0-alpha
