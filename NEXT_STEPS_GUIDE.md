# Makeja Homes - Next Steps Guide

## ✅ COMPLETED (Dec 13, 2024)

### Rebranding Complete
- [x] Name: Makeja Homes (Keja = Kenyan slang for house)
- [x] Domain: makejahomes.co.ke (purchased, activating)
- [x] GitHub: Renamed to makeja-homes
- [x] Code: Updated package.json, layout files, page files
- [x] Folder: ~/makeja-homes

### Current System Stats
- 5 properties, 171 units
- KSH 1,198,000 monthly revenue
- 79.53% occupancy
- 132 active tenants
- Database: PostgreSQL (mizpharentals)

## 🚀 WEEK 1 - AUTHENTICATION & PUSH

### Step 1: GitHub Authentication (5 minutes)
1. Visit: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "Makeja Homes Dev"
4. Expiration: 90 days
5. Scopes: Check "repo" (all boxes)
6. Generate & copy token (starts with ghp_)
```bash
cd ~/makeja-homes
git push
# Username: Levikib
# Password: [paste PAT token]
```

### Step 2: Domain Activation Check
- Login to hosting.com
- Check domain status
- Should activate within 24-48 hours
- Note the nameservers for later

## 🚀 WEEK 2 - MULTI-TENANCY FOUNDATION

### Goal: Enable multiple clients to use the system

### Step 1: Create Master Database
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create master database
CREATE DATABASE makeja_master;
CREATE USER makeja_admin WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE makeja_master TO makeja_admin;
\q
```

### Step 2: Master Schema (Organizations)
```sql
-- Run this in makeja_master database
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  database_name VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'TRIAL',
  subscription_status VARCHAR(50) DEFAULT 'TRIAL',
  trial_ends_at TIMESTAMP DEFAULT NOW() + INTERVAL '14 days',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mizpha becomes first client
INSERT INTO organizations (name, slug, database_name, email, subscription_tier, subscription_status)
VALUES ('Mizpha Rentals', 'mizpha', 'makeja_client_mizpha', 'admin@mizpha.com', 'ENTERPRISE', 'ACTIVE');
```

### Step 3: Migrate Mizpha Data
```bash
# Rename current database
sudo -u postgres psql
ALTER DATABASE mizpharentals RENAME TO makeja_client_mizpha;
\q

# Update .env
DATABASE_URL="postgresql://mizpha:shannara2001@localhost:5432/makeja_client_mizpha"
```

## 🚀 WEEK 3 - PAYMENTS MODULE

### Priority: Track KSH 1.2M monthly revenue

### Step 1: Paystack Account
1. Visit: https://paystack.com
2. Create business account
3. Get test API keys
4. Add to .env:
```
PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_SECRET_KEY=sk_test_xxx
```

### Step 2: Payment Schema (Already exists!)
- payments table exists
- Need to build UI

### Step 3: Payment Recording API
Location: /app/api/payments/route.ts
Features needed:
- Record rent payment
- M-Pesa integration
- Receipt generation
- Payment history

## 🚀 WEEK 4 - LEASE RENEWALS

### Problem: 10+ leases expiring in next 30 days

### Solution: Auto-reminder system
- Email notifications at 30/60/90 days
- SMS via Africa's Talking
- Renewal workflow in dashboard

## 🚀 WEEK 5 - VERCEL DEPLOYMENT

### When: After domain activates

### Steps:
1. Sign up: https://vercel.com
2. Connect GitHub: makeja-homes repo
3. Add domain: makejahomes.co.ke
4. Set environment variables
5. Deploy!

### DNS Configuration (at hosting.com):
```
A     @     76.76.21.21  (Vercel IP)
A     www   76.76.21.21
A     app   76.76.21.21
A     *     76.76.21.21  (wildcard)
```

## 🚀 WEEK 6-8 - BETA LAUNCH

### Marketing Strategy:
1. Create landing page
2. Record demo video
3. Post in Kenya property groups
4. Invite 5-10 beta testers
5. Offer 50% discount for first 3 months

### Success Metrics:
- 5 beta users by Week 6
- 1 paying customer by Week 8
- KSH 4,999+ MRR by Month 2

## 📊 PRICING (FINAL)

### Trial (14 days)
- Free, full features
- No credit card
- Auto-loads sample data

### Basic (KSH 4,999/month)
- 50 units max
- 3 properties max
- 2 staff users
- Basic reports

### Pro (KSH 9,999/month)
- 200 units max
- Unlimited properties
- 10 staff users
- M-Pesa payments
- SMS notifications

### Enterprise (KSH 24,999/month)
- Unlimited everything
- API access
- White-label
- Dedicated support

## 🔧 TECHNICAL DEBT

### Must Fix Before Launch:
- [ ] Payments module (CRITICAL)
- [ ] Lease renewal reminders
- [ ] Email notifications
- [ ] Tenant portal
- [ ] Receipt generation

### Nice to Have:
- [ ] Mobile app
- [ ] WhatsApp integration
- [ ] Swahili language
- [ ] Bulk operations
- [ ] Advanced analytics

## 📞 WHEN YOU GET STUCK

### Resources:
- Docs: Read DEVELOPMENT_CONTEXT.md
- Architecture: Read SAAS_ARCHITECTURE.md
- Competition: Read COMPETITIVE_ANALYSIS.md
- Rebrand: Read MAKEJA_HOMES_REBRAND.md

### Start New Chat With:
```
Hi! Continuing Makeja Homes development.

Repository: https://github.com/Levikib/makeja-homes
Read: DEVELOPMENT_CONTEXT.md and NEXT_STEPS_GUIDE.md

I'm at: [describe where you are in the roadmap]
Need help with: [specific task]
```

## 🎯 SUCCESS DEFINITION

### Phase 1 (Month 1): Foundation
- Multi-tenancy working
- 2 clients using system
- Payments module complete

### Phase 2 (Month 2): Growth
- 5 paying clients
- KSH 25,000+ MRR
- All core features done

### Phase 3 (Month 3): Scale
- 10+ clients
- KSH 50,000+ MRR
- Marketing automation

### Phase 4 (Month 6): Profitable
- 20+ clients
- KSH 100,000+ MRR
- Hire first employee

## 💰 FINANCIAL PROJECTIONS

### Costs (Monthly):
- Hosting: KSH 0 (Vercel free initially)
- Domain: KSH 83/month
- Total: KSH 83/month

### Revenue Projections:
- Month 1: 1 client × KSH 4,999 = KSH 4,999
- Month 2: 3 clients × KSH 4,999 = KSH 14,997
- Month 3: 5 clients × KSH 6,999 avg = KSH 34,995
- Month 6: 15 clients × KSH 7,999 avg = KSH 119,985

### Break-even: 1 client! (Already profitable)

---

**Last Updated:** December 13, 2024  
**Next Review:** After token limit resets  
**Repository:** https://github.com/Levikib/makeja-homes  
**Domain:** makejahomes.co.ke (activating)
