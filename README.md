# Makeja Homes

**Multi-tenant property management SaaS for the Kenyan market.**

Built with Next.js 14 App Router, deployed on Vercel, with Neon PostgreSQL using a schema-per-tenant architecture.

> This repository is **private and proprietary**. Unauthorized use, reproduction, or distribution is prohibited.

---

## Architecture

### Schema-per-tenant (Neon PostgreSQL)

Each client company gets its own PostgreSQL schema (`tenant_<slug>`) within a single Neon database. This provides full data isolation without the cost of separate databases.

```
neon-db
├── public                   ← master schema (companies, master users)
├── tenant_makuti            ← Makuti Apartments data
├── tenant_hillux            ← Hillux Properties data
├── tenant_elvv              ← ELVV data
└── tenant_<slug>            ← every new client
```

The schema is provisioned automatically when a new client signs up via `/api/onboarding/register`. The provisioner runs idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` patches, so re-runs after partial failures are safe.

### Auth — JWT via `jose`

No NextAuth. Authentication uses a custom JWT (signed with `JWT_SECRET`) stored in an HTTP-only cookie named `auth-token`. The payload contains:

| Field | Purpose |
|---|---|
| `id` | User UUID |
| `email` | User email |
| `role` | User role (text) |
| `tenantSlug` | Schema name e.g. `tenant_makuti` |
| `mustChangePassword` | Force password change on first login |

`getCurrentUserFromRequest()` decodes and verifies this JWT on every API call.

### `getPrismaForRequest`

Every API route calls `getPrismaForRequest(request)` which reads `tenantSlug` from the JWT and returns a Prisma client with `search_path` set to that schema. This means all queries are automatically scoped to the correct tenant without any application-level filtering.

**Critical**: Prisma returns PostgreSQL enum values as opaque objects when the schema is not `public`. All queries that read a `role` or enum column must cast: `role::text as role`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Neon PostgreSQL (serverless, schema-per-tenant) |
| ORM | Prisma (raw SQL via `$queryRawUnsafe` for non-public schemas) |
| Auth | Custom JWT (`jose`) |
| Email | Resend |
| Payments | Paystack (subaccounts per property, online rent + deposits) |
| Deployment | Vercel |
| Styling | Tailwind CSS |

---

## Roles

| Role | Access |
|---|---|
| `ADMIN` | Full access — all properties, all financials, user management, HR/payroll, settings |
| `MANAGER` | Properties, tenants, leases, payments, utilities, expenses (limited) |
| `CARETAKER` | Properties view, maintenance tickets |
| `STOREKEEPER` | Inventory, purchase orders |
| `TENANT` | Own unit, payments, lease, maintenance requests |

Staff log in at `/auth/login` (staff portal). Tenants log in at `/auth/tenant-login`. The portals enforce role separation — tenant credentials cannot enter the staff portal and vice versa.

---

## Features

### Properties & Units
- Multi-property management (apartments, commercial, mixed-use)
- Unit types, floor, rent amount, deposit amount
- Occupancy status: `VACANT`, `RESERVED`, `OCCUPIED`
- Lease contract template per property (rich text, variable substitution)

### Tenant Onboarding Flow
1. Admin creates unit reservation → status becomes `RESERVED`
2. System generates a sign-lease URL sent to the tenant's email
3. Tenant signs the lease online (signature captured)
4. Status changes to `OCCUPIED`; security deposit payment is triggered
5. Tenant pays deposit via Paystack; status `HELD` + `paidDate` is set on `security_deposits`

### Leases
- Digital lease signing with signature capture
- PDF generation
- Lease history preserved on tenant removal

### Payments
- Online rent payments via Paystack (property-level subaccounts)
- Partial payment tracking — bills show `amountPaid`, `balance`, `isPartial`
- Payment allocation to specific monthly bills
- M-Pesa reference support

### Security Deposits
- Separate deposit payment flow via Paystack
- Statuses: `HELD` (collected), `ASSESSED`, `REFUNDED`, `FORFEITED`
- "Already paid" check uses `paidDate IS NOT NULL` (no `PAID` status exists)

### Finance
- **Payments** — full history, property filter, Paystack verification
- **Expenses** — categorised (Maintenance, Salaries, Utilities, etc.), property-linked
- **Utilities** — water readings, electricity billing
- **Recurring Charges** — automated monthly bill generation
- **Reports** — income/expense summaries, occupancy, revenue by property
- **Insights** — trend analysis
- **Tax & Compliance** — VAT, withholding tax summaries

### HR & Payroll
- Staff profiles with employment type, start date, salary, payment details
- Salary frequencies: Monthly, Weekly, Annually
- Payment methods: Bank Transfer, M-Pesa, Cash
- Bank and M-Pesa details stored per staff member
- **Volunteer / No Salary** flag — staff member appears on roster but is excluded from payroll runs
- Payroll run — select staff, set payment date, click process → creates `SALARIES` expense entries automatically
- Enrollment gate — staff must have accepted their invite (`lastLoginAt IS NOT NULL`) before being added to payroll

### User Management
- Invite-based onboarding — generates a temp password, sends credentials email via Resend
- Resend invite — regenerates temp password and re-sends email
- `mustChangePassword` flag forces password change on first login
- Staff payroll link from users page

### Multi-Instance (Company Switching)
- A user's email can exist in multiple tenant schemas (different companies, different passwords)
- The login page shows all available instances for the entered email
- Switching instances requires re-entering the **target account's password** (bcrypt verified)
- New JWT issued for the target schema on successful switch
- `InstanceSwitcher` component in sidebar shows current company; dropdown to switch

### Maintenance
- Tenant-submitted maintenance requests
- Staff can update status, add notes, assign to caretaker

### Inventory
- Stock items, categories, suppliers
- Movement tracking (in/out)
- Purchase orders

### Audit Log
- Tracks significant actions with actor, target, and timestamp

---

## Project Structure

```
app/
  api/                        ← API routes (all use getPrismaForRequest)
    admin/                    ← Admin-only endpoints
      tenants/[id]/bills/     ← Tenant outstanding bills
    auth/
      login/                  ← Staff login
      tenant-login/           ← Tenant login
      logout/
      instances/              ← Multi-instance discovery
      switch-instance/        ← Cross-instance switching
    hr/payroll/               ← Payroll roster + run
    onboarding/register/      ← New client provisioning
    users/[id]/
      hr-profile/             ← Staff employment/salary profile
      resend-invite/          ← Re-send invite email
  dashboard/
    admin/                    ← Admin dashboard pages
      hr/                     ← Staff & Payroll page
      users/                  ← User management
      ...
    tenant/                   ← Tenant portal
    manager/                  ← Manager views

