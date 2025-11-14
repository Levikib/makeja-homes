# Next.js 14 Frontend Setup Guide

## Overview

The Mizpha Rentals Property Management System now includes a full-featured Next.js 14 frontend with App Router, TypeScript, Tailwind CSS, Shadcn/ui components, and NextAuth.js authentication.

## Project Structure

```
mizpharentals/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── [...nextauth]/   # NextAuth.js handler
│   │   │   ├── register/        # User registration
│   │   │   └── forgot-password/ # Password reset
│   │   └── users/               # User management API
│   ├── auth/                     # Authentication pages
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   ├── forgot-password/     # Password reset page
│   │   └── error/               # Auth error page
│   ├── dashboard/               # Protected dashboard routes
│   │   ├── admin/               # Admin dashboard
│   │   ├── manager/             # Manager dashboard
│   │   ├── storekeeper/         # Storekeeper dashboard
│   │   ├── technical/           # Technical staff dashboard
│   │   ├── caretaker/           # Caretaker dashboard
│   │   └── tenant/              # Tenant dashboard
│   ├── unauthorized/            # Access denied page
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Landing page
│   └── globals.css              # Global styles
├── components/                   # React components
│   ├── ui/                      # Shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   └── card.tsx
│   ├── dashboard/               # Dashboard components
│   │   ├── sidebar.tsx          # Navigation sidebar
│   │   └── dashboard-layout.tsx # Dashboard layout wrapper
│   └── providers/               # Context providers
│       └── session-provider.tsx # NextAuth session provider
├── lib/                         # Utility functions
│   ├── utils.ts                 # General utilities
│   ├── prisma.ts                # Prisma client singleton
│   ├── auth.ts                  # NextAuth configuration
│   └── auth-helpers.ts          # Authentication helpers
├── types/                       # TypeScript type definitions
│   └── next-auth.d.ts          # NextAuth type extensions
├── prisma/                      # Database (existing)
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
├── middleware.ts                # Route protection middleware
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── components.json             # Shadcn/ui configuration
```

## User Roles & Permissions

The system supports 6 distinct user roles with hierarchical access control:

1. **ADMIN** - Full system access
2. **MANAGER** - Property and tenant management
3. **STOREKEEPER** - Inventory and purchase order management
4. **TECHNICAL** - Maintenance and renovation management
5. **CARETAKER** - Property oversight and basic maintenance
6. **TENANT** - Personal rental information and services

## Authentication System

### NextAuth.js Configuration

- **Provider**: Credentials (email/password)
- **Adapter**: Prisma Adapter for database integration
- **Session Strategy**: JWT (stateless)
- **Password Hashing**: bcryptjs with 12 rounds

### Key Features

- ✅ Role-based authentication
- ✅ Secure password hashing
- ✅ Session management
- ✅ Protected routes with middleware
- ✅ Automatic role-based redirects
- ✅ Last login tracking

### Authentication Pages

- `/auth/login` - User login
- `/auth/register` - New tenant registration (default role: TENANT)
- `/auth/forgot-password` - Password reset request
- `/auth/error` - Authentication error handling

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Make sure your `.env` file includes:

```bash
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mizpharentals"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret-key-change-in-production-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

**Important**: Generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Run Database Migrations

```bash
npm run prisma:migrate:dev
```

### 5. Seed the Database

```bash
npm run prisma:seed
```

This creates sample users with all 6 roles (password: `password123`)

### 6. Start the Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Default User Accounts

After seeding, you can login with these accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@mizpharentals.com | password123 | ADMIN |
| manager@mizpharentals.com | password123 | MANAGER |
| storekeeper@mizpharentals.com | password123 | STOREKEEPER |
| technical@mizpharentals.com | password123 | TECHNICAL |
| caretaker@mizpharentals.com | password123 | CARETAKER |
| tenant@mizpharentals.com | password123 | TENANT |

## Route Protection

### Middleware

The `middleware.ts` file protects all `/dashboard/*` routes and requires authentication. It automatically:

- Redirects unauthenticated users to `/auth/login`
- Enforces role-based access control
- Redirects users to their appropriate dashboard if they access unauthorized routes

### Role-Based Access

```typescript
// In your page component
import { requireRole } from "@/lib/auth-helpers"

export default async function AdminPage() {
  // Only ADMIN can access
  const user = await requireRole(["ADMIN"])

  // Your page content
}
```

## API Routes

### Example: User Management API

```typescript
// GET /api/users - List all users (ADMIN only)
// POST /api/users - Create new user (ADMIN only)
```

API routes can use authentication helpers:

```typescript
import { requireRole } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  const user = await requireRole(["ADMIN"])
  // Your API logic
}
```

## Styling

### Tailwind CSS

- Utility-first CSS framework
- Custom design tokens in `tailwind.config.ts`
- Dark mode support (class-based)

### Shadcn/ui Components

Pre-built, customizable components:
- Button, Input, Label, Card
- All components are in `components/ui/`
- Fully typed with TypeScript
- Accessible by default

Add more components:
```bash
npx shadcn-ui@latest add [component-name]
```

## Development Scripts

```bash
# Development
npm run dev              # Start dev server (port 3000)

# Production
npm run build            # Build for production
npm start                # Start production server

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate:dev    # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed database

# Linting
npm run lint             # Run ESLint
```

## Next Steps

### Recommended Additions

1. **API Routes**: Create CRUD endpoints for:
   - Properties
   - Units
   - Tenants
   - Leases
   - Payments
   - Inventory
   - Renovations

2. **Dashboard Pages**: Build out sub-pages for each role:
   - Properties management
   - Tenant management
   - Payment processing
   - Inventory tracking
   - Maintenance requests

3. **Forms**: Add data entry forms with react-hook-form and zod validation

4. **Data Tables**: Implement sortable, filterable tables for data display

5. **File Uploads**: Add image/document upload functionality

6. **Notifications**: Implement real-time notifications

7. **Email Integration**: Connect SMTP for password resets and notifications

8. **M-PESA Integration**: Add M-PESA payment processing for tenant rent payments

9. **Reports**: Generate financial and operational reports

10. **Analytics Dashboard**: Add charts and metrics visualization

## Troubleshooting

### Common Issues

**Issue**: "PrismaClient is unable to run in the browser"
- **Solution**: Make sure you're using `lib/prisma.ts` for the Prisma client and only importing it in server components or API routes.

**Issue**: "Module not found" errors
- **Solution**: Run `npm install` and restart the dev server

**Issue**: "NextAuth callback error"
- **Solution**: Check that NEXTAUTH_SECRET is set in `.env` and NEXTAUTH_URL matches your app URL

**Issue**: "Database connection failed"
- **Solution**: Verify DATABASE_URL in `.env` and ensure PostgreSQL is running

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/ui Documentation](https://ui.shadcn.com)

## License

This project is proprietary and confidential.
