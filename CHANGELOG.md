# Changelog - Makeja Homes Property Management System

All notable changes to this project will be documented in this file.

## [Version 1.0.0] - 2025-12-28

### ✅ COMPLETED FEATURES

#### Core System
- Multi-tenant property management platform
- Role-based access control (ADMIN, MANAGER, CARETAKER, STOREKEEPER, TECHNICAL)
- PostgreSQL database with Prisma ORM
- Next.js 14 with App Router
- Authentication with JWT tokens

#### Property Management
- ✅ Properties CRUD with archive/restore functionality
- ✅ Dynamic property type filtering (from database)
- ✅ Staff assignments (managers, caretakers, storekeepers)
- ✅ Property status tracking (active/archived)
- ✅ Reactive statistics based on filters
- ✅ Archive functionality with deletedAt tracking

#### Unit Management
- ✅ Units with multiple types (STUDIO, ONE_BED, TWO_BED, etc.)
- ✅ Unit status tracking (VACANT, OCCUPIED, MAINTENANCE, RESERVED)
- ✅ Rent and deposit amount management
- ✅ Unit assignment to tenants

#### Tenant Management
- ✅ Tenant creation with automatic credentials
- ✅ Tenant personal information management
- ✅ Separate edit modes:
  - Personal info edit (name, email, phone, ID)
  - Financial/lease info read-only (edit from units/leases)
- ✅ Tenant vacate functionality with full workflow:
  - Sets user as inactive
  - Terminates all leases
  - Marks unit as vacant
  - Updates lease end date to actual date
- ✅ Historical tenant data tracking
- ✅ Vacated tenant filtering (fixed to show leaseEndDate <= today)
- ✅ Most recent lease data display on cards
- ✅ Reactive statistics (filtered by property, status, search)

#### Lease Management
- ✅ Comprehensive lease lifecycle:
  - PENDING → Awaiting tenant signature
  - ACTIVE → Signed and current
  - EXPIRED → Naturally ended or renewed
  - TERMINATED → Admin terminated early
  - CANCELLED → Cancelled before activation
- ✅ Lease CRUD operations
- ✅ Lease renewal workflow:
  - Marks old lease as EXPIRED with actual end date
  - Creates new lease with PENDING status
  - Preserves all terms for new lease
- ✅ Lease termination with actual end date tracking
- ✅ Lease editing (dates, amounts, terms)
- ✅ Lease viewing with full details
- ✅ Reactive statistics (Total, Active, Pending, Expiring Soon, Terminated, Revenue)
- ✅ Property and status filtering
- ✅ Expiring soon detection (30 days)
- ✅ Lease as snapshot (doesn't affect unit pricing)

#### User Management
- ✅ User CRUD with property assignments
- ✅ Role-based permissions
- ✅ Staff property assignments (multi-property support)
- ✅ User status tracking (active/inactive)
- ✅ Reactive user statistics

#### UI/UX Improvements
- ✅ Gradient color schemes (purple/pink for tenants, blue/cyan for leases)
- ✅ Status badges with appropriate colors
- ✅ Button labels (View, Edit, Delete, Vacate, etc.)
- ✅ Loading states and notifications
- ✅ Responsive design
- ✅ Confirm modals for destructive actions
- ✅ Success/error notification system

### 🔧 BUG FIXES

#### Recent Fixes (Dec 28, 2025)
- Fixed property archive functionality (added deletedAt to API response)
- Fixed vacated tenant filter (removed isActive filter, fixed date logic)
- Fixed user form properties.map error (array extraction from API response)
- Fixed tenant edit form (personal info only, lease/unit read-only)
- Fixed tenant create form (financial fields read-only, auto from unit)
- Fixed lease data structure mismatch in page query
- Fixed tenant cards to show most recent lease data
- Fixed tenant status to include PENDING leases
- Updated all stats to be reactive to filters

### 📊 CURRENT DATABASE SCHEMA

#### Core Tables
- users (authentication, staff, tenants)
- properties (buildings/complexes)
- units (individual rental units)
- tenants (tenant records with snapshots)
- lease_agreements (lease contracts)
- payments (rent payments)
- maintenance_requests (maintenance workflow)
- security_deposits (deposit tracking)
- damage_assessments (property damage)
- vacate_notices (tenant move-out)

#### Key Enums
- Role: ADMIN, MANAGER, CARETAKER, STOREKEEPER, TECHNICAL
- UnitStatus: VACANT, OCCUPIED, MAINTENANCE, RESERVED
- UnitType: STUDIO, ONE_BED, TWO_BED, THREE_BED, PENTHOUSE
- LeaseStatus: PENDING, DRAFT, ACTIVE, EXPIRED, TERMINATED, CANCELLED
- PropertyType: RESIDENTIAL, COMMERCIAL, MIXED_USE

### 🎯 DESIGN DECISIONS

1. **Lease as Snapshot**: Lease amounts are independent of unit pricing
   - Unit pricing: base price for new tenants
   - Lease pricing: locked for current agreement
   - Renewal: creates new snapshot with updated pricing

2. **Actual End Dates**: System tracks actual vs planned dates
   - Renewal: sets old lease endDate to today (actual end)
   - Termination: sets endDate to today (actual termination)
   - Display: shows when lease actually ended, not planned date

3. **Reactive Statistics**: All stat cards update based on current filters
   - Tenants: property, status, search filters
   - Users: role, status, search filters  
   - Properties: type, status, staff, search filters
   - Leases: property, status, search filters

4. **Tenant Status Logic**:
   - Active: has ACTIVE or PENDING lease
   - Pending Approval: has PENDING lease (awaiting signature)
   - Inactive: no active/pending leases

### 🚀 NEXT PHASE

#### Digital Contract Management (In Progress)
- Automated email delivery
- PDF contract generation
- Digital signature capture
- Comprehensive audit trail
- Token-based secure signing
- IP and device fingerprinting

## [Version 0.9.0] - Previous Versions
*(Earlier development history)*
