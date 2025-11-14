# Mizpha Rentals - Property Management System Database

A comprehensive, production-ready PostgreSQL database schema designed for property management using Prisma ORM.

## Features

### Core Functionality
- **Multi-role User Management**: Admin, Manager, Storekeeper, Caretaker, Tenant, Technical
- **Property Management**: Support for multiple properties (Charis, Peniel, Eleazar, Benaiah)
- **Unit Management**: Flexible unit types (Tenancy, Staff, Shop) with custom naming conventions
- **Tenant Management**: Complete tenant profiles with emergency contacts and history
- **Lease Agreements**: Digital lease management with auto-renewal options
- **Payment Processing**: Multiple payment methods (M-PESA, Bank Transfer, Cash, Card, Cheque)
- **Renovation Workflow**: Request, approval, and tracking system
- **Inventory Management**: Stock tracking with low-stock alerts
- **Purchase Orders**: Complete procurement workflow with approval system
- **Expense Tracking**: Categorized expenses with receipt management
- **Activity Logging**: Comprehensive audit trail

### Production-Ready Features
- ✅ Soft deletes on all major entities
- ✅ Comprehensive indexes for query optimization
- ✅ Proper foreign key constraints and cascading
- ✅ Timestamp tracking (createdAt, updatedAt)
- ✅ UUID-based primary keys (CUID)
- ✅ Decimal precision for financial data
- ✅ JSON fields for flexible metadata storage
- ✅ Enum types for data consistency

## Database Schema Overview

### Main Models

#### User Management
- `User`: System users with role-based access control
- `ActivityLog`: Audit trail for all user actions

#### Property & Units
- `Property`: Properties with custom naming conventions
- `Unit`: Individual units with pricing and features
- `Tenant`: Tenant profiles linked to users

#### Financial
- `LeaseAgreement`: Digital lease contracts
- `Payment`: Payment tracking with multiple payment methods
- `Expense`: Expense tracking and approval

#### Operations
- `RenovationRequest`: Renovation workflow management
- `InventoryItem`: Stock management
- `InventoryMovement`: Stock movement tracking
- `PurchaseOrder`: Procurement management
- `PurchaseOrderItem`: Line items for purchase orders

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and update your database connection string:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
   ```

3. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

4. **Create and run migrations**
   ```bash
   npm run prisma:migrate:dev
   ```

   This will:
   - Create your database tables
   - Generate migration files
   - Update Prisma Client

5. **Seed the database** (optional)
   ```bash
   npm run prisma:seed
   ```

   This creates:
   - Default admin user
   - Sample properties
   - Sample units
   - Sample inventory items

## Available Scripts

```bash
# Generate Prisma Client (run after schema changes)
npm run prisma:generate

# Create a new migration (development)
npm run prisma:migrate:dev

# Apply migrations (production)
npm run prisma:migrate:deploy

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Seed the database with initial data
npm run prisma:seed

