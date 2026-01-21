# 🚀 MAKEJA HOMES - DEPLOYMENT GUIDE

**Version:** 1.0 (Phase 101)  
**Target Environment:** Production

---

## 📋 Pre-Deployment Checklist

### ✅ Code Preparation
- [ ] All tests passing
- [ ] No console.errors in production code
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Backup created
- [ ] Git repository clean
- [ ] Phase 101 tagged

### ✅ Configuration
- [ ] Production .env configured
- [ ] Database connection string set
- [ ] Email service credentials set
- [ ] Payment gateway credentials set
- [ ] Domain name configured
- [ ] SSL certificate ready

---

## 🗄️ Database Setup

### 1. Create Production Database

**Option A: Vercel Postgres**
```bash
# Create database on Vercel dashboard
# Copy connection string
```

**Option B: Supabase**
```bash
# Create project on Supabase
# Copy connection string from Settings > Database
```

**Option C: Self-hosted PostgreSQL**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb makeja_homes_prod
```

### 2. Set Connection String
```env
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

### 3. Run Migrations
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed data (optional)
npx prisma db seed
```

---

## 🔐 Environment Variables

### Required Variables

Create `.env.production`:
```env
# Database
DATABASE_URL="postgresql://..."

# App URL
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@your-domain.com"
EMAIL_REPLY_TO="support@your-domain.com"

# Payment (Paystack)
PAYSTACK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_live_..."

# Node Environment
NODE_ENV="production"
```

### Security Notes

- ⚠️ **Never commit `.env` files to git**
- ✅ Use environment variables in hosting platform
- ✅ Rotate keys regularly
- ✅ Use strong, unique secrets

---

## 🌐 Deployment Options

### Option 1: Vercel (Recommended) ⭐

**Pros:**
- Zero configuration
- Automatic deployments from GitHub
- Built-in SSL
- Edge functions
- Free tier available

**Steps:**

1. **Connect GitHub Repository**
```bash
   # Push code to GitHub
   git push origin main
```

2. **Import Project to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import from GitHub
   - Select `makeja-homes` repository

3. **Configure Environment Variables**
   - In Vercel dashboard
   - Settings → Environment Variables
   - Add all variables from `.env.production`

4. **Configure Build Settings**
```
   Framework Preset: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Visit deployment URL

6. **Configure Custom Domain (Optional)**
   - Settings → Domains
   - Add your domain
   - Update DNS records

**Cron Jobs on Vercel:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/daily-tasks",
    "schedule": "0 0 * * *"
  }]
}
```

---

### Option 2: Railway

**Steps:**

1. **Create Project**
   - Go to [railway.app](https://railway.app)
   - New Project → Deploy from GitHub

2. **Add PostgreSQL Service**
   - Add Service → PostgreSQL
   - Copy connection string

3. **Configure Variables**
   - Add all environment variables

4. **Deploy**
   - Automatic deployment on push

---

### Option 3: Self-Hosted (VPS)

**Requirements:**
- Ubuntu 22.04 LTS (or similar)
- 2GB RAM minimum
- Node.js 18+
- PostgreSQL 14+
- Nginx
- PM2

**Steps:**

1. **Setup Server**
```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install PM2
   sudo npm install -g pm2

   # Install PostgreSQL (if not using external DB)
   sudo apt install postgresql postgresql-contrib
```

2. **Clone Repository**
```bash
   cd /var/www
   git clone https://github.com/your-username/makeja-homes.git
   cd makeja-homes
```

3. **Install Dependencies**
```bash
   npm install
```

4. **Configure Environment**
```bash
   cp .env.example .env.production
   nano .env.production
   # Add all production variables
```

5. **Build Application**
```bash
   npm run build
```

6. **Start with PM2**
```bash
   pm2 start npm --name "makeja-homes" -- start
   pm2 save
   pm2 startup
```

7. **Configure Nginx**
```nginx
   # /etc/nginx/sites-available/makeja-homes
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
```
```bash
   sudo ln -s /etc/nginx/sites-available/makeja-homes /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
```

8. **Setup SSL with Certbot**
```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
```

9. **Setup Cron Jobs**
```bash
   crontab -e
   
   # Add this line
   0 0 * * * curl http://localhost:3000/api/cron/daily-tasks
