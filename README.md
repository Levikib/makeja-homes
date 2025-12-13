# Makeja Homes - Property Management Platform

Modern property management platform built for Kenya.

> **"Keja"** - Kenyan slang for house/home

## 🏠 About Makeja Homes

Makeja Homes is a comprehensive, multi-tenant SaaS platform for property management, designed specifically for the Kenyan market with M-Pesa integration, local support, and pricing in KES.

### Current System Stats (Mizpha Client)
- **5 Properties** across Nairobi
- **171 Units** (79.53% occupancy)
- **KSH 1,198,000** monthly revenue managed
- **132 Active Tenants**

## 🚀 Features

### For Property Managers
- Multi-property dashboard with real-time stats
- Unit management (VACANT, OCCUPIED, MAINTENANCE tracking)
- Tenant lifecycle management with full history
- Automated lease agreements
- Vacate workflow
- Beautiful, futuristic UI

### For Tenants (Coming Soon)
- Tenant portal
- Online rent payment (M-Pesa)
- Maintenance requests
- Lease documents

### For Admins (Multi-Tenancy)
- Client provisioning
- Subscription management
- Usage tracking
- Super admin dashboard

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (database-per-tenant architecture)
- **Authentication**: NextAuth.js
- **Payments**: Paystack (M-Pesa)
- **UI**: Shadcn/ui, Framer Motion
- **Hosting**: Vercel
- **Domain**: makejahomes.co.ke

## 📦 Installation
```bash
# Clone repository
git clone https://github.com/Levikib/makeja-homes.git
cd makeja-homes

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
npx prisma migrate deploy

# Start development
npm run dev
```

## 🌐 Architecture

### Multi-Tenant Structure
- **Master DB**: `makeja_master` - Organizations, subscriptions, users
- **Client DBs**: `makeja_client_[slug]` - Isolated data per client

### Subdomain Routing
- `www.makejahomes.co.ke` - Marketing site
- `app.makejahomes.co.ke` - Super admin
- `[client].makejahomes.co.ke` - Client apps

## 💰 Pricing

- **Trial**: 14 days free, full features
- **Basic**: KSH 4,999/mo (50 units, 3 properties)
- **Pro**: KSH 9,999/mo (200 units, unlimited properties)
- **Enterprise**: KSH 24,999/mo (unlimited everything)

## 🎨 Brand

**Colors**: Cyan, Magenta, Purple (futuristic sci-fi theme)  
**Tagline**: "Property Management, Perfected"  
**Target**: Property managers across Kenya

## 👥 Team

**Developer**: Levo (leviskibirie2110@gmail.com)  
**First Client**: Mizpha Rentals

## 📝 License

Proprietary - All Rights Reserved

## 🔗 Links

- Website: https://makejahomes.co.ke
- GitHub: https://github.com/Levikib/makeja-homes
- Email: hello@makejahomes.co.ke
