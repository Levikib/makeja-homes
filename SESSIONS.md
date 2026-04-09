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

## How to Update This File

At the end of every Claude session, add a new entry:

1. Run `git log --oneline` to get commit hashes
2. Fill in what was done, fixed, and what's pending
3. Commit: `git add SESSIONS.md && git commit -m "docs: update session log"`
4. Push: `git push origin main`