components/
  dashboard/
    sidebar.tsx               ← Desktop sidebar (role-aware nav)
    MobileNav.tsx             ← Mobile drawer nav
    InstanceSwitcher.tsx      ← Cross-instance switching UI

lib/
  auth-helpers.ts             ← JWT decode, getCurrentUserFromRequest
  get-prisma.ts               ← getPrismaForRequest, schema resolver
  resend.ts                   ← Email client
  rate-limit.ts               ← In-memory rate limiters

prisma/
  schema.prisma               ← Prisma schema (public schema only; tenant schemas via raw SQL)
```

---

## Environment Variables

```env
DATABASE_URL=                 # Neon pooled connection URL
DIRECT_URL=                   # Neon direct connection URL (for migrations)
JWT_SECRET=                   # Min 32-char secret for JWT signing
RESEND_API_KEY=               # Resend API key for emails
NEXT_PUBLIC_APP_URL=          # e.g. https://makejahomes.co.ke
PAYSTACK_SECRET_KEY=          # Paystack secret key
```

---

## Running Locally

```bash
npm install
cp .env.example .env.local    # fill in your env vars
npx prisma generate
npm run dev
```

The app runs at `http://localhost:3000`.

To provision a new test tenant, POST to `/api/onboarding/register` with the registration payload, or use the onboarding UI at `/onboarding`.

---

## Deployment

Deployed on **Vercel** with automatic deployments from the `main` branch.

- All API routes use `export const dynamic = 'force-dynamic'` to prevent static caching
- Prisma `$queryRawUnsafe` is used throughout non-public schema queries to avoid ORM enum casting issues on Vercel's serverless runtime
- No VPS, no Nginx, no PM2

---

## Proprietary Notice

Copyright © 2024–2025 Makeja Homes. All rights reserved.

This software is proprietary and confidential. The source code, design, and architecture are trade secrets of Makeja Homes. No license is granted to copy, modify, distribute, or use this software without explicit written permission from the owner.
