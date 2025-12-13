# Makeja Homes - Complete Rebranding Guide

## Brand Identity

### Name: Makeja Homes
**Origin:** "Keja" = Kenyan slang for house/home  
**Meaning:** Making homes management easy (Ma-keja)  
**Positioning:** Modern property management platform built for Kenya

### Domain Strategy
- **Primary:** makejahomes.co.ke
- **Subdomains:**
  - www.makejahomes.co.ke → Landing/marketing site
  - app.makejahomes.co.ke → Super admin dashboard
  - [client].makejahomes.co.ke → Client subdomains
  - api.makejahomes.co.ke → API (future)
  - docs.makejahomes.co.ke → Documentation

### Brand Colors (Keep Current Theme)
- **Primary:** Cyan (#06b6d4) - Tech, trust, modern
- **Secondary:** Magenta (#ec4899) - Energy, innovation
- **Accent:** Purple (#a855f7) - Premium, sophisticated
- **Background:** Dark Gray (#1f2937) - Professional, sleek
- **Text:** White/Gray - Clean, readable

### Tagline Options:
1. "Property Management, Perfected" ⭐
2. "Your Homes, Simplified"
3. "Modern Property Management for Kenya"
4. "Managing Keja, Made Easy"
5. "The Future of Property Management"

### Logo Concept:
- House icon with circuit/tech elements (fusion of home + technology)
- Gradient from cyan to magenta
- Modern, minimal, memorable
- Works in monochrome for documents

## Technical Rebranding Checklist

### Phase 1: Code & Repository (Week 1)

#### Repository
- [ ] Rename GitHub repo: mizpha-rentals → makeja-homes
- [ ] Update repository description
- [ ] Update README.md with new branding
- [ ] Update all documentation files

#### Codebase
- [ ] Update package.json name: "makeja-homes"
- [ ] Replace all "Mizpha" references with "Makeja Homes"
- [ ] Update app title in layout.tsx
- [ ] Update metadata/SEO tags
- [ ] Update favicon (create new logo first)
- [ ] Update login page branding
- [ ] Update dashboard header
- [ ] Update email templates
- [ ] Update environment variable names (optional)

#### Database
- [ ] Keep current database name for Mizpha (they're first client)
- [ ] Create new master database: makeja_master
- [ ] Mizpha's data stays in: mizpha_client_001 (or similar)

### Phase 2: Domain & Hosting (Week 1-2)

#### Domain Purchase (.co.ke)
- [ ] Purchase makejahomes.co.ke (~KSH 1,000/year)
- [ ] Register through: registry.co.ke or safaricom.co.ke
- [ ] Setup DNS with Cloudflare (free tier)
- [ ] Configure SSL certificates

#### DNS Configuration
```
A     @                  → Vercel IP
A     www                → Vercel IP
A     app                → Vercel IP
A     *                  → Vercel IP (wildcard for clients)
CNAME api                → api.vercel.app (future)
```

#### Vercel Setup
- [ ] Deploy to Vercel Pro ($20/month for wildcard domains)
- [ ] Add custom domain: makejahomes.co.ke
- [ ] Enable wildcard: *.makejahomes.co.ke
- [ ] Configure environment variables

### Phase 3: Multi-Tenancy Foundation (Week 2-3)

#### Master Database Schema
```sql
-- Create master database
CREATE DATABASE makeja_master;

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- for subdomain
  database_name VARCHAR(100) UNIQUE NOT NULL,
  
  -- Contact info
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  
  -- Subscription
  subscription_tier VARCHAR(50) DEFAULT 'TRIAL',
  subscription_status VARCHAR(50) DEFAULT 'TRIAL',
  trial_ends_at TIMESTAMP DEFAULT NOW() + INTERVAL '14 days',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Mizpha becomes first client
INSERT INTO organizations (name, slug, database_name, email, subscription_tier, subscription_status)
VALUES (
  'Mizpha Rentals', 
  'mizpha', 
  'makeja_client_mizpha',
  'admin@mizpha.com',
  'ENTERPRISE',
  'ACTIVE'
);
```

#### Dynamic Database Connection
```typescript
// lib/db/client-connection.ts
import { PrismaClient } from '@prisma/client';

const connections = new Map<string, PrismaClient>();

export async function getClientDB(organizationId: string) {
  if (connections.has(organizationId)) {
    return connections.get(organizationId)!;
  }
  
  // Get org from master DB
  const org = await masterDB.organizations.findUnique({
    where: { id: organizationId }
  });
  
  if (!org) throw new Error('Organization not found');
  
  // Create connection to client database
  const client = new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://makeja_user:${process.env.DB_PASSWORD}@localhost:5432/${org.database_name}`
      }
    }
  });
  
  connections.set(organizationId, client);
  return client;
}
```

#### Subdomain Middleware
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl;
  
  // Landing page: www.makejahomes.co.ke or makejahomes.co.ke
  if (hostname === 'www.makejahomes.co.ke' || 
      hostname === 'makejahomes.co.ke' ||
      hostname === 'localhost:3000') {
    return NextResponse.rewrite(new URL('/landing', request.url));
  }
  
  // Super admin: app.makejahomes.co.ke
  if (hostname === 'app.makejahomes.co.ke' || 
      hostname === 'app.localhost:3000') {
    return NextResponse.rewrite(new URL('/admin', request.url));
  }
  
  // Client subdomain: [client].makejahomes.co.ke
  const subdomain = hostname.split('.')[0];
  
  // Skip special subdomains
  if (['www', 'app', 'api', 'docs'].includes(subdomain)) {
    return NextResponse.next();
  }
  
  // Get organization by subdomain
  const org = await getOrgBySlug(subdomain);
  
  if (!org) {
    return new Response('Organization not found', { status: 404 });
  }
  
  // Add org ID to headers for use in API routes
  const response = NextResponse.next();
  response.headers.set('x-organization-id', org.id);
  response.headers.set('x-organization-slug', org.slug);
  
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
```

