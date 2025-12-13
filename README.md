# Mizpha Rentals - Property Management System

A comprehensive property management system built with Next.js 14, TypeScript, Prisma, and PostgreSQL.

## 🚀 Features

### ✅ Completed Modules
- **Property Management**: Multi-property support with detailed tracking
- **Unit Management**: 163 units across 4 properties (Charis, Peniel, Eleazar, Benaiah)
- **Tenant Management**: Full tenant lifecycle with historical records
- **Lease Agreements**: Automated lease creation and management
- **Dashboard**: Futuristic UI with animated visualizations
- **Vacate Workflow**: Complete tenant move-out process

### 🚧 In Development
- Payments & Billing System
- Inventory Management
- Expenses Tracking
- Purchase Orders
- Advanced Reporting

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
git clone [your-repo-url]
cd mizpharentals

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
- **Properties**: 4 active properties
- **Units**: 163 units with multiple types (studio to 3-bedroom)
- **Tenants**: Full historical tracking
- **Lease Agreements**: Automated creation with status management
- **Users**: Role-based authentication (Admin, Manager, Caretaker, Tenant)

## 🎨 Design Philosophy
Futuristic, sci-fi themed interface with:
- Animated dashboard gauges
- Gradient-based color scheme (cyan, magenta, purple)
- Smooth transitions and hover effects
- Responsive design for all screen sizes

## 👥 Team
Developed by Levo for Mizpha Rentals

## 📝 License
Proprietary - All Rights Reserved
