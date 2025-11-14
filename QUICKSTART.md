# Quick Start Guide - Mizpha Rentals

## Getting Started in 5 Minutes

### 1. Install & Setup (2 minutes)

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and add your PostgreSQL connection string
# DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mizpharentals"
```

### 2. Initialize Database (2 minutes)

```bash
# Create database tables
npm run prisma:migrate:dev

# Seed with sample data
npm run prisma:seed

# Open Prisma Studio to view your data
npm run prisma:studio
```

### 3. Access the System (1 minute)

Default admin credentials:
- **Email**: admin@mizpharentals.com
- **Password**: admin123

**⚠️ Change this password immediately!**

---

## Common Operations

### Using Prisma Client

First, import Prisma Client in your application:

```javascript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

### User Management

#### Create a new user
```javascript
const user = await prisma.user.create({
  data: {
    email: 'manager@example.com',
    password: hashedPassword, // Hash with bcrypt first!
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
    role: 'MANAGER',
    isActive: true,
  },
});
```

#### Find user by email
```javascript
const user = await prisma.user.findUnique({
  where: { email: 'manager@example.com' },
});
```

#### Update user role
```javascript
await prisma.user.update({
  where: { id: userId },
  data: { role: 'ADMIN' },
});
```

### Property & Unit Management

#### Get all properties with units
```javascript
const properties = await prisma.property.findMany({
  include: {
    units: {
      where: { status: 'VACANT' },
    },
  },
});
```

#### Create a new unit
```javascript
const unit = await prisma.unit.create({
  data: {
    propertyId: 'property-id',
    unitNumber: 'C4',
    floor: '2nd',
    type: 'TENANCY',
    status: 'VACANT',
    rentAmount: 50000,
    depositAmount: 50000,
    bedrooms: 2,
    bathrooms: 1,
    squareFootage: 900,
    features: ['Balcony', 'Parking'],
    description: 'Beautiful 2-bedroom apartment',
  },
});
```

#### Update unit status
```javascript
await prisma.unit.update({
  where: { id: unitId },
  data: { status: 'OCCUPIED' },
});
```

### Tenant Management

#### Create a tenant (with user)
```javascript
// First create the user
const user = await prisma.user.create({
  data: {
    email: 'tenant@example.com',
    password: hashedPassword,
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumber: '+1234567890',
    role: 'TENANT',
  },
});

// Then create the tenant profile
const tenant = await prisma.tenant.create({
  data: {
    userId: user.id,
    unitId: unitId,
    nationalId: 'ID12345678',
    dateOfBirth: new Date('1990-01-01'),
    occupation: 'Software Engineer',
    employer: 'Tech Corp',
    emergencyContactName: 'John Smith',
    emergencyContactPhone: '+1234567891',
    emergencyContactRelation: 'Spouse',
    moveInDate: new Date(),
  },
});
```

#### Get tenant with lease and payments
```javascript
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId },
  include: {
    user: true,
    unit: {
      include: { property: true },
    },
    leases: {
      where: { status: 'ACTIVE' },
    },
    payments: {
      orderBy: { paymentDate: 'desc' },
      take: 10,
    },
  },
});
```

### Lease Management

#### Create a lease agreement
```javascript
const lease = await prisma.leaseAgreement.create({
  data: {
    leaseNumber: `LEASE-${Date.now()}`,
    tenantId: tenantId,
    unitId: unitId,
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    monthlyRent: 50000,
    depositAmount: 50000,
    paymentDueDay: 1,
    lateFeeAmount: 2500,
    lateFeeGraceDays: 5,
    autoRenew: false,
    createdById: userId,
  },
});
```

#### Find expiring leases (next 30 days)
```javascript
const expiringLeases = await prisma.leaseAgreement.findMany({
  where: {
    status: 'ACTIVE',
    endDate: {
      gte: new Date(),
      lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  include: {
    tenant: {
      include: { user: true },
    },
    unit: {
      include: { property: true },
    },
  },
});
```

