# Makeja Homes — Claude Session Log

This file tracks every Claude working session on this project.
Update it at the end of each session with what was done, what was fixed, and what's pending.

---

## Session Format

```
## Session N — YYYY-MM-DD
**Commits:** hash1, hash2
**Focus:** one-line summary

### Done
- bullet list of completed work

### Fixed
- bugs fixed

### Pending / Next
- what to pick up in the next session
```

---

## Session 1 — Project Bootstrap
**Commits:** `d99d0f4`, `b17d558`
**Focus:** Initial commit — core property management system (Mizpha Rentals)

### Done
- Initial property management system with multi-property dashboards
- Tenant tracking, payments, PDF exports
- Rebranded to Makeja Homes (.co.ke)

---

## Session 2 — Auth & Multi-tenancy Foundation
**Commits:** `45c00a3` → `78aac65`
**Focus:** Auth system, multi-tenant architecture, company isolation

### Done
- Complete authentication system (multi-user login, session management)
- Multi-tenant company isolation with `companyId` filtering
- Password reset system
- Contact form with email notifications
- AI chatbot (early version)
- WhatsApp integration
- Landing page + contact page
- Archive/restore property system

---

## Session 3 — Property & Tenant Lifecycle
**Commits:** `8c6af52` → `03ae057`
**Focus:** Multi-tenant property management, staff arrays, archive system

### Done
- Complete multi-tenant property management with staff arrays
- Property-user assignment system
- Property archive system with tenant lifecycle management
- Company name display on dashboard
- Safe stat fallbacks and error handling

---

## Session 4 — Tenant Portal & Financial Infrastructure
**Commits:** `b3c9470` → `94a2d37`
**Focus:** Tenant portal, payments, lease contracts, bills

