# Mizpha Rentals - Property Management System

A comprehensive property management system built with Next.js 14, TypeScript, Prisma, and PostgreSQL.

## 📊 Current System Stats

- **5 Properties** across Nairobi (Kasarani, Ngumba, Umoja x2, Westlands)
- **171 Units** (136 occupied, 34 vacant, 1 reserved)
- **79.53% Occupancy Rate**
- **KSH 1,198,000** Monthly Revenue
- **132 Active Tenants** (6 historical records preserved)
- **138 Lease Agreements** (136 active, 2 terminated)

## 🚀 Features

### ✅ Completed Modules
- **Property Management**: Multi-property support with detailed tracking
- **Unit Management**: Complete CRUD with status tracking (VACANT, OCCUPIED, MAINTENANCE, RESERVED)
- **Tenant Management**: Full tenant lifecycle with historical records tracking
- **Lease Agreements**: Automated lease creation and management with multiple statuses
- **Dashboard**: Futuristic UI with animated visualizations and real-time stats
- **Vacate Workflow**: Complete tenant move-out process preserving historical data

### 🚧 In Development
- **Payments & Billing System** (CRITICAL - managing KSH 1.2M/month)
- **Lease Renewal Workflows** (10+ leases expiring soon)
- **Inventory Management**
- **Expenses Tracking**
- **Purchase Orders**

## 🛠️ Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **UI Components**: Shadcn/ui, Framer Motion
- **Payments**: Paystack (planned)

## 📦 Installation
```bash
# Clone repository
git clone https://github.com/Levikib/mizpha-rentals.git
cd mizpha-rentals

# Install dependencies
npm install

# Setup database
createdb mizpharentals
npx prisma migrate deploy
npx prisma generate

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run development server
npm run dev
```

## 🗄️ Database Setup
```bash
# Create PostgreSQL user and database
sudo -u postgres psql
CREATE USER mizpha WITH PASSWORD 'your_password';
CREATE DATABASE mizpharentals OWNER mizpha;
\q

# Run migrations
npx prisma migrate deploy
```

## 🔑 Environment Variables
```env
DATABASE_URL="postgresql://mizpha:password@localhost:5432/mizpharentals"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## 📊 Database Schema
- **Properties**: 5 active properties generating KSH 1.2M/month
- **Units**: 171 units with multiple types (studio to penthouse)
- **Tenants**: Full historical tracking enabled (critical fix applied Dec 12, 2024)
- **Lease Agreements**: Automated creation with status management
- **Users**: Role-based authentication (Admin, Manager, Caretaker, Tenant, Technical, Storekeeper)

## 🎨 Design Philosophy
Futuristic, sci-fi themed interface with:
- Animated dashboard gauges showing real-time occupancy (79.53%)
- Gradient-based color scheme (cyan, magenta, purple)
- Smooth transitions and hover effects
- Responsive design for all screen sizes
- Property and unit filtering/search

## 🐛 Recent Critical Fixes

### Tenant History Support (Dec 12, 2024)
**Problem:** Units couldn't have multiple tenants over time  
**Solution:** Removed `@unique` constraint on `tenants.unitId`, enabling full tenant history

**Impact:** 
- Can now reassign previously occupied units
- 6 historical tenant records preserved
- Current tenants filtered by `leaseEndDate >= NOW()`

## 👥 Team
Developed by Levo for Mizpha Rentals

## 📝 License
Proprietary - All Rights Reserved

## 📞 Contact
Email: leviskibirie2110@gmail.com  
GitHub: https://github.com/Levikib/mizpha-rentals
