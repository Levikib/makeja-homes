# Makeja Homes

> Modern property management platform built for Kenyan landlords, property managers, and tenants.

**Live:** [makejahomes.co.ke](https://makejahomes.co.ke)

---

## What It Does

Makeja Homes is a full multi-tenant SaaS platform where each property management company gets a completely isolated environment (schema-per-tenant on Neon PostgreSQL). From a single dashboard, a property manager can run their entire portfolio — billing, maintenance, inventory, staff, finances, and tenant communications.

### Core Modules

| Module | Description |
|--------|-------------|
| **Properties & Units** | Create properties, configure units with rent/deposit amounts, track occupancy |
| **Tenant Management** | Onboard tenants, send digital lease contracts, track lease lifecycle |
| **Billing & Finance** | Generate monthly bills, process M-Pesa/card/manual payments, manage recurring charges |
| **Security Deposits** | Full deposit lifecycle — collection, damage assessment, refunds |
| **Maintenance** | Full request-to-completion workflow with priority, assignment, materials tracking |
| **Inventory** | Stock management with supplier details, reorder alerts, movement history |
| **Purchase Orders** | Procurement pipeline with inventory auto-update on receipt |
| **Expenses** | Auto-logged from maintenance completions and purchase order receipts |
| **HR / Payroll** | Staff management and payroll processing |
| **Water & Utilities** | Sub-meter readings, utility billing |
| **Reports & Insights** | Financial reports, AI-powered analytics |
| **Njiti AI** | Embedded AI assistant with role-scoped live data context |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Radix UI |
| Database | PostgreSQL on Neon (schema-per-tenant) |
| ORM | Prisma (master schema only — tenant schemas use raw SQL) |
| Auth | JWT (jose) — cookie-based, role-aware |
| Payments | Paystack (card + M-Pesa STK Push via Daraja API) |
| Email | Nodemailer (SMTP) |
| AI | Anthropic Claude (Njiti agent) |
| Deployment | Vercel |

---

## Architecture

### Multi-Tenancy

Each client company gets its own PostgreSQL schema: `tenant_{slug}` (e.g. `tenant_mizpha`). This gives complete data isolation with zero cross-contamination between clients.

```
public schema         → master: companies, super-admin users
tenant_mizpha schema  → properties, units, tenants, bills, payments, maintenance...
tenant_acme schema    → same tables, completely separate
```

**Critical pattern:** All tenant data access uses `getPrismaForRequest(req)` + `$queryRawUnsafe` / `$executeRawUnsafe`. Never use Prisma ORM methods directly on tenant schemas — they target the public schema and will silently query the wrong data.

```typescript
// ✅ Correct
const db = getPrismaForRequest(request)
const rows = await db.$queryRawUnsafe(`SELECT * FROM properties`)

// ❌ Wrong — hits public schema, not the tenant schema
const db = getPrismaForTenant(slug)
const rows = await db.properties.findMany()
```

### Self-Healing Tables

Every API route creates its tables if they don't exist, so new tenants get a fully working schema on their very first request — no migrations to run per tenant.

```typescript
await db.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS maintenance_requests (
    id TEXT PRIMARY KEY,
    ...
  )
`).catch(() => {})
```

### Auth & Roles

JWT cookie (`token`) contains: `id`, `role`, `firstName`, `lastName`, `tenantSlug`.

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Cross-tenant platform admin |
| `ADMIN` | Full access within their company |
| `MANAGER` | Operational access, limited financial |
| `CARETAKER` | Maintenance requests + inventory |
| `STOREKEEPER` | Inventory + purchase orders |
| `TENANT` | Own unit only — bills, payments, maintenance, deposit |

---

## Operations Lifecycle

### Maintenance

```
Tenant/Caretaker submits request
         ↓  status: PENDING
Admin reviews → Approves (OPEN) or Rejects (CANCELLED)
         ↓
Admin assigns priority + caretaker
         ↓  status: IN_PROGRESS
Materials recorded from inventory → stock auto-deducted
         ↓
If stock low → purchase order created
         ↓
Work completed → actual cost logged
         ↓  status: COMPLETED
Expense auto-created (materials cost + labour)
```

### Purchase Orders

```
PO created with line items (inventory-linked or custom)
         ↓  status: PENDING
Admin approves
         ↓  status: APPROVED
Order received
         ↓  status: RECEIVED  — auto:
  • Inventory stock incremented for linked items
  • New inventory items created for custom items flagged "add to inventory"
  • Expense auto-logged from order total
