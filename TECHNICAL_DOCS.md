# Technical Documentation - Makeja Homes

## Architecture Overview

### Frontend Architecture
```
app/
├── dashboard/
│   └── admin/
│       ├── properties/     # Property management
│       ├── units/          # Unit management
│       ├── tenants/        # Tenant management
│       ├── leases/         # Lease management
│       └── users/          # User management
├── api/                    # API routes
└── components/             # Reusable components
```

### Data Flow

#### Tenant Creation Flow
```
1. Admin selects unit
2. Fills tenant personal info
3. System auto-populates financial data from unit
4. Creates user account with credentials
5. Creates tenant record (snapshot of unit data)
6. Creates PENDING lease
7. Sends credentials to tenant email
```

#### Lease Renewal Flow
```
1. Admin clicks "Renew" on active lease
2. Sets new dates and amounts
3. System marks old lease as EXPIRED with endDate = today
4. Creates new lease with status = PENDING
5. Tenant receives contract email
6. Tenant signs → status changes to ACTIVE
```

### Database Design Principles

#### Snapshot Pattern
Used for tenant and lease records to preserve historical data:
- `tenants` table stores snapshot of unit pricing at creation time
- `lease_agreements` stores snapshot of terms for that specific lease
- Unit pricing can change without affecting existing tenants

#### Soft Deletes
Properties use `deletedAt` for soft deletion:
- Allows archiving without data loss
- Enables restore functionality
- Maintains referential integrity

#### Audit Trail
Key tables track:
- `createdAt` - When record created
- `updatedAt` - Last modification
- Status changes (PENDING → ACTIVE → EXPIRED)
- Actual vs planned dates (lease endDate updates on renewal/termination)

## Component Patterns

### Client Components
All pages use Server Components with Client Components for interactivity:
```typescript
// Server Component (page.tsx)
export default async function Page() {
  const data = await prisma.model.findMany();
  return <ClientComponent data={data} />;
}

// Client Component
"use client";
export default function ClientComponent({ data }) {
  const [state, setState] = useState(data);
  // Interactive logic here
}
```

### Filter Pattern
All list pages use reactive filtering:
```typescript
// Property-filtered data
const propertyFilteredItems = useMemo(() => {
  return items.filter(i => !propertyFilter || i.propertyId === propertyFilter);
}, [items, propertyFilter]);

// Stats from property-filtered data
const stats = useMemo(() => ({
  total: propertyFilteredItems.length,
  active: propertyFilteredItems.filter(i => i.status === "ACTIVE").length,
  // ...
}), [propertyFilteredItems]);

// Full filtered data (property + search + status)
const filteredItems = useMemo(() => {
  return propertyFilteredItems.filter(i => {
    const matchesSearch = /* search logic */;
    const matchesStatus = /* status logic */;
    return matchesSearch && matchesStatus;
  });
}, [propertyFilteredItems, searchTerm, statusFilter]);
```

## API Design

### Standard Response Format
```typescript
// Success
{ data: T, success: true }

// Error
{ error: string, details?: string, success: false }
```

### Authentication
JWT tokens stored in cookies, validated in middleware:
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token");
  // Validate and allow/deny access
}
```

## Database Optimization

### Indexes
Critical indexes for performance:
```prisma
@@index([status])
@@index([tenantId])
@@index([propertyId])
@@index([deletedAt])
```

### Query Optimization
- Use `select` to fetch only needed fields
- Include related data with `include` at query time
- Order results in database, not in JavaScript

## State Management

### Server State
- Fetched in Server Components
- Passed as props to Client Components
- Refreshed via `router.refresh()` or `window.location.reload()`

### Client State
- `useState` for UI state
- `useMemo` for derived/filtered data
- No global state management (Redux/Zustand) needed

## Error Handling

### API Routes
```typescript
try {
  const result = await prisma.model.operation();
  return NextResponse.json(result);
} catch (error) {
  console.error("Error:", error);
  return NextResponse.json(
    { error: "Operation failed", details: error.message },
    { status: 500 }
  );
}
```

### Client Components
```typescript
try {
  const response = await fetch("/api/endpoint");
  if (response.ok) {
    // Success
  } else {
    throw new Error();
  }
} catch (error) {
  setNotification({
    type: "error",
    title: "Operation Failed",
    message: "Please try again"
  });
}
```

## Security

### Authentication Flow
1. User logs in → JWT token generated
2. Token stored in httpOnly cookie
3. Middleware validates token on protected routes
4. Role checked against required roles

### Authorization
Role-based access control via helper:
```typescript
await requireRole(["ADMIN", "MANAGER"]);
```

### Data Validation
- Zod schemas for form validation
- Prisma schema for database constraints
- API validation before database operations

## Performance Considerations

### Image Optimization
- Next.js Image component for automatic optimization
- WebP format with fallbacks

### Code Splitting
- Automatic with Next.js App Router
- Dynamic imports for heavy components

### Database
- Connection pooling via Prisma
- Selective field fetching
- Proper indexing

## Testing Strategy

### Manual Testing Checklist
- [ ] Property CRUD operations
- [ ] Unit assignment/unassignment
- [ ] Tenant creation with auto-credentials
- [ ] Lease renewal workflow
- [ ] Lease termination
- [ ] Filter reactivity
- [ ] Archive/restore functionality

### Future: Automated Testing
- Unit tests with Jest
- Integration tests with Playwright
- API endpoint testing

## Deployment

### Requirements
- Node.js 18+ runtime
- PostgreSQL database
- Environment variables configured

### Build Process
```bash
npm run build
npm run start
```

### Database Migration
```bash
npx prisma migrate deploy
```

## Troubleshooting

### Common Issues

**Issue**: Properties not filtering correctly
- Check: `deletedAt` in query
- Fix: Add `where: { deletedAt: null }`

**Issue**: Stats not updating
- Check: `useMemo` dependencies
- Fix: Ensure filtered data is in dependency array

**Issue**: Lease status stuck on PENDING
- Check: Token sent to tenant
- Fix: Implement signature workflow (in progress)

## Code Style Guide

### Naming Conventions
- Components: PascalCase (e.g., `TenantCard`)
- Files: kebab-case (e.g., `tenant-card.tsx`)
- Functions: camelCase (e.g., `handleSubmit`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_UNITS`)

### Component Structure
```typescript
// 1. Imports
import { useState } from "react";

// 2. Types/Interfaces
interface Props { }

// 3. Component
export default function Component({ props }: Props) {
  // 3a. State
  const [state, setState] = useState();
  
  // 3b. Derived state
  const computed = useMemo(() => {}, []);
  
  // 3c. Handlers
  const handleClick = () => {};
  
  // 3d. Effects
  useEffect(() => {}, []);
  
  // 3e. Render
  return <div />;
}
```

## Maintenance

### Regular Tasks
- Database backups (weekly)
- Monitor error logs
- Update dependencies (monthly)
- Review and optimize slow queries

### Monitoring
- Check API response times
- Monitor database connection pool
- Track error rates
- Review user feedback

---

**Last Updated**: December 28, 2025