### Phase 4: Client Provisioning System

#### Signup Flow
```typescript
// app/api/auth/signup/route.ts
export async function POST(request: NextRequest) {
  const { companyName, email, password, phone } = await request.json();
  
  // 1. Create slug from company name
  const slug = companyName.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  // 2. Check if slug available
  const existing = await masterDB.organizations.findUnique({
    where: { slug }
  });
  
  if (existing) {
    return NextResponse.json(
      { error: 'Company name already taken' },
      { status: 400 }
    );
  }
  
  // 3. Generate database name
  const dbName = `makeja_client_${slug}`;
  
  // 4. Create organization
  const org = await masterDB.organizations.create({
    data: {
      name: companyName,
      slug,
      database_name: dbName,
      email,
      phone,
      subscription_tier: 'TRIAL',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  });
  
  // 5. Provision database
  await provisionClientDatabase(dbName);
  
  // 6. Create admin user in client DB
  const clientDB = await getClientDB(org.id);
  const hashedPassword = await bcrypt.hash(password, 10);
  
  await clientDB.users.create({
    data: {
      id: generateId('user'),
      email,
      password: hashedPassword,
      firstName: companyName.split(' ')[0],
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
      phoneNumber: phone
    }
  });
  
  // 7. Send welcome email
  await sendWelcomeEmail({
    to: email,
    companyName,
    subdomain: slug,
    trialEndsAt: org.trial_ends_at
  });
  
  return NextResponse.json({
    success: true,
    subdomain: slug,
    message: 'Account created! Redirecting to your dashboard...'
  });
}

async function provisionClientDatabase(dbName: string) {
  // Create database
  await masterDB.$executeRawUnsafe(`CREATE DATABASE ${dbName}`);
  
  // Connect to new database
  const client = new PrismaClient({
    datasources: {
      db: { url: `postgresql://.../${dbName}` }
    }
  });
  
  // Run migrations
  await execAsync(`DATABASE_URL=postgresql://.../${dbName} npx prisma migrate deploy`);
  
  await client.$disconnect();
}
```

### Phase 5: Billing Integration (Week 4-5)

#### Paystack Setup
- [ ] Create Paystack business account
- [ ] Get API keys (test + live)
- [ ] Setup subscription plans
- [ ] Configure webhooks

#### Pricing Plans
```typescript
export const PLANS = {
  TRIAL: {
    name: 'Free Trial',
    price: 0,
    duration: 14, // days
    limits: { properties: 1, units: 10, users: 1 }
  },
  BASIC: {
    name: 'Basic',
    price: 4999, // KSH
    currency: 'KES',
    interval: 'monthly',
    limits: { properties: 3, units: 50, users: 2 }
  },
  PRO: {
    name: 'Professional',
    price: 9999,
    currency: 'KES',
    interval: 'monthly',
    limits: { properties: Infinity, units: 200, users: 10 }
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 24999,
    currency: 'KES',
    interval: 'monthly',
    limits: { properties: Infinity, units: Infinity, users: Infinity },
    features: ['API access', 'White-label', 'Dedicated support']
  }
};
```

## Marketing & Launch (Week 6-8)

### Landing Page Structure
```
Hero Section:
- Headline: "Property Management, Perfected"
- Subheadline: "Manage your rentals with Kenya's most modern platform"
- CTA: "Start Free Trial" → Signup modal
- Screenshot: Dashboard with animated stats

Features Section:
- Real-time dashboard
- M-Pesa integration
- Tenant portal
- Lease management
- Maintenance tracking
- Beautiful reports

Pricing Section:
- 3 tiers with clear comparison
- "14-day free trial, no credit card required"

Social Proof:
- "Join 50+ property managers across Kenya" (once you have them)
- Testimonials from Mizpha + early adopters

Demo Section:
- "See it in action" button
- Opens demo.makejahomes.co.ke with sample data
```

### Launch Strategy
1. **Soft Launch** (Week 6)
   - Invite 5-10 property managers for beta
   - Gather feedback
   - Fix critical bugs

2. **Public Launch** (Week 8)
   - Social media announcement
   - Post in property management groups
   - Email to Kenya Real Estate Association
   - Press release to tech blogs

## Mizpha's Migration Plan

### Current State
- Database: mizpharentals
- 5 properties, 171 units
- KSH 1.2M monthly revenue

### Migration Steps
1. **No code changes needed** - they continue using system
2. **Database rename**: mizpharentals → makeja_client_mizpha
3. **Subdomain setup**: mizpha.makejahomes.co.ke
4. **Pricing**: Lifetime free (founder's benefit)
5. **Support**: Direct line to you for any issues

### Communication
"Dear Mizpha team,

Great news! The system you've been using is now becoming a full platform called Makeja Homes. 

What changes for you:
- Your login URL: mizpha.makejahomes.co.ke
- Everything else stays exactly the same
- As our founding client, you get lifetime free access
- You still get priority support from me directly

What's new:
- Even better features coming
- More stable platform
- Faster updates

Let me know if you have any questions!"