### Payment Management

#### Record an M-PESA payment
```javascript
const payment = await prisma.payment.create({
  data: {
    referenceNumber: `PAY-${Date.now()}`,
    tenantId: tenantId,
    unitId: unitId,
    leaseId: leaseId,
    amount: 50000,
    paymentType: 'RENT',
    paymentMethod: 'M_PESA',
    status: 'COMPLETED',
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-01-31'),
    paymentDate: new Date(),
    createdById: userId,
  },
});
```

#### Record a manual payment
```javascript
const payment = await prisma.payment.create({
  data: {
    referenceNumber: `PAY-${Date.now()}`,
    tenantId: tenantId,
    unitId: unitId,
    leaseId: leaseId,
    amount: 50000,
    paymentType: 'RENT',
    paymentMethod: 'BANK_TRANSFER',
    status: 'PENDING',
    bankName: 'First Bank',
    transactionId: 'TXN123456',
    paymentDate: new Date(),
    createdById: userId,
    notes: 'Payment via bank transfer',
  },
});
```

#### Verify a manual payment
```javascript
await prisma.payment.update({
  where: { id: paymentId },
  data: {
    status: 'COMPLETED',
    verifiedById: adminUserId,
    verifiedAt: new Date(),
  },
});
```

#### Get payment history
```javascript
const payments = await prisma.payment.findMany({
  where: {
    tenantId: tenantId,
    status: 'COMPLETED',
  },
  orderBy: { paymentDate: 'desc' },
  include: {
    unit: true,
    lease: true,
  },
});
```

### Renovation Management

#### Create a renovation request
```javascript
const renovation = await prisma.renovationRequest.create({
  data: {
    unitId: unitId,
    title: 'Repaint Living Room',
    description: 'Living room walls need repainting',
    estimatedCost: 15000,
    status: 'PENDING',
    priority: 2, // 1=High, 2=Medium, 3=Low
    createdById: userId,
    requestedStartDate: new Date(),
    requestedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});
```

#### Approve a renovation request
```javascript
await prisma.renovationRequest.update({
  where: { id: renovationId },
  data: {
    status: 'APPROVED',
    approvedById: adminUserId,
    approvedAt: new Date(),
  },
});
```

#### Track renovation progress
```javascript
// Start renovation
await prisma.renovationRequest.update({
  where: { id: renovationId },
  data: {
    status: 'IN_PROGRESS',
    actualStartDate: new Date(),
  },
});

// Complete renovation
await prisma.renovationRequest.update({
  where: { id: renovationId },
  data: {
    status: 'COMPLETED',
    actualEndDate: new Date(),
    actualCost: 14500,
    afterImages: ['url1', 'url2'],
  },
});
```

### Inventory Management

#### Add inventory item
```javascript
const item = await prisma.inventoryItem.create({
  data: {
    name: 'Paint - Blue (5L)',
    description: 'Premium blue paint',
    category: 'PAINT',
    sku: 'PAINT-BLU-5L',
    quantity: 20,
    minimumQuantity: 10,
    unitOfMeasure: 'buckets',
    unitCost: 2500,
    totalValue: 50000,
    location: 'Storage Room A',
    supplier: 'PaintCo Ltd',
  },
});
```

#### Record inventory movement
```javascript
// Stock IN
await prisma.$transaction([
  prisma.inventoryMovement.create({
    data: {
      inventoryItemId: itemId,
      type: 'IN',
      quantity: 10,
      reason: 'Purchase Order PO-001',
      referenceNumber: 'PO-001',
      performedBy: userId,
    },
  }),
  prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      quantity: { increment: 10 },
      totalValue: { increment: 25000 },
    },
  }),
]);

// Stock OUT
await prisma.$transaction([
  prisma.inventoryMovement.create({
    data: {
      inventoryItemId: itemId,
      type: 'OUT',
      quantity: -5,
      reason: 'Renovation Request REN-001',
      referenceNumber: 'REN-001',
      performedBy: userId,
    },
  }),
  prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      quantity: { decrement: 5 },
      totalValue: { decrement: 12500 },
    },
  }),
]);
```