```

---

## Project Structure

```
app/
├── api/                          # All API route handlers
│   ├── auth/                     # Login, logout, /me
│   ├── maintenance/              # Requests + [id]/ workflow actions
│   │   └── [id]/
│   │       ├── approve/
│   │       ├── assign/
│   │       ├── start/
│   │       ├── complete/         # Auto-creates expense on completion
│   │       ├── reject/
│   │       └── materials/        # Inventory consumption tracking
│   ├── inventory/                # Items + [id]/ (PATCH records adjustment movements)
│   ├── purchase-orders/          # Orders + [id]/ (RECEIVED triggers stock + expense)
│   ├── expenses/                 # Expense CRUD
│   ├── payments/                 # Manual + M-Pesa + Paystack
│   ├── tenant/                   # Tenant-scoped: bills, payments, maintenance, profile
│   ├── njiti/                    # AI agent endpoint
│   └── webhooks/                 # Paystack webhook (HMAC-SHA512 verified)
│
├── dashboard/
│   ├── admin/                    # Admin pages: properties, tenants, bills, deposits, expenses, HR...
│   ├── maintenance/              # Kanban list + [id] detail with full workflow
│   ├── inventory/                # Stock dashboard + add/edit forms
│   ├── purchase-orders/          # Pipeline view + [id] detail + new order form
│   └── tenant/                   # Tenant portal: bills, payments, lease
│
components/
├── dashboard/sidebar.tsx         # Role-aware sidebar navigation
├── NjitiAgent.tsx                # Floating AI chat widget (role-scoped)
└── ui/                           # Radix-based component library

lib/
└── get-prisma.ts                 # Tenant schema resolver — most critical file
```

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL (or a Neon account)
- Paystack account (for payment features)
- Anthropic API key (for Njiti)

### Setup

```bash
git clone https://github.com/Levikib/makeja-homes.git
cd makeja-homes
npm install
```

Create `.env.local`:

```env
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET=your-jwt-secret-min-32-chars
ANTHROPIC_API_KEY=sk-ant-...
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_...
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_SHORTCODE=...
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npx prisma generate
npm run dev
```

App runs at `http://localhost:3000`.

---

## Deployment

Push to `main` triggers an automatic Vercel deployment.

```bash
git add -A
git commit -m "your message"   # pre-commit hook runs tsc automatically
git push origin main           # deploys to Vercel
```

### Git Hooks

Two hooks run automatically on every commit and push:

| Hook | What it does |
|------|-------------|
| `pre-commit` | Runs `tsc --noEmit` — blocks commit if TypeScript errors exist |
| `pre-push` | Blocks pushing to any branch other than `main` |

> Hooks live in `.git/hooks/` and are not tracked by git. On a fresh clone, copy them from `.githooks/` and make them executable:
> ```bash
> cp .githooks/* .git/hooks/
> chmod +x .git/hooks/pre-commit .git/hooks/pre-push
> ```

### Required Vercel Environment Variables

Set these in **Vercel → Project Settings → Environment Variables**:

```
DATABASE_URL
JWT_SECRET
ANTHROPIC_API_KEY
PAYSTACK_SECRET_KEY
PAYSTACK_PUBLIC_KEY
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET
MPESA_PASSKEY
MPESA_SHORTCODE
RESEND_API_KEY
NEXT_PUBLIC_APP_URL
```

---

## Njiti — The AI Agent

Njiti (Swahili for "Genius") is an embedded AI assistant powered by Claude. It is fully role-aware and fetches live data from the tenant's database before responding.

| Role | What Njiti sees |
|------|----------------|
| Admin / Manager | Portfolio aggregates: unpaid bills, open maintenance, revenue, deposits held |
| Tenant | Only their own account: bills, last payment, deposit status, their maintenance requests |
| Caretaker | Maintenance queue counts and urgency breakdown |
| Storekeeper | Stock levels, low-stock alerts, pending purchase orders |

Njiti never leaks cross-role data. A tenant cannot ask it about other tenants or portfolio-wide stats.

**Endpoint:** `POST /api/njiti`  
**Model:** `claude-haiku-4-5-20251001`

---

## Key Conventions

### Raw SQL for all tenant data

```typescript
const db = getPrismaForRequest(request)

// Query
const rows = await db.$queryRawUnsafe(`SELECT * FROM table WHERE id = $1`, id)

// Mutate
await db.$executeRawUnsafe(`UPDATE table SET col = $1 WHERE id = $2`, val, id)
```

### Self-heal tables at the top of every route

```typescript
async function ensureTables(db: any) {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS my_table (id TEXT PRIMARY KEY, ...)
  `).catch(() => {})

  // For columns added later — safe to run every time
  await db.$executeRawUnsafe(
    `ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_col TEXT`
  ).catch(() => {})
}
```

### ID format

```typescript
const id = `mr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
// Prefixes: mr_ (maintenance), inv_ (inventory), po_ (purchase order),
//           exp_ (expense), pay_ (payment), poi_ (PO line item), etc.
```

### Always pull userId from JWT — never trust the client

```typescript
const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
const userId = payload.id as string  // ✅ from verified token
// Never: const userId = req.body.userId  ❌
```

### Real-time updates

List pages poll every 30 seconds silently (no loading flash). Detail pages poll every 20 seconds.

```typescript
const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

useEffect(() => {
  load()
  pollRef.current = setInterval(() => load(true), 30000)
  return () => { if (pollRef.current) clearInterval(pollRef.current) }
}, [])
```

---

## Contributing

1. Pull latest `main`
2. Make your changes
3. `npx tsc --noEmit` — fix any errors
4. `git add -A && git commit -m "description"` — pre-commit hook verifies types
5. `git push origin main` — triggers Vercel deploy

---

## License

Private — all rights reserved. © Makeja Homes.
