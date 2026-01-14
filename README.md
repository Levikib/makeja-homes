# Makeja Homes - Property Management System

A comprehensive multi-tenant property management platform built with Next.js 14, Prisma, and PostgreSQL.

## 🏢 Overview

Makeja Homes is a full-featured property management system designed to handle:
- Multiple properties with staff assignments
- Unit management and tenant assignments
- Lease lifecycle management
- Payment tracking
- Maintenance requests
- Security deposits and damage assessments

## 🚀 Features

### Core Functionality
- **Multi-tenant Architecture**: Manage multiple properties from one platform
- **Role-Based Access Control**: 5 user roles with granular permissions
- **Comprehensive Lease Management**: Full lifecycle from creation to termination
- **Automated Workflows**: Tenant creation, lease generation, email notifications
- **Reactive Analytics**: Real-time statistics based on active filters
- **Audit Trail**: Complete history of all actions and changes

### Property Management
- Property CRUD with archive/restore
- Staff assignments (managers, caretakers, storekeepers)
- Dynamic filtering and search
- Property type management (Residential, Commercial, Mixed-Use)
- Unit tracking with status management

### Tenant Management
- Automatic credential generation
- Lease tracking (active, pending, expired, terminated)
- Payment history
- Vacate workflow with full automation
- Historical data preservation

### Lease Management
- Digital contract workflow (in development)
- Lease renewal with status tracking
- Early termination support
- Financial tracking (rent, deposits)
- Expiry alerts (30-day warning)

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens
- **UI Components**: Custom components + Radix UI
- **Styling**: TailwindCSS with gradient themes

## 📦 Installation

### Prerequisites
```bash
- Node.js 18+
- PostgreSQL 14+
- npm or yarn
```

### Setup
```bash
# Clone repository
git clone https://github.com/Levikib/makeja-homes.git
cd makeja-homes

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npm run seed

# Start development server
npm run dev
```

## 🗄️ Database Schema

### Core Tables
- `users` - Authentication and user profiles
- `properties` - Property records
- `units` - Rental units within properties
- `tenants` - Tenant information with lease snapshots
- `lease_agreements` - Lease contracts and terms
- `payments` - Payment transactions
- `maintenance_requests` - Maintenance workflow
- `security_deposits` - Deposit tracking
- `damage_assessments` - Property damage records
- `vacate_notices` - Move-out notifications

### Key Relationships
```
properties → units → tenants → lease_agreements → payments
properties → staff assignments (managers, caretakers, storekeepers)
tenants → security_deposits, damage_assessments, vacate_notices
units → maintenance_requests
```

## 🔑 User Roles

1. **ADMIN**: Full system access
2. **MANAGER**: Property and tenant management
3. **CARETAKER**: Maintenance and property operations
4. **STOREKEEPER**: Inventory and supplies
5. **TECHNICAL**: Technical staff (future)

## 📊 Current Status

**Version**: 1.0.0 (Pre-release)  
**Status**: Active Development  
**Last Updated**: December 28, 2025

### Completed Modules ✅
- Property Management
- Unit Management
- Tenant Management
- Lease Management (Core)
- User Management
- Payment Tracking (Basic)

### In Progress 🚧
- Digital Contract Management
- Email Integration (Resend)
- PDF Generation
- Digital Signatures

### Planned 📋
- Advanced Analytics Dashboard
- Automated Rent Reminders
- Tenant Portal
- Mobile App
- Reporting System

## 🔧 Configuration

### Environment Variables
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
JWT_SECRET="your-secret-key"
RESEND_API_KEY="your-resend-key" # Coming soon
```

### Database Connection
Update `prisma/schema.prisma` with your database URL or use `.env`

## 📝 API Routes

### Properties
- `GET /api/properties/all` - List all properties
- `POST /api/properties` - Create property
- `PUT /api/properties/[id]` - Update property
- `PATCH /api/properties/[id]/archive` - Archive property
- `PATCH /api/properties/[id]/restore` - Restore property

### Leases
- `GET /api/leases` - List leases (with filters)
- `GET /api/leases/[id]` - Get single lease
- `PUT /api/leases/[id]` - Update lease
- `POST /api/leases/[id]/renew` - Renew lease
- `POST /api/leases/[id]/terminate` - Terminate lease

### Tenants
- `GET /api/tenants` - List tenants
- `PUT /api/tenants/[id]` - Update tenant
- `POST /api/tenants/[id]/vacate` - Vacate tenant

## 🤝 Contributing

This is a private project. For collaborators:
1. Create feature branch from `main`
2. Make changes with clear commit messages
3. Test thoroughly
4. Create pull request with description

## 📄 License

Proprietary - All rights reserved

## 👥 Team

- **Levo** - Lead Developer
- **Levikib** - Collaborator

## 🐛 Known Issues

See CHANGELOG.md for recent bug fixes and known issues.

## 📞 Support

For issues or questions, contact the development team.

---

**Built with ❤️ for efficient property management**

---

## 🎉 Recent Updates (January 2026)

### Debug Phase 101A - 72.2% Complete

We've successfully completed 13 out of 18 identified issues across the platform:

#### ✅ Properties Module
- Fixed unit count display on property cards
- Resolved filter duplicates and stats reactivity
- Fixed user deactivation bug affecting staff assignments
- Implemented dynamic caching for property details
- Added comprehensive filtering and stats to property details

#### ✅ Tenants Module
- Fixed button visibility for vacated tenants
- Improved stats accuracy using active lease data
- Clarified lease vs unit rent display logic

#### ✅ Users Module
- Fixed property assignment saving bug

#### ✅ Leases Module
- Enabled public lease signing (no login required)
- Fixed unit status on lease renewal
- Enhanced contract button functionality
- Implemented complete lease termination workflow
- Added signed contract viewing with full details
- Created editable contract template system

#### 🔥 Upcoming Features
- Occupied unit edit workflow with lease renewal
- Tenant unit switching/transfer system
- Professional PDF lease document management
- Automated lease reminders (future)

For detailed changelog, see [CHANGELOG.md](./CHANGELOG.md)