#### Get low stock items
```javascript
const lowStock = await prisma.$queryRaw`
  SELECT * FROM inventory_items
  WHERE quantity <= minimum_quantity
  AND deleted_at IS NULL
  ORDER BY quantity ASC
`;
```

### Purchase Order Management

#### Create purchase order
```javascript
const po = await prisma.purchaseOrder.create({
  data: {
    orderNumber: `PO-${Date.now()}`,
    vendorName: 'Hardware Supplies Ltd',
    vendorContact: '+1234567890',
    vendorEmail: 'sales@hardware.com',
    status: 'DRAFT',
    subtotal: 50000,
    taxAmount: 7500,
    shippingCost: 2500,
    totalAmount: 60000,
    createdById: userId,
    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    items: {
      create: [
        {
          inventoryItemId: itemId1,
          itemName: 'Paint - White (5L)',
          quantity: 20,
          unitPrice: 2500,
          totalPrice: 50000,
        },
      ],
    },
  },
});
```

#### Approve purchase order
```javascript
await prisma.purchaseOrder.update({
  where: { id: poId },
  data: {
    status: 'APPROVED',
    approvedById: adminUserId,
    approvedAt: new Date(),
  },
});
```

### Expense Tracking

#### Create expense
```javascript
const expense = await prisma.expense.create({
  data: {
    expenseNumber: `EXP-${Date.now()}`,
    category: 'MAINTENANCE',
    description: 'Plumbing repair - Unit C1',
    amount: 8500,
    propertyId: propertyId,
    vendor: 'Quick Fix Plumbing',
    vendorContact: '+1234567890',
    paymentMethod: 'BANK_TRANSFER',
    isPaid: false,
    requiresApproval: true,
    expenseDate: new Date(),
    createdById: userId,
    receipts: ['receipt-url-1'],
  },
});
```

#### Approve expense
```javascript
await prisma.expense.update({
  where: { id: expenseId },
  data: {
    approvedById: adminUserId,
    approvedAt: new Date(),
  },
});
```

### Reporting Queries

#### Monthly revenue by property
```javascript
const revenue = await prisma.payment.groupBy({
  by: ['unitId'],
  where: {
    status: 'COMPLETED',
    paymentType: 'RENT',
    paymentDate: {
      gte: new Date('2024-01-01'),
      lt: new Date('2024-02-01'),
    },
  },
  _sum: {
    amount: true,
  },
});
```

#### Occupancy rate
```javascript
const totalUnits = await prisma.unit.count({
  where: { propertyId: propertyId },
});

const occupiedUnits = await prisma.unit.count({
  where: {
    propertyId: propertyId,
    status: 'OCCUPIED',
  },
});

const occupancyRate = (occupiedUnits / totalUnits) * 100;
```

#### Outstanding payments
```javascript
const outstanding = await prisma.payment.findMany({
  where: {
    status: 'PENDING',
    paymentDate: {
      lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  },
  include: {
    tenant: {
      include: { user: true },
    },
    unit: true,
  },
});
```

---

## Next Steps

1. **Integrate with your backend**: Use these examples in your Express/NestJS/Fastify app
2. **Add authentication**: Implement JWT-based auth with role checks
3. **Build API endpoints**: Create RESTful or GraphQL APIs
4. **Add frontend**: Connect with React/Vue/Next.js
5. **Setup M-PESA**: Integrate M-PESA Daraja API for payment processing
6. **Configure email**: Setup email notifications for payments, leases, etc.

## Useful Resources

- [Prisma Client API Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Happy coding! 🚀**
