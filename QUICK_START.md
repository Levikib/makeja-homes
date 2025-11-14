# Quick Start Guide - Mizpha Rentals

## Start the Application

```bash
# Generate Prisma Client (already done)
npm run prisma:generate

# Run the development server
npm run dev
```

Visit: **http://localhost:3000**

## Login Credentials (After Seeding)

| Email | Password | Role |
|-------|----------|------|
| admin@mizpharentals.com | password123 | ADMIN |
| manager@mizpharentals.com | password123 | MANAGER |
| storekeeper@mizpharentals.com | password123 | STOREKEEPER |
| technical@mizpharentals.com | password123 | TECHNICAL |
| caretaker@mizpharentals.com | password123 | CARETAKER |
| tenant@mizpharentals.com | password123 | TENANT |

## Important Files

- **`.env`** - Environment variables (already configured)
- **`NEXTJS_SETUP.md`** - Complete documentation
- **`middleware.ts`** - Route protection
- **`lib/auth.ts`** - Authentication configuration

## Key Routes

- `/` - Landing page
- `/auth/login` - Login page
- `/auth/register` - Register new tenant
- `/dashboard` - Auto-redirects to role-specific dashboard
- `/dashboard/admin` - Admin dashboard
- `/dashboard/manager` - Manager dashboard
- `/dashboard/storekeeper` - Storekeeper dashboard
- `/dashboard/technical` - Technical dashboard
- `/dashboard/caretaker` - Caretaker dashboard
- `/dashboard/tenant` - Tenant dashboard

## Environment Variables Required

Already configured in `.env`:
- ✅ `DATABASE_URL` - PostgreSQL connection
- ✅ `NEXTAUTH_SECRET` - Authentication secret (change in production!)
- ✅ `NEXTAUTH_URL` - Application URL

## What's Included

✅ **Next.js 14** with App Router
✅ **TypeScript** - Full type safety
✅ **Tailwind CSS** - Utility-first styling
✅ **Shadcn/ui** - Component library
✅ **NextAuth.js** - Authentication with 6 roles
✅ **Prisma Integration** - Database ORM
✅ **Role-based Middleware** - Route protection
✅ **Authentication Pages** - Login, Register, Forgot Password
✅ **6 Role-specific Dashboards** - Pre-built layouts
✅ **API Routes** - Sample user management endpoints
✅ **Responsive Design** - Mobile-friendly

## Next Steps

1. **Start Dev Server**: `npm run dev`
2. **Login** with one of the default accounts
3. **Explore** the role-specific dashboards
4. **Build** additional features using the provided structure

For complete documentation, see **NEXTJS_SETUP.md**
