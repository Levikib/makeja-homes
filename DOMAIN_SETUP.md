# Domain Setup Guide - makejahomes.co.ke

## Step 1: Purchase Domain

### .co.ke Registration
**Option A: Kenya Network Information Centre (KENIC)**
- Visit: https://registry.co.ke
- Search: makejahomes.co.ke
- Cost: ~KSH 1,000/year
- Requirements: Kenya ID or business registration

**Option B: Safaricom Domain Services**
- Visit: https://domains.safaricom.co.ke
- Easier process, slightly more expensive
- Good customer support

**Option C: Web4Africa** (Recommended for tech)
- Visit: https://web4africa.com
- Better DNS management
- Cost: ~KSH 1,200/year

## Step 2: DNS Configuration (Cloudflare)

### Add Site to Cloudflare (Free)
1. Sign up at cloudflare.com
2. Add site: makejahomes.co.ke
3. Cloudflare gives you nameservers (e.g., ns1.cloudflare.com)
4. Update nameservers at your registrar
5. Wait 24-48 hours for propagation

### DNS Records (After Vercel Setup)
```
Type    Name    Content                     Proxy
A       @       76.76.21.21 (Vercel IP)     Proxied
A       www     76.76.21.21                 Proxied
A       app     76.76.21.21                 Proxied
A       *       76.76.21.21                 Proxied (wildcard)
CNAME   api     api.vercel.app              DNS only
```

## Step 3: Vercel Deployment

### Vercel Pro Setup ($20/month)
1. Sign up: vercel.com
2. Upgrade to Pro (needed for wildcard domains)
3. Import GitHub repo: makeja-homes
4. Add domains:
   - makejahomes.co.ke
   - www.makejahomes.co.ke
   - app.makejahomes.co.ke
   - *.makejahomes.co.ke (wildcard)

### Environment Variables
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://app.makejahomes.co.ke
PAYSTACK_SECRET_KEY=...
PAYSTACK_PUBLIC_KEY=...
```

## Step 4: SSL Certificates
- Cloudflare + Vercel auto-generate SSL
- Force HTTPS in Cloudflare settings
- Enable "Always Use HTTPS"

## Step 5: Email Setup

### Professional Email (Google Workspace)
- Cost: $6/user/month
- Setup: hello@makejahomes.co.ke, support@makejahomes.co.ke

### Transactional Email (Resend.com)
- Free tier: 3,000 emails/month
- Domain verification required
- For: Welcome emails, receipts, notifications

### DNS Records for Email (Google)
```
MX    @    1    aspmx.l.google.com
MX    @    5    alt1.aspmx.l.google.com
TXT   @         v=spf1 include:_spf.google.com ~all
```

## Cost Summary
- Domain: KSH 1,000/year
- Vercel Pro: $20/month = KSH 480,000/year (expensive!)
- Email: $6/month = KSH 144,000/year
- Total Year 1: ~KSH 625,000 (~$490/year)

### Cost Optimization
Consider Railway or DigitalOcean for cheaper hosting:
- Railway: $20/month for app + DB
- Cloudflare Pages: Free for static site
- Total: ~$20/month vs Vercel Pro $20/month (similar)

## Testing Before Going Live

### Local Testing with /etc/hosts
```bash
# Edit /etc/hosts (Linux/Mac)
sudo nano /etc/hosts

# Add:
127.0.0.1 makejahomes.local
127.0.0.1 app.makejahomes.local
127.0.0.1 mizpha.makejahomes.local

# Test:
npm run dev
# Visit: http://mizpha.makejahomes.local:3000
```

## Launch Checklist
- [ ] Domain purchased and pointing to Cloudflare
- [ ] Vercel Pro account active
- [ ] All subdomains configured
- [ ] SSL certificates active (HTTPS working)
- [ ] Email setup complete
- [ ] Database migrated
- [ ] Environment variables set
- [ ] Test signup flow
- [ ] Test client subdomain access
- [ ] Analytics setup (Google Analytics)
- [ ] Error tracking (Sentry)