### Done
- Tenant dashboard (raw SQL, `mustChangePassword` enforcement)
- Tenant portal overhaul — payments, bills, lease, maintenance, alerts
- Tenant profile page — personal info, tenancy details, change password
- Payment flow: Paystack card + M-Pesa STK Push
- Lease contract editor + send-contract flow
- Signed lease protection (can't overwrite after signing)
- Partial payment support
- Deposit payment propagation
- Property contract template editor

---

## Session 5 — Schema-per-Tenant Migration
**Commits:** `119711d` → `c867e61`
**Focus:** Migrating from companyId isolation to schema-per-tenant on Neon

### Done
- Schema-per-tenant architecture (`tenant_{slug}` on Neon PostgreSQL)
- `getPrismaForRequest()` — resolves correct tenant schema from JWT/subdomain
- Onboarding schema provisioner — new tenants get full schema on signup
- All ORM routes rewritten to `$queryRawUnsafe` / `$executeRawUnsafe`
- Role-separated login (admin vs tenant portals)
- Instance-scoped staff list
- Deposit enum fixes + upsert patterns
- Switch-instance — jump between company accounts without re-login
- Resend invite flow for staff

---

## Session 6 — HR, Payroll & Staff Management
**Commits:** `69a0a98` → `aa6148c`
**Focus:** HR system, payroll, staff onboarding

### Done
- HR/payroll system — staff profiles, payroll enrollment, payroll processing
- Payroll roster shows only enrolled staff (not all users)
- Payroll enrollment gates on accepted invite
- `noSalary` flag for staff who don't receive payroll
- User creation flow — pending badge, invite system
- Staff profiles table self-healed for existing schemas

---

## Session 7 — Financial Infrastructure Rebuild
**Commits:** `e14b229` → `4c04be8`
**Focus:** Full financial infrastructure — all ORM routes replaced with raw SQL

### Done
- Complete financial infrastructure rebuild — all routes converted to raw SQL
- Bill reference parsing fix (billId with underscores)
- Paystack webhook — HMAC-SHA512 verified, idempotent
- Payment schema patching for legacy column names on existing tenants
- Allow payments without Paystack subaccount configured
- Deposit shows as paid after Paystack payment

---

## Session 8 — Deposits Lifecycle
**Commits:** `7d8d508`
**Focus:** Complete deposits lifecycle — tracking, assessment, refund

### Done
- Security deposit full lifecycle: PENDING → HELD → REFUNDED
- Damage assessment UI
- Deposit refund calculation (deposit − damages − deductions)
- Refund breakdown visual
- Deposit-refund page and API route
- `Activity` icon import fix on deposit-refund page
- `patchPaymentsSchema` ghost import removed from deposit-refund route

---

## Session 9 — Njiti AI Agent
**Commits:** `25f9e43`
**Focus:** Embedded AI assistant with role-scoped live data

### Done
- Njiti AI agent — powered by Claude (`claude-haiku-4-5-20251001`)
- Role-scoped live data context fetched from tenant DB before every response:
  - ADMIN/MANAGER: portfolio aggregates (bills, maintenance, revenue, deposits)
  - TENANT: personal account only (their bills, payment, deposit, maintenance)
  - CARETAKER: maintenance queue counts + urgency
  - STOREKEEPER: stock levels, low stock, pending POs
- Role-specific quick action buttons in the chat widget
- Role-personalised welcome messages
- Tenant data isolation enforced — tenants cannot extract portfolio stats
- `NjitiAgent` component receives `role` + `firstName` props from layout
- TS2347 errors fixed (removed invalid generics from `$queryRawUnsafe` calls)

---

## Session 10 — Operations Lifecycle (Major)
**Commits:** `907f813`
**Focus:** Complete maintenance, inventory, and purchase orders lifecycle

### Done

**Maintenance:**
- New request form — fully role-aware:
  - TENANT: unit auto-detected from profile, no priority/cost fields shown
  - CARETAKER/ADMIN: full property + unit picker, priority selector, cost field
  - After submit, navigates directly to new request detail page
- Maintenance list — Kanban swimlane view (Open / In Progress / Completed), grid toggle, emergency pulse banner, urgency scoring, overdue badges
- Maintenance detail page (748 lines) — full workflow:
  - `AssignModal` — select caretaker + priority
  - `CompleteModal` — actual cost + notes
  - `RejectModal` — reason
  - Progress timeline (Submitted → Approved → In Progress → Completed)
  - Role-gated action buttons
  - 20-second polling
- All 5 workflow API routes rewritten from Prisma ORM to raw SQL: approve, assign, start, complete, reject
- Maintenance stats now include `urgentCount` (HIGH + EMERGENCY, non-completed)
- Complete route fixed: property lookup was using `mr."propertyId"` (doesn't exist) — fixed to JOIN through units

**Materials Tracking:**
- `maintenance_materials` table (self-healing)
- `/api/maintenance/[id]/materials` — GET (list + totals), POST (record, optional inventory deduction with stock check + movement), DELETE
- `MaterialsPanel` embedded in detail page — inventory picker, deduct checkbox, running total, delete
- On completion: expense auto-created = materials total + labour cost

**Inventory:**
- Supplier fields added: name, contact, phone, email, supplier price, SKU
- Self-healing `ALTER TABLE ADD COLUMN IF NOT EXISTS` for existing tenant tables
- Add item form — two-tab layout (Item Details + Supplier Info)
- Edit item form — same two-tab layout, quantity diff banner, adjustment movement auto-recorded on qty change
- `/api/inventory/[id]` — PATCH replaces PUT, records adjustment movements, includes supplier fields
- Low stock alert banner, stock progress bars, category pills

**Purchase Orders:**
- New order form — inventory items (auto-fill supplier, low stock flagged) + custom items
- Custom items: "Add to inventory when received" toggle — expands to capture category, reorder level, supplier
- On RECEIVED: stock incremented, custom items created as inventory items, expense auto-logged
- Detail page — progress timeline, status advancement buttons, cancel
- `/api/purchase-orders/[id]` — GET + PATCH with full RECEIVED automation
- `purchase_order_items` — `addToInventory` + `newInventoryData` JSONB columns added

**Real-time Polling:**
- Maintenance, inventory, purchase-orders list pages — 30s silent poll, no skeleton flash, cleanup on unmount
- `onRefresh` callbacks use `load(true)` (silent) so manual refresh doesn't flash

**Other:**
- Sidebar: Bills + Deposits nav links added for ADMIN and MANAGER
- Njiti system prompt updated with maintenance lifecycle section
- Purchase Orders added to Njiti nav for ADMIN, MANAGER, STOREKEEPER

### Fixed
- `inventory/page.tsx` — duplicate `Plus` component conflicting with lucide import
- `deposit-refund/page.tsx` — missing `Activity` icon import
- `deposit-refund/route.ts` — `patchPaymentsSchema` ghost import removed, replaced with inline self-heal
- Complete route — `mr."propertyId"` doesn't exist, fixed to join through `units` table
- Maintenance stats — `urgentCount` missing from API response

---

## Session 11 — Docs, Hooks & Hygiene
**Commits:** `f38ca55`
**Focus:** README, git hooks, deploy hygiene

### Done
- `README.md` — full project documentation:
  - Architecture, multi-tenancy pattern, role table
  - Operations lifecycle diagrams (maintenance + PO)
  - Project structure tree
  - Local dev setup + `.env.local` template
  - Deployment guide — three commands, env vars list
  - Njiti AI section
  - Key conventions (raw SQL, self-heal, ID format, JWT scoping, polling)
  - Contributing guide
- `.githooks/pre-commit` — runs `tsc --noEmit`, blocks commit on TypeScript errors
- `.githooks/pre-push` — blocks pushing to any branch other than `main`
- Both hooks tracked in repo under `.githooks/` (copy to `.git/hooks/` on fresh clone)
- Full 90-item test checklist documented (see chat)
- `SESSIONS.md` — this file created

### Pending / Next
- Test all 90 checklist items end-to-end
- Water & utilities billing — verify sub-meter readings flow
- Reports & Insights — verify financial reports render correctly
- Expenses page — verify auto-logged expenses from maintenance + POs show up
- Tax & Compliance module — review current state
- Tenant-facing maintenance detail page — verify tenant can follow their request status
- Notifications — email alerts on maintenance status changes
- Low stock → auto-suggest purchase order (currently shows warning, no auto-draft)

---

## Session 12 — Tenant Detail Page & Maintenance Email Notifications
**Commits:** (pending)
**Focus:** Tenant maintenance detail view + email notifications for all maintenance status changes

### Done

**Tenant Maintenance Detail Page:**
- New page: `/app/dashboard/tenant/maintenance/[id]/page.tsx`
  - Visual progress timeline (Submitted → Approved → Assigned → In Progress → Completed)
  - Shows description, category, priority, dates, assigned technician
  - Completion notes panel (green card) when resolved
  - Cancelled state shows rejection reason inline
  - "You'll receive an email when the status changes" nudge for open requests
- New API route: `/app/api/tenant/maintenance/[id]/route.ts` — fetches single request with tenant ownership check
- List page updated: cards are now clickable rows (→ detail page) instead of expand/collapse
  - `ChevronRight` replaces `ChevronDown/Up`; `expandedId` state removed

**Maintenance Email Notifications:**
- `lib/email.ts` — `sendMaintenanceNotification()` added
  - Handles 5 events: `submitted`, `assigned`, `in_progress`, `completed`, `rejected`
  - Consistent branded HTML template (purple gradient header)
  - Non-fatal: returns `false` on failure instead of throwing
- Wired into:
  - `POST /api/tenant/maintenance` → notifies admin (SMTP_USER) on new submission
  - `POST /api/maintenance/[id]/assign` → notifies tenant on assignment
  - `POST /api/maintenance/[id]/complete` → notifies tenant on completion
  - `POST /api/maintenance/[id]/reject` → notifies tenant on rejection with reason
- `requestNumber` added to SELECT in assign, complete, reject routes (was missing)
- Tenant join query in POST enriched with `propertyName`, `unitNumber`, user fields

### Fixed (addendum)
- Water/utilities routes (create, list, update, stats, billing/water-reading) — all 5 rewritten from ORM (`getPrismaForTenant`) to raw SQL (`getPrismaForRequest`) — consistent with rest of codebase, eliminates ORM fragility on tenant schemas
- Reports expenses sub-report — was filtering by `createdAt` instead of `date`, causing backdated manually-entered expenses to appear in wrong date range

### Pending / Next
- Test all 90 checklist items end-to-end

---

## Session 13 — Finance Audit, Audit Logs, Utilities + Expenses + Recurring Charges Revamp
**Commits:** (pending)
**Focus:** Full finance module audit + deposit visibility fix + audit logs rebuild + UI overhauls across utilities, expenses, recurring charges

### Done

**Deposit Visibility Fix:**
- Paystack webhook (`/api/paystack/webhook/route.ts`) — full rewrite from ORM to raw SQL
  - On `charge.success` with `paymentType === 'DEPOSIT'`: upserts `security_deposits` table with `status = 'HELD'`
  - Self-heals `security_deposits` table on every run
  - Activity log written after completion
  - Non-deposit payments still mark monthly bills as usual
- Admin deposits GET (`/api/admin/deposits/route.ts`) — backward-compatibility fix
  - Added `paystackDepositRows` query: finds completed DEPOSIT payments not yet in `security_deposits`
  - Modified `inferredRows` to exclude tenants already covered
  - All three sources merged: `[...depositRows, ...paystackDepositRows, ...inferredRows]`

**Tenant Transactions Page:**
- New page: `/app/dashboard/tenant/transactions/page.tsx`
  - 3 stat cards: Total Paid, Pending count, All Time count
  - Filter tabs: ALL / COMPLETED / PENDING / FAILED / RENT / DEPOSIT
  - Search by reference / type
  - Expandable transaction rows with full detail
  - `generateReceiptHtml()` + `downloadReceipt()` — downloads styled HTML receipt for completed payments
  - PENDING shows "awaiting verification" message instead of download
- Backend: `/api/tenant/payments/history/route.ts` — rewritten from ORM to raw SQL
  - JOINs units + properties for `unitNumber`, `propertyName`
  - LEFT JOIN monthly_bills for `billMonth`, `billDueDate`
  - Returns `verificationStatus`, `transactionId`, `paystackReference`
- Tenant sidebar: "Transactions" nav item added (Receipt icon, links to `/dashboard/tenant/transactions`)

**Audit Logs (full rebuild):**
- New API: `/api/admin/audit-logs/route.ts`
  - Full pagination (`page`, `limit` capped at 100)
  - Filters: `search`, `action` (ILIKE), `entity` (ILIKE), `userId`, `dateFrom`, `dateTo`
  - Returns `logs[]`, `pagination{}`, `actionBreakdown{}`
  - LEFT JOIN users for name/email/role on each log entry
  - Self-heals `activity_logs` table
- New page: `/app/dashboard/admin/audit/page.tsx` — complete rebuild
  - `ACTION_META` map (20+ actions: icon, color, label, category)
  - `CATEGORY_COLORS` + `ROLE_COLORS` mappings
  - Auto-refresh every 30s with live sync indicator (green/yellow dot)
  - Clickable action breakdown chips (top 5, click to filter)
  - Expandable filter panel: action text, entity type select, date range
  - Log rows: icon + category badge + entity label + user role badge + relative timestamp
  - Expanded row: metadata grid + raw JSON details in monospace pre block
  - Pagination with page number buttons
  - Export CSV button

**Utilities UI Revamp:**
- `/app/dashboard/admin/utilities/page.tsx` — render section rebuilt (all modals/logic preserved)
  - Compact header with small bordered action buttons (no large gradients)
  - Slim overdue alert banner
  - 2×2 stat cards grid, water cards clickable to filter
  - Single-row search + property select filter bar
  - Tenant TABLE replacing 3-column card grid
    - Status dot (red/yellow/green), last reading in subtitle
    - Inline CTAs: Water, Garbage, History buttons per row

### Fixed
- Water billing routes — all 5 converted from ORM to raw SQL (see Session 12 addendum)
- Reports expenses date filter — `e."createdAt"` → `e.date` in WHERE clause

**Recurring Charges UI Revamp:**
- `/app/dashboard/admin/recurring-charges/page.tsx` — list section rebuilt (all modals preserved)
  - Compact 2xl header + small "New Charge" button
  - 4 stat cards: Total Charges, Monthly Value, Active count, Categories
  - Single-row filter bar: search + property + status selects
  - Compact table replacing 3-column card grid: name/category, properties, amount/billing day, frequency, applies-to, status dot, icon-only action buttons

**Expenses UI Revamp:**
- `/app/dashboard/admin/expenses/ExpensesClient.tsx` — full UI rewrite
  - Page header added
  - 4 stat cards: Total Expenses, This Month, Filtered Total, Categories count
  - Category breakdown chips (top 5 by spend) — clickable to filter
  - Single-row filter bar: search + category select + collapsible date range / property filter
  - Compact table replacing 3-column card grid: expandable rows show full detail inline (property, date, method, notes)

### Fixed
- Water billing routes — all 5 converted from ORM to raw SQL (see Session 12 addendum)
- Reports expenses date filter — `e."createdAt"` → `e.date` in WHERE clause

### Pending / Next
- `start` maintenance event email (`in_progress`) not wired — `/api/maintenance/[id]/start/route.ts` updated but verify
- Test all 90 checklist items end-to-end
- Verify Paystack webhook correctly writes `security_deposits` on live deposit payments

---

## Session 14 — Complete ORM Sweep + Switch Unit UI + Finance Fixes
**Commits:** `1a23817`, `abf6130`
**Focus:** Full codebase sweep — zero `getPrismaForTenant` and zero `resend` SDK remaining in any active API route

### Done

**Finance / Properties Dropdown Fix:**
- Root cause: `getPrismaForTenant` was resolving to public schema on all tenant schemas
- Fixed: `admin/properties/route.ts`, `admin/properties/list/route.ts`, `admin/properties/[id]/rates/route.ts` → raw SQL
- All finance dropdowns (water rates, deposits, recurring charges, utilities) now show correct property list

**Payments & Deposits:**
- `admin/payments/list/route.ts` — raw SQL with full JOIN, filters, pagination
- `admin/payments/verify/route.ts` — raw SQL + Nodemailer + on APPROVED DEPOSIT upserts `security_deposits`
- `admin/payments/receipt/route.ts` — LEFT JOIN users for verifiedBy
- `admin/tenants/with-bills/route.ts` — DISTINCT ON, raw SQL
- `admin/tenants/active/route.ts` — batched IN-clause queries (no N+1)
- `admin/tenants/[id]/outstanding-bills/route.ts` — raw SQL
- `tenant/payments/current-bill/route.ts`, `paystack-init/route.ts`, `create-manual/route.ts` — raw SQL + Nodemailer

**Switch Unit UI:**
- `TenantsClient.tsx` — added full modal: current→new unit visual, vacant unit picker, effective date, rent override, deposit toggle, notes
- Wired to existing GET/POST `/api/tenants/[id]/switch-unit` — Nodemailer email on switch

**Bills (admin):**
- `admin/bills/list/route.ts` — raw SQL with dynamic WHERE (status/property/month)
- `admin/bills/create/route.ts` — raw SQL duplicate check + INSERT
- `admin/bills/[id]/mark-paid/route.ts` — raw SQL UPDATE
- `admin/bills/generate/route.ts` — batched queries (existing bills, water, garbage) before loop
- `admin/bills/preview/route.ts` — same batch approach, no N+1
- `admin/bills/reminders/individual/route.ts` — raw SQL (reminder email hookup ready)

**Garbage Fees:**
- `admin/billing/garbage-fee/route.ts` — upsert garbage fee + upsert monthly bill, raw SQL
- `admin/garbage-fees/create/route.ts` — raw SQL upsert
- `admin/garbage-fees/history/route.ts` — full JOIN query
- `admin/garbage-fees/auto-generate/route.ts` — raw SQL, lease-date-aware backfill
- `admin/garbage-fees/reactive-stats/route.ts` — dynamic WHERE with optional property JOIN

**Properties:**
- `admin/properties/utility-settings/route.ts` — GET + PUT raw SQL

**Tenants:**
- `admin/tenants/history/route.ts` — batched water/garbage/lease queries

**Tenant routes:**
- `tenant/payments/upload-proof/route.ts` — ownership check via JOIN, raw SQL UPDATE
- `tenant/lease/sign/[token]/route.ts` — full rewrite: raw SQL throughout, Nodemailer welcome email

**Leases:**
- `leases/[id]/renew/route.ts` — raw SQL: expire old + create new + set unit RESERVED
- `leases/[id]/terminate/route.ts` — raw SQL: TERMINATED + VACANT + tenant leaseEndDate
- `leases/[id]/send-contract/route.ts` — Nodemailer replacing resend

**Other routes:**
- `payments/route.ts` — raw SQL INSERT with enum casting
- `dashboard/expiring-leases/route.ts` — raw SQL JOIN with 90-day window
- `inventory/[id]/adjust/route.ts` — raw SQL: movement INSERT + item UPDATE + activity log; removed `requireRole` (uses JWT from cookie)
- `water-readings/route.ts` — raw SQL INSERT
- `units/route.ts` — raw SQL with optional status filter
- `units/[id]/route.ts` — raw SQL GET/PUT/DELETE; PUT builds dynamic SET clause
- `contact/route.ts` — raw SQL INSERT
- `auth/validate-reset-token/route.ts` — raw SQL + JOIN for token + user
- `sign-lease/route.ts` — Nodemailer replacing resend
- `users/route.ts` — Nodemailer replacing resend
- `users/[id]/resend-invite/route.ts` — Nodemailer replacing resend
- `properties/[id]/units/[unitId]/assign-tenant/route.ts` — Nodemailer replacing resend
- `cron/daily-tasks/route.ts` — Nodemailer replacing resend (4 email calls)

### Fixed
- All `resend` SDK usage removed (was broken — `@/lib/resend` not configured)
- All `getPrismaForTenant` usage removed (was resolving wrong schema on multi-tenant Neon)
- TypeScript: passes `tsc --noEmit` clean after all changes

### Pending / Next
- End-to-end test all 90 checklist items
- Verify Paystack webhook writes `security_deposits` on live deposit payments
- Wire `in_progress` start event email in `/api/maintenance/[id]/start/route.ts`

---

## Session 15 — Activity Logging, Dashboard Revamp & Audit Reactivity
**Commits:** (this session)
**Focus:** Comprehensive activity logging across all routes, live reactive dashboard, audit log fixes

### Done

**Activity Logging — full wiring:**
- Created `lib/log-activity.ts` — shared non-fatal helper using raw SQL with `ON CONFLICT (id) DO NOTHING`
- Wired `logActivity()` into 13+ routes covering all key system events:
  - `LOGIN` — captured inline in login route with role + IP in details
  - `PAYMENT_APPROVED` / `PAYMENT_DECLINED` — payment verification route
  - `PAYMENT_SUBMITTED` — tenant manual payment submission
  - `BILLS_GENERATED` — bulk bill generation with count + skipped
  - `BILL_CREATED` — individual bill creation
  - `BILL_MARKED_PAID` — admin mark-as-paid
  - `WATER_READING_RECORDED` / `WATER_READING_UPDATED` — water readings
  - `LEASE_CONTRACT_SENT` — contract email dispatch
  - `LEASE_SIGNED` — tenant signs via magic link
  - `LEASE_RENEWED` / `LEASE_TERMINATED` — lease lifecycle
  - `USER_CREATED` — staff invite/creation
  - `UNIT_STATUS_CHANGED` — unit PUT when status field is present

**Dashboard Stats API (`/api/dashboard/stats`) — major rewrite:**
- **Critical bug fixed:** `"paidAt"` → `"paymentDate"` — revenue was always 0 (column doesn't exist)
- Added `status::text` casting throughout to fix silent enum comparison failures
- New parallel queries: `vacantUnits`, `reservedUnits`, `pendingBillsCount`, `pendingPayments` (awaiting verification), `expiringLeases` (30-day window), `billsThisMonth` (total/paid/collected/expected), `collectionRate`
- `recentActivity` — last 8 `activity_logs` entries with LEFT JOIN users
- 6-month revenue history loop now uses `paymentDate` correctly
- All new fields returned in response

**Dashboard Page (`/app/dashboard/admin/page.tsx`) — full revamp:**
- Auto-refresh: polls `/api/dashboard/stats` every 30s silently (no skeleton flash), manual refresh button
- Skeleton loading state on first load
- New secondary stats row: Pending Verification, Expiring Leases (30d), Open Maintenance — color-coded alerts when non-zero
- Overdue bills strip — full-width red alert, only shown when overdue > 0
- Occupancy panel now shows Reserved units alongside Occupied/Vacant
- New Bills This Month panel: progress bar (paid X of Y), collected vs expected amounts
- Revenue chart: Y-axis `k` notation, tooltip formatted as `KSH X,XXX`
- Recent Activity: real data from `stats.recentActivity` with `ACTION_META` icons/colors, user name + role + context, links to full audit page
- `StatCard` extracted as reusable component

**Audit Log (`/app/dashboard/admin/audit/page.tsx`) — already reactive (extended):**
- `ACTION_META` extended with 14 new actions (BILL_CREATED, BILLS_GENERATED, PAYMENT_SUBMITTED, WATER_READING_RECORDED, WATER_READING_UPDATED, LEASE_CONTRACT_SENT, LEASE_RENEWED, LEASE_TERMINATED, USER_CREATED, UNIT_STATUS_CHANGED, etc.)
- `Utilities` category added to `CATEGORY_COLORS`
- 30-second auto-refresh already in place; live sync indicator

### Fixed
- Revenue always showing 0 on dashboard — `paidAt` column doesn't exist; fixed to `paymentDate`
- Enum comparison failures in stats queries — added `::text` casts throughout
- Audit logs empty despite system activity — root cause: `logActivity()` not called anywhere meaningful; fixed by wiring into 13+ routes including login
- `resend` SDK fully removed — replaced all 6 usages with Nodemailer SMTP

### Pending / Next
- End-to-end test all 90 checklist items
- Verify Paystack webhook writes `security_deposits` on live deposit payments
- Wire `in_progress` start event email in `/api/maintenance/[id]/start/route.ts`

---

## Session 16 — Comprehensive Security Hardening
**Commits:** `734c142`, `fba2b5b`
**Focus:** Deep security pass — JWT revocation, rate-limit persistence, private file storage, tenant isolation, missing auth guards

### Done

**JWT Token Revocation (`lib/token-blocklist.ts` — NEW):**
- `revokeToken(jti)` + `isRevoked(jti)` backed by Upstash Redis with in-memory fallback
- All token-issuing routes now include `.setJti(crypto.randomUUID())` on every JWT
- `isRevoked()` checked in `getCurrentUserFromRequest` and `getCurrentUser` (auth-helpers)
- Revocation wired into: logout, password-change, switch-instance

**Persistent Rate Limiting (`lib/rate-limit.ts` — rewrite):**
- Uses `@upstash/ratelimit` + `@upstash/redis` when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` env vars are set
- Falls back to in-process sliding window when Redis is unavailable
- Solves cold-start bypass: in-process Map resets on every serverless instance restart
- Added `passwordReset` limiter (5/hour/IP); all limiter functions now return `Promise<RateLimitResult>`
- Fixed 8 call sites that were missing `await` on the now-async `limiters.*()` calls

**Private File Storage (proof-of-payment):**
- Upload route saves to `/private/uploads/proof-of-payment/` (outside Next.js static handler)
- UUID filename generated server-side; magic byte validation (JPEG/PNG/PDF headers)
- New authenticated serve route: `GET /api/uploads/proof/[filename]`
  - Validates UUID.ext filename pattern (no path traversal)
  - TENANT: ownership JOIN check against payments table
  - ADMIN/MANAGER: schema membership check
  - Falls back to legacy `/public/uploads/` path for old files
  - `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`
- `private/uploads/proof-of-payment/.gitkeep` tracked with `git add -f`

**Tenant Isolation Fixes:**
- `lib/auth-helpers.ts` — removed `x-tenant-slug` header fallback; JWT-only for schema resolution
- `lib/auth-tenant.ts` — rewritten: verified JWT first → subdomain → never header alone
- `lib/get-prisma.ts` — priority: JWT cookie → subdomain → `x-tenant-slug` header last; slug validated `/^[a-z0-9-]+$/`
- `lib/prisma.ts` — same priority order fix
- `app/api/leases/[id]/send-contract/route.ts` — slug from `resolveSchema(request)` not `x-tenant-slug` header
- `app/api/properties/[id]/units/[unitId]/assign-tenant/route.ts` — same slug fix

**Auth & Session Hardening:**
- All JWT cookies changed from `sameSite: "none"` → `"lax"`
- Login, me, change-password, switch-instance all issue tokens with `jti`
- bcrypt work factor raised to 12 throughout (was 10)
- Password length cap (128 chars) added to login + change-password
- Logout: clears both `token` and `csrf_token` cookies, revokes `jti`
- `crypto.getRandomValues()` for temp password generation (was `Math.random()`)

**CSRF Enforcement (middleware):**
- Rewritten to use `jwtVerify()` instead of raw base64 decode for `mustChangePassword` check
- CSRF now **blocks** if cookie+header don't match (was silently passing when absent)
- Security headers added to every response: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (prod only)
- Paystack webhook excluded from CSRF check

**Password Reset Token Hashing:**
- `forgot-password`: stores `bcrypt.hash(rawToken, 10)` instead of raw token
- `reset-password` + `validate-reset-token`: fetch 20 unexpired candidates per schema, use `bcrypt.compare()` to match
- Prevents token theft from DB breach

**SQL Injection Fix:**
- `tenant/payments/initiate/route.ts` — `LIKE '%${billId}%'` (template literal) → `LIKE '%' || $2 || '%'` (parameterized)

**Leases Route Auth:**
- `GET /api/leases` was completely unauthenticated — added JWT auth + ADMIN/MANAGER/CARETAKER role check

**Missing Auth Guards (7 routes — Session 16 continuation):**
- `PATCH /api/users/[id]/deactivate` — ADMIN/MANAGER only
- `PATCH /api/users/[id]/activate` — ADMIN/MANAGER only
- `GET /api/properties/all` — any logged-in staff role
- `PATCH /api/properties/[id]/archive` — ADMIN only
- `PATCH /api/properties/[id]/restore` — ADMIN only
- `GET/PUT/DELETE /api/properties/[id]/units/[unitId]` — GET: any staff, PUT: ADMIN/MANAGER, DELETE: ADMIN
- `POST /api/properties/[id]/units/create-with-tenant` — ADMIN/MANAGER only

**Other:**
- `app/api/users/route.ts` — email format validation, stripped `details: error.message` from 500 responses
- 14 API routes — stripped `details: error.message` from error responses (prevents internal leakage)
- `app/api/debug/route.ts` — confirmed already returns 404 in production; no issue
- `app/api/payments/mpesa/callback` — confirmed intentionally unauthenticated (Safaricom calls directly); blast radius limited as `CheckoutRequestID` must pre-exist in DB

### Fixed
- Pre-commit hook blocked on `.next/types` (missing until first build) — added `grep -v ".next/types"` filter
- Rate limiter TypeScript errors — `limiters.*()` now async; 8 call sites were missing `await`
- `new NextResponse(fileBuffer, ...)` — Buffer type cast `as unknown as BodyInit`

### Pending / Next
- Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to production env for persistent rate limiting + token revocation
- End-to-end test all 90 checklist items
- Verify Paystack webhook writes `security_deposits` on live deposit payments
- Wire `in_progress` start event email in `/api/maintenance/[id]/start/route.ts`

---

## Session 17 — Super-Admin System Rebuild
**Commits:** `a6a29b3`
**Focus:** Replace shared-password super-admin with individual accounts, invite flow, fast client dashboard

### Done
- **Individual accounts**: Created `lib/super-admin-db.ts` — `super_admin_users` table in public schema, self-healed via raw SQL (no Prisma model). Stores bcrypt password, OWNER/VIEWER role, invite token + expiry.
- **Email + password login**: Rewrote `/api/super-admin/auth/route.ts` — takes `{email, password}`, seeds owner from env vars on first login (`seedOwnerIfEmpty()`), timing-safe against user enumeration.
- **Shared session helper**: `lib/super-admin-auth.ts` — `getSuperAdminSession()` accepts x-super-admin-secret header OR super_admin_token cookie. Returns `{id, email, firstName, lastName, saRole}`. All SA routes updated to use it.
- **OWNER / VIEWER roles**: Mutations (invite, role change, activate/suspend) blocked with 403 for VIEWERs. Reads available to both.
- **Invite system**: `POST /api/super-admin/team` — OWNER generates invite link (UUID token, 48h expiry), sends branded email. If email fails, link returned in response body for manual sharing.
- **Accept invite flow**: `GET/POST /api/super-admin/accept-invite` + `app/super-admin/(auth)/accept-invite/page.tsx` — validates token, shows invite info, sets password, clears token, issues session.
- **Team management page**: `/super-admin/settings` — table of team members, invite modal with role selector, copy-link button after invite, toggle active/inactive, inline role change.
- **Fixed redirect loop (ERR_TOO_MANY_REDIRECTS)**: Middleware now sets `x-pathname` header on every request. Layout reads it and skips auth check when path is `/super-admin/login` or `/super-admin/accept-invite`.
- **Fixed slow/timeout dashboard**: Removed per-tenant PrismaClient spawning from companies list endpoint. Was O(n) connections for n tenants. Now single master-schema query only.
- **Sidebar rebuild**: Shows current user name, initials avatar, role (Full Admin / Viewer). Fetches from `GET /api/super-admin/auth` on mount.
- **New pages**: `/super-admin/settings` (team), `/super-admin/subscriptions` (redirects to clients), `(auth)/accept-invite`.
- **Middleware**: Added `mpesa` to CSRF exclusion pattern.

### Fixed
- `ERR_TOO_MANY_REDIRECTS` on `/super-admin/login` — layout was wrapping login page and redirecting infinitely
- Super-admin dashboard timing out on load — per-tenant Prisma connection spawning removed
- TypeScript: clean pass (0 errors) after all changes

### Pending / Next
- **Add to Vercel production env**: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_FIRST_NAME`, `SUPER_ADMIN_LAST_NAME` (password already there as `SUPER_ADMIN_PASSWORD`)
- First login at `makejahomes.co.ke/super-admin/login` will seed the owner account from those env vars
- Consider blocking VIEWER role on company activate/suspend/reinstate endpoints (currently allowed)
- Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to production env (rate limiting persistence)

---

## Session 18 — Super-Admin Auth Polish, Profile Page, Splash Screen
**Commits:** `7719f34`, `01adc18`, `0dbffdc`, `bb1cc6f`, `440bafc`, `40dde23`, `e972e4d`, `8494314`
**Focus:** Fix login failures, add profile/password-change, animated splash screen, logout + redirect bugs

### Done
- **Seed endpoint** (`GET /api/super-admin/seed`): one-time owner account creation secured by `CRON_SECRET`. Idempotent — resets password hash if account already exists. Used to recover when `seedOwnerIfEmpty` ran before env vars were set.
- **Fixed multi-statement SQL error** (`42601`): `SELF_HEAL_SQL` had `CREATE TABLE` + `CREATE INDEX` in one string — Prisma can't prepare multiple statements. Split into two separate `$executeRawUnsafe` calls in both `seed/route.ts` and `lib/super-admin-db.ts`.
- **Fixed bcrypt mismatch — trailing newline**: Vercel env vars had `\n` appended to `SUPER_ADMIN_PASSWORD`. Added `.trim()` to all env var reads in seed, `seedOwnerIfEmpty`, and login body parsing. Debug endpoint (`?debug=1`) confirmed the issue via `passwordLastChar: "\n"`.
- **Profile page** (`/super-admin/profile`): shows name, email, role badge, account created date, last login. Change-password form requires current password, validates new+confirm match, min 8 chars, must differ from current. Wired to `GET/PUT /api/super-admin/profile`.
- **Profile API** (`/api/super-admin/profile`): GET returns session user info; PUT fetches stored hash, verifies current password with `bcrypt.compare`, hashes new password at cost 12, updates DB.
- **Profile link in sidebar**: added "My Profile" nav item with `UserCircle` icon.
- **Animated login splash screen**: floating particles, pulsing gradient orbs, subtle grid overlay, logo with scan-line shimmer effect, staggered field slide-up animations, glowing violet button with hover shimmer, "Access granted" success state with animated dots.
- **Fixed logout sidebar persistence**: changed `router.replace("/super-admin/login")` → `window.location.href` so full page load clears the layout's server-side auth state.
- **Fixed post-login wrong dashboard / needs refresh**: changed `router.replace("/super-admin")` → `window.location.href` after successful login — same root cause (layout ran server auth check before cookie was set).

### Fixed
- `42601` Prisma error: multi-statement self-heal SQL
- bcrypt always failing: trailing `\n` in Vercel env var value
- Sidebar visible on login page after logout
- Dashboard not loading properly after login until manual refresh

### Pending / Next
- Change password from profile then use it to log in (smoke test)
- Consider blocking VIEWER on company mutation endpoints
- Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to Vercel production env
- Remove or gate the `/api/super-admin/seed` endpoint once stable (currently open with CRON_SECRET guard)

---

## How to Update This File

At the end of every Claude session, add a new entry:

1. Run `git log --oneline` to get commit hashes
2. Fill in what was done, fixed, and what's pending
3. Commit: `git add SESSIONS.md && git commit -m "docs: update session log"`
4. Push: `git push origin main`