# Reset database and reseed
npm run prisma:reset
```

## Default Credentials (After Seeding)

```
Email: admin@mizpharentals.com
Password: admin123
```

**⚠️ IMPORTANT**: Change these credentials immediately in production!

## Database Relationships

### Key Relationships

```
User (1) ─── (0..1) Tenant
Tenant (1) ─── (*) LeaseAgreement
Tenant (1) ─── (*) Payment
Unit (1) ─── (*) LeaseAgreement
Unit (1) ─── (*) Payment
Unit (1) ─── (*) Tenant
Property (1) ─── (*) Unit
Property (1) ─── (*) Expense
User (1) ─── (*) RenovationRequest (creator)
User (1) ─── (*) RenovationRequest (approver)
Unit (1) ─── (*) RenovationRequest
PurchaseOrder (1) ─── (*) PurchaseOrderItem
InventoryItem (1) ─── (*) PurchaseOrderItem
InventoryItem (1) ─── (*) InventoryMovement
```

## Enums Reference

### UserRole
- `ADMIN`: Full system access
- `MANAGER`: Property and financial management
- `STOREKEEPER`: Inventory management
- `CARETAKER`: Property maintenance
- `TENANT`: Tenant portal access
- `TECHNICAL`: Technical support and maintenance

### UnitType
- `TENANCY`: Residential units
- `STAFF`: Staff accommodation
- `SHOP`: Commercial spaces

### UnitStatus
- `VACANT`: Available for rent
- `OCCUPIED`: Currently occupied
- `MAINTENANCE`: Under maintenance
- `RESERVED`: Reserved for future tenant

### PaymentMethod
- `M_PESA`: M-PESA mobile money
- `BANK_TRANSFER`: Bank transfer
- `CASH`: Cash payment
- `CARD`: Card/Online payments
- `CHEQUE`: Cheque payment
- `OTHER`: Other payment methods

### PaymentType
- `RENT`: Monthly rent payment
- `DEPOSIT`: Security deposit
- `UTILITY`: Utility bills
- `MAINTENANCE`: Maintenance fees
- `PENALTY`: Late payment penalties
- `OTHER`: Other payment types

## Property Naming Conventions

Each property has a unique naming pattern for floors and units:

- **Charis**: `C1`, `C2`, `C3`, etc.
- **Peniel**: `P101`, `P102`, `P201`, etc.
- **Eleazar**: `E-G01`, `E-G02`, `E-1A`, `E-1B`, etc.
- **Benaiah**: `B-Shop1`, `B-Shop2`, `B-U101`, etc.

These patterns are stored in `Property.floorNamingPattern` for reference.

## Query Examples

### Find all vacant units in a property
```javascript
const vacantUnits = await prisma.unit.findMany({
  where: {
    propertyId: 'property-id',
    status: 'VACANT',
  },
  include: {
    property: true,
  },
});
```

### Get tenant payment history
```javascript
const payments = await prisma.payment.findMany({
  where: {
    tenantId: 'tenant-id',
  },
  orderBy: {
    paymentDate: 'desc',
  },
  include: {
    unit: true,
    lease: true,
  },
});
```

### Find pending renovation requests
```javascript
const pendingRenovations = await prisma.renovationRequest.findMany({
  where: {
    status: 'PENDING',
  },
  include: {
    unit: {
      include: {
        property: true,
      },
    },
    createdBy: true,
  },
  orderBy: {
    priority: 'asc',
  },
});
```

### Check inventory items below minimum
```javascript
const lowStockItems = await prisma.inventoryItem.findMany({
  where: {
    quantity: {
      lte: prisma.inventoryItem.fields.minimumQuantity,
    },
  },
});
```

## Best Practices

### Security
1. Always hash passwords before storing (use bcrypt or argon2)
2. Implement JWT-based authentication
3. Use role-based access control (RBAC)
4. Sanitize all user inputs
5. Implement rate limiting for API endpoints
6. Use prepared statements (Prisma handles this)

### Performance
1. Use `select` to fetch only required fields
2. Implement pagination for large datasets
3. Use database indexes (already configured)
4. Consider caching for frequently accessed data
5. Use transactions for multi-step operations

### Data Integrity
1. Always use soft deletes for important records
2. Implement proper error handling
3. Use database transactions for critical operations
4. Regularly backup the database
5. Implement data validation at application level

## Backup Strategy

### Automated Backups
Set up automated PostgreSQL backups:

```bash
# Daily backup script (add to cron)
pg_dump -U username -d mizpharentals -F c -f backup_$(date +%Y%m%d).dump
```

### Restore from Backup
```bash
pg_restore -U username -d mizpharentals backup_file.dump
```

## Migration Best Practices

1. **Always review migrations** before applying to production
2. **Test migrations** on a staging environment first
3. **Backup database** before running migrations
4. **Use transactions** for data migrations
5. **Document breaking changes** in migration files

## Extending the Schema

To add new features:

1. Edit `prisma/schema.prisma`
2. Run `npm run prisma:migrate:dev --name feature-name`
3. Update seed script if needed
4. Update documentation

## Monitoring & Maintenance

### Recommended Monitoring
- Query performance (slow query log)
- Database size and growth
- Connection pool usage
- Failed transactions
- Low inventory alerts
- Upcoming lease expirations
- Overdue payments

### Regular Maintenance Tasks
- Vacuum database (PostgreSQL)
- Update statistics
- Review and optimize indexes
- Archive old records
- Clean up soft-deleted records
- Review activity logs

## Support & Documentation

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [M-PESA API Documentation](https://developer.safaricom.co.ke/)

## License

ISC

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---

**Built with ❤️ for efficient property management**