```

---

## 📊 Post-Deployment

### 1. Verify Deployment
```bash
# Check application is running
curl https://your-domain.com

# Check API endpoints
curl https://your-domain.com/api/properties

# Check database connection
# Visit admin dashboard and create a test property
```

### 2. Create Admin User
```bash
# Option A: Using script
node create-admin.js

# Option B: Manually in database
# Use bcrypt to hash password
# Insert into users table with role='ADMIN'
```

### 3. Test Critical Workflows

- [ ] Login/logout
- [ ] Create property
- [ ] Create unit
- [ ] Add tenant
- [ ] Create lease
- [ ] Record payment
- [ ] Switch unit
- [ ] Send email

### 4. Monitor

- Check error logs
- Monitor database performance
- Test email delivery
- Verify cron jobs running

---

## 🔄 Continuous Deployment

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test # If tests exist
      # Deploy to your hosting platform
```

---

## 💾 Backup Strategy

### Database Backups

**Automated Daily Backup:**
```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/makeja-homes"
DB_NAME="makeja_homes_prod"

mkdir -p $BACKUP_DIR

pg_dump $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql"
```

**Add to crontab:**
```bash
0 2 * * * /path/to/backup-db.sh
```

### File System Backup
```bash
# Backup entire application
tar -czf makeja-homes-backup-$(date +%Y%m%d).tar.gz /var/www/makeja-homes

# Backup to S3 (if using AWS)
aws s3 cp makeja-homes-backup-$(date +%Y%m%d).tar.gz s3://your-bucket/backups/
```

---

## 🔧 Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Check Prisma client
npx prisma generate
```

**2. Build Failures**
```bash
# Clear cache
rm -rf .next
npm run build

# Check Node version
node -v  # Should be 18+
```

**3. Email Not Sending**
```bash
# Test Resend API key
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY"

# Check email configuration
node test-email.js
```

**4. Cron Jobs Not Running**
```bash
# Check cron logs
grep CRON /var/log/syslog

# Test endpoint manually
curl http://localhost:3000/api/cron/daily-tasks
```

---

## 📈 Performance Optimization

### 1. Enable Caching
```typescript
// next.config.js
module.exports = {
  swcMinify: true,
  images: {
    domains: ['your-domain.com'],
  },
  // Enable compression
  compress: true,
}
```

### 2. Database Optimization
```sql
-- Add indexes
CREATE INDEX idx_tenants_unit_id ON tenants(unitId);
CREATE INDEX idx_leases_status ON lease_agreements(status);
CREATE INDEX idx_leases_end_date ON lease_agreements(endDate);
```

### 3. Enable Redis (Optional)
```typescript
// For session storage and caching
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
```

---

## 🔐 Security Hardening

### 1. Rate Limiting
```typescript
// Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### 2. CORS Configuration
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'your-domain.com' },
        ],
      },
    ];
  },
};
```

### 3. Security Headers
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-XSS-Protection', '1; mode=block');
  
  return NextResponse.next({ headers });
}
```

---

## 📱 Domain Configuration

### DNS Records
```
Type    Name    Value                       TTL
A       @       your-server-ip             3600
CNAME   www     your-domain.com            3600
TXT     @       "v=spf1 include:resend.com ~all"  3600
```

---

## 🎓 Training & Documentation

### For Admins

1. Share admin login credentials securely
2. Provide user manual (create in Phase 102)
3. Schedule training session
4. Share this deployment documentation

### For Support Team

1. Access to logs
2. Common troubleshooting steps
3. Escalation procedures
4. Contact information

---

## ✅ Launch Checklist

- [ ] Domain configured
- [ ] SSL certificate installed
- [ ] Database migrated
- [ ] Admin user created
- [ ] Email service working
- [ ] Payment gateway testing complete
- [ ] Cron jobs scheduled
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Team trained
- [ ] Documentation shared
- [ ] Go-live announcement

---

## 📞 Support

For deployment issues:
- Check documentation first
- Review error logs
- Contact development team

---

**Deployed by:** Makeja Homes Development Team  
**Last Updated:** January 21, 2026  
**Support:** leviskibirie2110@gmail.com
