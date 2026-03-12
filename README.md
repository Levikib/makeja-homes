# Makeja Homes

**Multi-tenant SaaS property management platform — built for the Kenyan residential market.**

> 170+ active units · KSH 1.5M+/month in processed transactions · Live in production since 2024

---

## What This Is

Makeja Homes is a production property management SaaS that landlords and property managers use to run their entire rental operation — from tenant onboarding to automated billing to payment reconciliation.

It started as a single-client solution and evolved into a fully multi-tenant platform with subdomain-based routing, meaning each property manager gets their own isolated workspace under their own subdomain.

This is not a demo. It moves real money, manages real leases, and sends real emails to real tenants every month.

---

## Core Features

### Payments & Billing
- **Database-driven billing engine** — `monthly_bills` is the single source of truth for every charge
- **Paystack integration** — full webhook pipeline with signature verification, idempotency, and automatic bill status updates
- **Recurring charges** — multi-property support, configurable amounts, automated generation on billing cycle
- **Manual payment verification** — workflow for cash/mpesa payments logged outside Paystack
- **Email receipts** — automated transactional emails via Resend on every successful payment

### Tenant & Lease Management
- Tenant profiles with unit assignment and contact details
- Lease creation with start/end dates, rent amount, and deposit tracking
- **Automated lease expiry** — cron job scans for expiring leases and sends email reminders to both landlord and tenant
- **Unit-switching workflow** — move a tenant between units without data loss or broken history
- Occupied unit edit protection — prevents accidental overwrites on active units

### Property & Unit Management
- Multi-property architecture — one account manages unlimited properties
- Unit-level tracking — occupancy status, rent amount, floor, type
- Occupancy dashboard — real-time view of which units are filled, vacant, or expiring soon

### Multi-Tenant Architecture
- Subdomain-based tenant routing (`{client}.makejahomes.co.ke`)
- Complete data isolation between property managers
- Role-based access — admin, property manager, viewer

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (Edge-compatible) |
| Database | PostgreSQL + Prisma ORM |
| Payments | Paystack (webhooks + REST API) |
| Email | Resend (transactional) |
| Auth | NextAuth.js |
| Hosting | VPS + Nginx (reverse proxy, SSL) |
| CI/CD | GitHub → manual VPS deploy |

---

## Architecture Decisions

**Why `monthly_bills` as source of truth?**  
Early versions computed bill status on the fly from payment records. This caused race conditions, duplicate charges, and reconciliation nightmares. Migrating to a pre-generated `monthly_bills` table — with explicit `status` fields updated by webhooks — eliminated all of these. Every bill has a known state at all times.

**Why Paystack over Stripe?**  
Stripe's KES support is limited and M-Pesa integration requires local banking partnerships. Paystack handles KES natively, supports M-Pesa directly, and has a developer experience on par with Stripe for the East African market.

**Why VPS over Vercel/Railway?**  
Cost predictability at scale. With 170+ units generating webhook traffic, database queries, and email sends, a flat VPS rate made more sense than per-request pricing. Nginx handles routing, PM2 manages the Node process, and Let's Encrypt handles SSL.

---

## Database Schema (Key Models)

```
Property       → has many Units
Unit           → belongs to Property, has one active Tenant (via Lease)
Tenant         → has many Leases, has many Bills
Lease          → links Tenant to Unit, has start/end date, rent amount
MonthlyBill    → generated per Tenant per month, has status (pending/paid/overdue)
Payment        → records each Paystack transaction, linked to MonthlyBill
RecurringCharge → template for auto-generating MonthlyBills
```

---

## Webhook Flow

```
Paystack Event (charge.success)
  → Verify HMAC-SHA512 signature
  → Find MonthlyBill by reference
  → Update bill status → "paid"
  → Create Payment record
  → Send receipt email via Resend
  → Return 200
```

All webhook handlers are idempotent — duplicate events from Paystack are safely ignored.

---

## Cron Jobs

| Job | Schedule | Action |
|---|---|---|
| Lease expiry scanner | Daily 08:00 EAT | Finds leases expiring in ≤30 days, sends reminder emails |
| Monthly bill generation | 1st of month 06:00 EAT | Creates `MonthlyBill` records for all active leases |
| Overdue bill flagging | Daily 10:00 EAT | Updates unpaid bills past due date to `overdue` status |

---

## Development Setup

```bash
git clone https://github.com/Levikib/makeja-homes.git
cd makeja-homes
npm install

# Copy env template
cp .env.example .env.local

# Required env vars:
# DATABASE_URL          — PostgreSQL connection string
# NEXTAUTH_SECRET       — random 32-char string
# PAYSTACK_SECRET_KEY   — from Paystack dashboard
# PAYSTACK_WEBHOOK_SECRET — from Paystack webhook settings
# RESEND_API_KEY        — from Resend dashboard

# Run migrations
npx prisma migrate dev

# Seed (optional)
npx prisma db seed

# Start dev server
npm run dev
```

---

## Environment Variables

```env
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=
```

---

## Status

| Area | Status |
|---|---|
| Core billing engine | ✅ Production |
| Paystack webhooks | ✅ Production |
| Lease automation | ✅ Production |
| Multi-tenant routing | ✅ Production |
| Recurring charges | ✅ Production |
| Email receipts | ✅ Production |
| Mobile app (tenant-facing) | 🔄 Planned |
| Landlord analytics dashboard | 🔄 Planned |
| M-Pesa STK Push (direct) | 🔄 Planned |

---

## Built By

**Levis Kibirie (Levo)** — Founding Fullstack Engineer  
[Portfolio](https://levis.makejahomes.co.ke) · [LinkedIn](https://linkedin.com/in/levis-kibirie-6bba13344) · [GitHub](https://github.com/Levikib)

> Makeja Homes was co-built with a development partner. Architecture, payments infrastructure, billing engine, and automation systems designed and implemented by Levis Kibirie.

---

*Built in Nairobi. Running in production. Processing real money.*
