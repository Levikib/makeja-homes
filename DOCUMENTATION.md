# Makeja Homes — System Documentation

> Version: 2.0 | Last updated: April 2026 | Stack: Next.js 14, Neon PostgreSQL, Prisma, Resend, M-Pesa Daraja

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Authentication & Roles](#3-authentication--roles)
4. [Navigation Structure](#4-navigation-structure)
5. [Feature Reference](#5-feature-reference)
6. [API Reference](#6-api-reference)
7. [Email & Notifications](#7-email--notifications)
8. [Payment Integrations](#8-payment-integrations)
9. [Security Model](#9-security-model)
10. [Competitive Analysis vs Bomahut & Industry](#10-competitive-analysis)
11. [Open Tasks & Roadmap](#11-open-tasks--roadmap)
12. [Deployment Notes](#12-deployment-notes)

---

## 1. System Overview

Makeja Homes is a **multi-tenant SaaS property management platform** built specifically for the Kenyan real estate market. It enables property management companies to manage their entire portfolio — properties, units, tenants, leases, payments, maintenance, inventory — from a single web application.

### Core Capabilities
| Domain | Features |
|--------|----------|
| Portfolio | Multi-property, multi-unit management with type classification |
| Tenants | Full lifecycle: onboarding → lease signing → transfers → vacating |
| Billing | Automated monthly bills (rent + water + garbage + recurring charges) |
| Payments | M-Pesa STK Push, Paystack, bank transfer, manual recording |
| Maintenance | Request → assign → workflow → complete tracking |
| Inventory | Stock management with purchase orders |
| Analytics | Revenue reports, occupancy rates, insights, tax compliance |
| Security | JWT auth, role-based access, audit logs, input sanitization |
| Multi-tenancy | Schema-per-company isolation on Neon PostgreSQL |

---

## 2. Architecture

### Stack
```
Frontend: Next.js 14 (App Router) + Tailwind CSS + Lucide Icons
Backend:  Next.js API Routes (Edge-compatible)
Database: Neon PostgreSQL (schema-per-tenant multi-tenancy)
ORM:      Prisma v5 with search_path routing
Auth:     Custom JWT (jose) — HttpOnly cookie "token", 24h expiry
Email:    Resend (transactional emails)
Payments: M-Pesa Daraja API + Paystack
Hosting:  Vercel (recommended)
```

### Multi-Tenancy Model
Each registered company gets its own **PostgreSQL schema** on Neon. The `public` schema (master DB) holds only the `companies` table. Tenant-specific data (users, properties, tenants, payments, etc.) lives in `schema_{company_slug}`.

```
Request → middleware (extracts x-tenant-slug from subdomain/header)
       → lib/prisma.ts (proxy: sets search_path to schema_{slug})
       → Prisma queries run scoped to that tenant schema
```

### Key Files
| File | Purpose |
|------|---------|
| `lib/prisma.ts` | Prisma proxy that resolves tenant schema from context |
| `lib/auth-helpers.ts` | `getCurrentUser()`, `requireRole()` |
| `lib/sanitize.ts` | Server-side input sanitization (XSS protection) |
| `lib/rate-limit.ts` | In-process sliding window rate limiter |
| `lib/kenya-tax.ts` | Kenya VAT + withholding tax calculations |
| `lib/resend.ts` | Resend email client + EMAIL_CONFIG |
| `middleware.ts` | CSRF double-submit cookie, tenant slug injection |

---

## 3. Authentication & Roles

### Roles
| Role | Access Level |
|------|-------------|
| **ADMIN** | Full system access — all properties, all features |
| **MANAGER** | Assigned properties only — tenants, payments, leases, maintenance |
| **CARETAKER** | Units and maintenance requests for assigned properties |
| **STOREKEEPER** | Inventory and purchase orders only |
| **TENANT** | Self-service — own unit, payments, lease, maintenance |

### Auth Flow
1. POST `/api/auth/login` → validates credentials → issues JWT (24h) in HttpOnly cookie named `token`
2. Every protected API route calls `jwtVerify()` from `jose` and checks `payload.role`
3. Dashboard layouts call `getCurrentUser()` server-side → redirects to `/auth/login` if absent
4. Token rotation happens on `/api/auth/me` calls
5. Session monitor triggers a warning modal at 20-minute idle timeout

### Password Reset
POST `/api/auth/forgot-password` → generates reset token → emails link → POST `/api/auth/reset-password`

---

## 4. Navigation Structure

The sidebar is a **collapsible grouped mega-menu** — 7 groups for ADMIN, each expandable, no scrolling required.

### ADMIN Navigation Groups
| Group | Items |
|-------|-------|
| Dashboard | Direct link |
| Properties | All Properties, Units, Vacate Notices |
| Tenants | All Tenants, Leases, Bulk Operations |
| Finance | Payments, Utilities, Recurring Charges, Expenses |
| Operations | Maintenance, Inventory, Purchase Orders |
| Reports | Reports, Insights, Tax & Compliance, Audit Log |
| People | Users, Settings |

### Njiti Agent
A floating AI chatbot (bottom-right corner) available to all dashboard users. Understands 20+ intents covering every major workflow. Responds with step-by-step guidance and direct navigation links. Named "Njiti Agent."

---

## 5. Feature Reference

### 5.1 Properties & Units

**Properties**
- Create with name, address, type, city
- Assign managers, caretakers, and storekeepers
- Configure payment methods per property (M-Pesa till/paybill, bank account)
- Archive/restore (soft delete)

**Units**
- Types: STUDIO, ONE_BEDROOM, TWO_BEDROOM, THREE_BEDROOM, PENTHOUSE, SHOP, OFFICE, WAREHOUSE, STAFF_QUARTERS
- Status: VACANT → RESERVED (lease pending) → OCCUPIED → MAINTENANCE → VACANT
- Each unit has: rentAmount, depositAmount, bedrooms, floor, notes

### 5.2 Tenant Lifecycle

```
Add Tenant (assign to unit) 
  → Lease created (PENDING)
  → Send Contract (email with signature link)
  → Tenant signs at /sign-lease/{token}
  → Lease becomes ACTIVE, unit becomes OCCUPIED
  → Monthly bills generated automatically
  → Tenant pays via M-Pesa / bank / manual recording
  → Admin verifies payment
  → [Unit Transfer if needed] → new lease created (PENDING → sign → ACTIVE)
  → Vacate Notice
  → Damage Assessment
  → Deposit Refund
  → Unit returns to VACANT
```

### 5.3 Lease Agreements

- Status: DRAFT → PENDING → ACTIVE → EXPIRED / TERMINATED / CANCELLED
- Digital signature via unique token (`signatureToken`)
- Contract terms auto-generated with property/tenant/financial details
- Unit Transfer creates a new lease (old one TERMINATED)
- Lease renewal extends the agreement

### 5.4 Billing & Utilities

Monthly bill = Rent + Water Charge + Garbage Fee + Recurring Charges

**Water Billing:**
1. Record monthly readings per unit (current - previous = consumption)
2. Multiply by rate set in property settings
3. Generate bill automatically

**Garbage Fees:**
- Set per tenant (flat monthly rate)
- Auto-generate for all tenants each month

**Recurring Charges:**
- Frequency: MONTHLY, QUARTERLY, SEMI_ANNUALLY, ANNUALLY, ONE_TIME
- Examples: parking, internet, gym, service fee
- Applied automatically when generating bills

### 5.5 Payments

**Recording Methods:**
- M-Pesa STK Push (tenant-initiated, auto-reconciled)
- Paystack (card payments)
- Manual recording by admin (CASH, BANK_TRANSFER, CHEQUE, MOBILE_MONEY)
- Tenant uploads payment proof for verification

**Verification Workflow:**
- Tenant submits → status: PENDING
- Admin reviews proof → APPROVED or DECLINED
- Approved payments: unit bill marked PAID, receipt generated

### 5.6 Unit Transfer (Switch Unit)

3-step wizard:
1. **Select Unit** — browse vacant units with rent comparison, search/filter
2. **Configure** — effective date, rent override, deposit choice (transfer vs new), notes
3. **Confirm** — summary with rent diff badge, impact explanation

On confirm:
- Old lease TERMINATED
- Old unit → VACANT
- New unit → RESERVED
- Tenant's `unitId` updated
- New lease created (PENDING) with transfer contract terms
- Tenant emailed with new lease signing link
- Audit log entry written

### 5.7 Maintenance

**Request Flow:**
- Tenant submits from `/dashboard/tenant/maintenance/new`
- PENDING → ASSIGNED (to caretaker) → IN_PROGRESS → AWAITING_PARTS → COMPLETED → CLOSED
- Materials used are tracked (links to inventory)
- Caretaker updates status; admin has full oversight

**Priority Levels:** LOW, MEDIUM, HIGH, URGENT

### 5.8 Inventory & Purchase Orders

**Inventory:**
- Items with SKU, category, quantity, unit cost
- Movements logged (RECEIVED, USED, ADJUSTED, DAMAGED, RETURNED)
- Low stock alerts when quantity < minStockLevel

**Purchase Orders:**
- Create PO with line items (quantity × unit price)
- Status: DRAFT → PENDING_APPROVAL → APPROVED → ORDERED → PARTIALLY_RECEIVED → RECEIVED → CANCELLED
- Receiving a PO auto-increments inventory quantities

### 5.9 Security Deposit Workflow

1. Deposit collected at lease start (recorded in `security_deposits`)
2. At move-out: `damage_assessments` created with deductions
3. Net refund = deposit - deductions
4. Refund processed and recorded; deposit status → REFUNDED or FORFEITED

### 5.10 Reports & Analytics

| Report | Contents |
|--------|---------|
| Revenue Summary | Monthly revenue, by property, by payment method |
| Occupancy Rate | % occupied, vacancy trends |
| Payment Collection | Collection rate, overdue analysis |
| Expense Breakdown | By category, by property |
| Expiring Leases | Alert: leases expiring within 30/60/90 days |
| Tax & Compliance | VAT summary, withholding tax, KRA-ready format |
| AI Insights | Claude Haiku-powered pattern analysis + recommendations |
| Audit Log | All staff actions with filters and pagination |

### 5.11 Audit Log

Every key action is logged to `activity_logs`:
| Action | Trigger |
|--------|---------|
| TENANT_CREATED | Tenant assigned to unit |
| UNIT_TRANSFER | Unit switch executed |
| PAYMENT_RECORDED | Manual payment added |
| PAYMENT_APPROVED | Payment verified |
| PAYMENT_DECLINED | Payment declined |
| MAINTENANCE_UPDATE | Status change on work order |

Accessible at `/dashboard/admin/audit` with action-type filters and pagination (50/page).

---

## 6. API Reference

All API routes use Next.js App Router conventions. Protected routes require an `HttpOnly` JWT cookie named `token`.

### Authentication Required
All routes except `/api/auth/*`, `/api/sign-lease`, `/api/contact`, `/api/onboarding/*` require JWT.

### Key Endpoints

#### Tenants
```
GET    /api/tenants                          — List all tenants (ADMIN/MANAGER/CARETAKER)
GET    /api/tenants/[id]                     — Tenant details
GET    /api/tenants/[id]/switch-unit         — Preview: vacant units for transfer
POST   /api/tenants/[id]/switch-unit         — Execute unit transfer
POST   /api/tenants/[id]/vacate              — Initiate vacate
```

#### Properties & Units
```
GET    /api/properties                       — List properties
POST   /api/properties                       — Create property
GET    /api/units                            — List units (with status filter)
POST   /api/properties/[id]/units/[unitId]/assign-tenant — Create tenant + lease
```

#### Payments
```
POST   /api/admin/payments/manual            — Record manual payment
PATCH  /api/admin/payments/[id]/verify       — Approve/decline payment
GET    /api/admin/payments/list              — Payments list with filters
GET    /api/admin/payments/stats             — Payment statistics
```

#### Leases
```
POST   /api/leases/[id]/send-contract        — Email lease for signing
POST   /api/leases/[id]/renew                — Renew lease
POST   /api/leases/[id]/terminate            — Terminate lease
GET    /api/sign-lease/[token]               — Public: get lease to sign
POST   /api/sign-lease/[token]               — Public: submit signature
```

#### Billing
```
POST   /api/admin/bills/generate             — Generate monthly bills
GET    /api/admin/bills/list                 — List bills
POST   /api/admin/bills/reminders/bulk       — Send payment reminders
```

### Input Sanitization
`lib/sanitize.ts` exports:
- `sanitizeText(value, maxLength)` — strips HTML tags, null bytes, JS protocols
- `sanitizeOptional(value, maxLength)` — returns undefined if empty
- `sanitizeAmount(value, fieldName)` — validates non-negative number
- `sanitizeDate(value, fieldName)` — validates date string
- `sanitizeEnum(value, allowed, fieldName)` — validates against allowed set

---

## 7. Email & Notifications

Provider: **Resend** (`lib/resend.ts`)

Emails sent:
| Trigger | Recipient | Template |
|---------|-----------|---------|
| Lease created | Tenant | Contract + signature link |
| Unit transfer | Tenant | New lease + signature link |
| Payment approved | Tenant | Receipt confirmation |
| Payment reminder | Tenant | Outstanding balance |
| Vacate approved | Tenant | Move-out date confirmation |
| Password reset | User | Reset link |

All emails use inline HTML with brand colors (orange/red gradient). Reply-to: configured in `EMAIL_CONFIG.replyTo`.

---

## 8. Payment Integrations

### M-Pesa (Daraja API)
- STK Push: tenant pays via phone prompt
- Callback URL: `/api/payments/mpesa/callback`
- Auto-reconciliation: callback matches payment by amount + phone
- Config: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`

### Paystack
- Card payments for tenants
- Webhook: `/api/paystack/webhook`
- Subaccounts per property for split payments
- Config: `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`

### Manual Payments
Admin-recorded offline payments (cash, cheque, bank transfer). Instant COMPLETED status. Audit logged.

---

## 9. Security Model

| Layer | Implementation |
|-------|---------------|
| Authentication | JWT (jose), 24h expiry, HttpOnly cookie |
| Authorization | Role check on every protected route |
| CSRF | Double-submit cookie pattern (middleware) |
| SQL Injection | Prisma ORM parameterized queries throughout |
| XSS | `lib/sanitize.ts` strips HTML/JS from free-text inputs |
| Rate Limiting | In-process sliding window (`lib/rate-limit.ts`) |
| Token Rotation | JWT refreshed on `/api/auth/me` |
| Session Timeout | 20-min idle warning modal + auto-logout |
| Audit | `activity_logs` for all state-changing admin actions |

### Remaining Security Work
- Redis-backed rate limiting (multi-instance deployments)
- Sanitization applied only to switch-unit POST — should be expanded to all free-text inputs
- CSRF middleware only active when `hasAuth` cookie present — state-changing unauthenticated routes (password reset, signing) still bypass it (low risk)

---

## 10. Competitive Analysis

### vs Bomahut (Kenya-focused competitor)

| Feature | Makeja Homes | Bomahut |
|---------|-------------|---------|
| M-Pesa Integration | ✅ STK Push + auto-reconcile | ✅ Basic M-Pesa |
| Digital Lease Signing | ✅ Unique token, email delivery | ⚠️ Manual/PDF |
| Unit Transfer Wizard | ✅ 3-step wizard, full audit | ❌ Not documented |
| AI Business Insights | ✅ Claude Haiku powered | ❌ None |
| In-system Chatbot | ✅ Njiti Agent | ❌ None |
| Multi-tenancy SaaS | ✅ Schema-per-tenant isolation | ⚠️ Shared DB |
| Tax & Compliance (KRA) | ✅ VAT + withholding | ⚠️ Basic |
| Maintenance Workflow | ✅ Full lifecycle + inventory link | ✅ Basic |
| Inventory + POs | ✅ Full PO workflow | ⚠️ Limited |
| Bulk Operations | ✅ Bulk bills, reminders | ⚠️ Limited |
| Audit Log | ✅ Action-filtered, paginated | ❌ Unknown |
| Mobile-responsive | ✅ Mobile nav drawer | ✅ |
| Collapsible Mega-menu | ✅ Grouped, no-scroll | ❌ Flat list |

### vs Buildium / AppFolio (Global platforms)

| Feature | Makeja Homes | Buildium / AppFolio |
|---------|-------------|---------------------|
| Kenya-specific (KES, M-Pesa, KRA) | ✅ Native | ❌ USD/USD |
| Affordability for SME landlords | ✅ KSH pricing | ❌ $50-$300+/mo |
| Lease digital signing | ✅ | ✅ |
| Tenant portal | ✅ | ✅ |
| Maintenance tracking | ✅ | ✅ |
| Accounting integration | ❌ No QuickBooks/Xero | ✅ |
| Owner portal (investor view) | ❌ Not yet | ✅ |
| Online advertising / vacancy listings | ❌ Not yet | ✅ |
| Document storage | ❌ Not yet | ✅ |
| Mobile native app | ❌ Web only | ✅ |

### Key Strengths of Makeja Homes
1. **Deep Kenya-market fit** — M-Pesa, KES, KRA tax, Swahili-aware
2. **AI-powered features** — Insights (Claude), Njiti chatbot
3. **Unit transfer workflow** — best-in-class 3-step wizard
4. **Schema-per-tenant isolation** — true data security per company
5. **Comprehensive audit trail** — full action history
6. **Digital lease signing** — no PDFs, no printing
7. **Reactive automation** — billing, garbage, water auto-generation

### Weaknesses & Solutions

| Weakness | Impact | Solution |
|----------|--------|---------|
| No accounting integration | Can't export to QuickBooks/Xero | Add CSV export; long-term: Xero API |
| No owner/investor portal | Owners can't view their returns | Separate OWNER role with read-only dashboard |
| No document storage | Lease PDFs not stored/downloadable | Tenant receipt download (in roadmap) + document upload |
| No vacancy advertising | Property managers still use OLX/Bedsitter.co.ke | Basic listing page (later feature) |
| No mobile app | Mobile experience via responsive web | PWA manifest + offline support |
| Rate limiting in-memory | Won't scale on multi-instance | Redis-backed rate limiting |
| Single email provider | If Resend is down, no emails | Fallback provider (SendGrid/SES) |
| No 2FA | Security gap for high-value accounts | TOTP or SMS 2FA |

---

## 11. Open Tasks & Roadmap

### Priority 1 — High Impact, Near-term

#### 1.1 Tenant Receipt PDF Download
- `receiptUrl` field exists in payments table
- Need: `/api/tenant/payments/[id]/receipt` → generate PDF (using `@react-pdf/renderer` or Puppeteer)
- Page: receipt button on tenant payments history
- **Effort:** 1-2 days

#### 1.2 Redis-backed Rate Limiting
- Current `lib/rate-limit.ts` uses in-memory Map — breaks on multi-instance (Vercel auto-scales)
- Solution: `@upstash/ratelimit` (Upstash Redis) — drop-in replacement
- **Effort:** 2 hours

#### 1.3 Input Sanitization Expansion
- `lib/sanitize.ts` exists but only applied to switch-unit POST
- Apply to: maintenance titles/descriptions, expense descriptions, payment notes, user name fields
- **Effort:** 2-3 hours

#### 1.4 2FA (Two-Factor Authentication)
- Add TOTP (Google Authenticator) or SMS OTP for ADMIN accounts
- Critical for SaaS security compliance
- **Effort:** 2-3 days

### Priority 2 — Medium Impact

#### 2.1 Public Stats API
- `/api/public/stats` returning aggregate counts (properties managed, units, tenants) for landing page
- Replace hardcoded marketing numbers
- **Effort:** 2 hours

#### 2.2 Tenant Receipt Download
- Already described in 1.1 — high priority for tenant experience

#### 2.3 Document Storage
- Allow uploading lease PDFs, ID docs, damage assessment photos
- Storage: Cloudflare R2 or AWS S3
- **Effort:** 3-4 days

#### 2.4 Owner/Investor Portal
- New role: OWNER
- Read-only dashboard showing: their properties, occupancy, monthly revenue, expenses, net income
- **Effort:** 3-5 days

#### 2.5 CSV/Excel Export
- Export payments, tenants, bills to CSV/XLSX
- Critical for accounting teams who use Excel
- **Effort:** 1-2 days

#### 2.6 Lease Renewal Notifications
- Auto-email tenants 60 days before lease expiry
- Admin dashboard alert for leases expiring in 30/60/90 days (partial: expiring-leases API exists)
- **Effort:** 1 day

### Priority 3 — Future Enhancements

#### 3.1 Native Mobile App (PWA)
- Add `manifest.json` and service worker for Progressive Web App
- Works on iOS/Android from browser (no app store)
- **Effort:** 1 day for PWA; 4-8 weeks for native

#### 3.2 Accounting Integration
- Export to Xero or QuickBooks via OAuth
- Map: payments → income, expenses → expense, deposits → liability
- **Effort:** 5-7 days

#### 3.3 Vacancy Listing Page
- Public-facing property/unit listing (like a mini Bedsitter.co.ke)
- Potential lead generation channel
- **Effort:** 3-5 days

#### 3.4 WhatsApp Notifications
- Replace or supplement email with WhatsApp Business API
- High open rates in Kenya
- **Effort:** 2-3 days (Twilio/360dialog)

#### 3.5 Njiti Agent — Live Data Queries
- Connect Njiti to actual API endpoints
- "What's my occupancy this month?" → queries `/api/dashboard/stats`
- Requires server-side processing (move Njiti to hybrid client+API model)
- **Effort:** 3-4 days

#### 3.6 Fallback Email Provider
- If Resend fails, fall back to SendGrid or AWS SES
- **Effort:** 4 hours

---

## 12. Deployment Notes

### Environment Variables Required
```bash
# Database
DATABASE_URL=               # Tenant schema connection string
MASTER_DATABASE_URL=        # Master DB (companies table)

# Auth
JWT_SECRET=                 # Min 32 characters, random

# Email
RESEND_API_KEY=             # Resend API key
EMAIL_FROM=                 # e.g. "Makeja Homes <noreply@makejahomes.com>"
EMAIL_REPLY_TO=             # e.g. "support@makejahomes.com"

# App
NEXT_PUBLIC_APP_URL=        # e.g. "https://app.makejahomes.com"

# M-Pesa
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=

# Paystack
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=

# AI (optional)
ANTHROPIC_API_KEY=          # For AI Insights (Claude Haiku)
```

### Vercel Deployment
1. Connect GitHub repo to Vercel
2. Set all environment variables in Vercel dashboard
3. Enable edge middleware (already configured in `middleware.ts`)
4. Configure custom domain: `*.makejahomes.com` for subdomain routing

### Database Provisioning
Each new company: POST `/api/super-admin/provision` → creates schema + seeds default data

### Scheduled Tasks
`/api/cron/daily-tasks` — run daily via Vercel Cron or external scheduler:
- Auto-generate recurring bills
- Send payment reminders for overdue bills
- Flag expiring leases

---

*Makeja Homes — Built for Kenyan Property Managers*
