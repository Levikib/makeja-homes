import Link from 'next/link'
import dynamic from 'next/dynamic'
import './marketing.css'

const HeroScene = dynamic(() => import('@/components/HeroScene'), { ssr: false })
const MarketingInteractions = dynamic(() => import('@/components/MarketingInteractions'), { ssr: false })

export const metadata = {
  title: 'Property Management Software Kenya — M-Pesa, Digital Leases & AI Insights',
  description: 'Makeja Homes is the most complete property management platform in Kenya. M-Pesa STK Push auto-reconciliation, digital lease signing, automated billing, 5-role dashboards, and Njiti AI insights. Built in Nairobi. Start free.',
  alternates: {
    canonical: 'https://makejahomes.co.ke',
  },
  openGraph: {
    title: 'Makeja Homes — Property Management Software Kenya',
    description: 'M-Pesa STK Push, digital lease signing, automated billing, 5-role dashboards. The most complete property management platform in Kenya. Start your 14-day free trial.',
    url: 'https://makejahomes.co.ke',
    type: 'website',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://makejahomes.co.ke/#organization',
      name: 'Makeja Homes',
      url: 'https://makejahomes.co.ke',
      logo: {
        '@type': 'ImageObject',
        url: 'https://makejahomes.co.ke/og-image.png',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+254796809106',
        contactType: 'customer support',
        areaServed: 'KE',
        availableLanguage: 'English',
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Nairobi',
        addressCountry: 'KE',
      },
      sameAs: [],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://makejahomes.co.ke/#software',
      name: 'Makeja Homes',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'Professional property management software for Kenya. Features M-Pesa STK Push integration, digital lease signing, automated billing, 5-role dashboards, inventory management, and AI-powered business insights.',
      url: 'https://makejahomes.co.ke',
      offers: [
        {
          '@type': 'Offer',
          name: 'Starter',
          price: '4999',
          priceCurrency: 'KES',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '4999',
            priceCurrency: 'KES',
            unitText: 'MONTH',
          },
        },
        {
          '@type': 'Offer',
          name: 'Growth',
          price: '9999',
          priceCurrency: 'KES',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '9999',
            priceCurrency: 'KES',
            unitText: 'MONTH',
          },
        },
        {
          '@type': 'Offer',
          name: 'Pro',
          price: '24999',
          priceCurrency: 'KES',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '24999',
            priceCurrency: 'KES',
            unitText: 'MONTH',
          },
        },
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://makejahomes.co.ke/#website',
      url: 'https://makejahomes.co.ke',
      name: 'Makeja Homes',
      description: 'Professional property management software for Kenya',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://makejahomes.co.ke/onboarding',
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

// ── SVG ICONS ─────────────────────────────────────────────────────────
const ArrowRight = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)
const Check = () => (
  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--terra)" strokeWidth="3.5">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
)
const CheckWhite = () => (
  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
)

// ── CHAPTER LABEL ─────────────────────────────────────────────────────
function Ch({ num, text, light }: { num: string; text: string; light?: boolean }) {
  return (
    <div className="ch">
      <span className="ch-num">{num}</span>
      <div className="ch-line" />
      <span className="ch-text" style={light ? { color: 'rgba(194,214,216,.48)' } : {}}>{text}</span>
    </div>
  )
}

// ── PRICING FEATURE ───────────────────────────────────────────────────
function PriceFeat({ text, strong }: { text: string; strong?: boolean }) {
  return (
    <div className="pf">
      <div className="pf-check"><Check /></div>
      <span style={strong ? { fontWeight: 600, color: 'var(--slate)' } : {}}>{text}</span>
    </div>
  )
}

// ── FEATURE TILT CARD ─────────────────────────────────────────────────
function FeatureCard({ icon, title, body, tags, delay }: {
  icon: React.ReactNode; title: string; body: string;
  tags?: string[]; delay?: string
}) {
  return (
    <div className={`tilt-card reveal${delay ? ' ' + delay : ''}`} style={{ cursor: 'default' }}>
      <div className="tc-icon">{icon}</div>
      <h3 className="tc-title">{title}</h3>
      <p className="tc-body">{body}</p>
      {tags && (
        <div className="tc-tags">{tags.map(t => <span key={t} className="tc-tag">{t}</span>)}</div>
      )}
    </div>
  )
}

// ── ROLE CARD ─────────────────────────────────────────────────────────
function RoleCard({ icon, role, color, duties, delay }: {
  icon: string; role: string; color: string; duties: string[]; delay?: string
}) {
  return (
    <div className={`role-card reveal${delay ? ' ' + delay : ''}`} style={{ '--role-color': color } as React.CSSProperties}>
      <div className="role-icon-wrap">
        <span className="role-icon">{icon}</span>
      </div>
      <h3 className="role-title">{role}</h3>
      <ul className="role-duties">
        {duties.map(d => (
          <li key={d}>
            <span className="role-dot" />
            {d}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
export default function MarketingPage() {
  const marqueeItems = [
    'M-Pesa STK Push','Digital Lease Signing','Njiti AI Agent','Water Billing',
    'KRA Tax Module','Unit Transfer Wizard','Maintenance Workflows','Audit Logs',
    'Tenant Portals','Role-Based Access','Purchase Orders','Bulk Operations',
    'Paystack Cards','Automated Billing','AI Business Insights','Deposit Refunds',
  ]

  return (
    <div className="marketing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <canvas id="grain" aria-hidden="true" />
      <div id="cur-dot" aria-hidden="true" />
      <div id="cur-ring" aria-hidden="true" />
      <div id="progress" aria-hidden="true" role="progressbar" aria-label="Page scroll progress" />
      <MarketingInteractions />

      {/* ═══ NAV ════════════════════════════════════════════════════════ */}
      <nav id="nav" aria-label="Main navigation">
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <div className="logo-mark">M</div>
          <span className="logo-text">Makeja Homes</span>
        </Link>

        <div className="hide-m" style={{ display:'flex', alignItems:'center', gap:40 }}>
          <a href="#features" className="nl">Features</a>
          <a href="#roles" className="nl">Roles</a>
          <a href="#pricing" className="nl">Pricing</a>
          <a href="#workflow" className="nl">How It Works</a>
          <a href="#footer" className="nl">Contact</a>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link href="/auth/login" className="nl hide-m" style={{ padding:'8px 14px' }}>Login</Link>
          <Link href="/onboarding" className="nav-cta">Start Free Trial →</Link>
        </div>
      </nav>

      {/* ═══ HERO ════════════════════════════════════════════════════════ */}
      <main>
      <section id="hero" aria-label="Hero">
        <HeroScene />
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 80% at 60% 50%,transparent 30%,rgba(19,27,29,.72) 80%)', pointerEvents:'none', zIndex:5 }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:220, background:'linear-gradient(to bottom,transparent,var(--char))', pointerEvents:'none', zIndex:6 }} />

        <div className="hero-content" style={{ position:'relative', zIndex:10, maxWidth:800 }}>
          <div className="hero-tag">
            <span className="hero-tag-dot" />
            Professional Property Management Software
          </div>

          <h1 className="hero-h1">
            <span style={{ display:'block' }}>The Most</span>
            <span style={{ display:'block' }}>
              <em className="hero-h1-terra">Complete</em> Property
            </span>
            <span style={{ display:'block' }}>Platform.</span>
          </h1>

          <p className="hero-sub">
            Digital lease signing. Automated billing. M-Pesa & card payments. 5-role dashboards.
            AI-powered insights. Everything a professional property manager needs — in one system,
            on your own subdomain.
          </p>

          <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <Link href="/onboarding" className="btn-primary">
              Start Free Trial <ArrowRight />
            </Link>
            <a href="#features" className="btn-ghost">
              See Every Feature →
            </a>
          </div>
        </div>

        <div className="hero-stats hide-m">
          <div className="hero-stat">
            <div className="hero-stat-v">3,200+</div>
            <div className="hero-stat-l">Units Tracked</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-v" style={{ fontSize:28 }}>KES 42M+</div>
            <div className="hero-stat-l">Processed</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-v">98.2%</div>
            <div className="hero-stat-l">Uptime</div>
          </div>
        </div>

        <div className="hero-scroll">
          <span>Scroll</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* ═══ MARQUEE ════════════════════════════════════════════════════ */}
      <div id="marquee">
        <div className="marquee-inner">
          {[...marqueeItems, ...marqueeItems].map((item, idx) => (
            <span key={idx}>
              <span className="mi">{item}</span>
              <span className="mi-dot">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ═══ CHAPTER 1: THE PROBLEM ══════════════════════════════════════ */}
      <section id="problem" className="section diag-down" aria-label="The problem with traditional property management">
        <div className="container">
          <Ch num="01" text="The Problem" light />
          <h2
            className="dsp reveal"
            style={{ fontSize:'clamp(40px,5vw,72px)', fontWeight:600, letterSpacing:'-2.5px', lineHeight:.98, textAlign:'center', color:'var(--cream)', marginBottom:24 }}
          >
            How most landlords<br /><em style={{ color:'var(--terra)' }}>still manage property.</em>
          </h2>
          <p
            className="reveal reveal-d1"
            style={{ textAlign:'center', fontSize:18, color:'rgba(194,214,216,.52)', maxWidth:560, margin:'0 auto 80px', lineHeight:1.72 }}
          >
            WhatsApp group chats for rent reminders. Mobile payment screenshots shared via email.
            Handwritten ledgers for water readings. You deserve a real system.
          </p>

          <div className="prob-grid">
            {[
              { icon:'📱', title:'WhatsApp Chaos', body:'Broadcast lists for rent reminders. Screenshots as payment proof. Personal numbers mixed with business. One disputed M-Pesa and your credibility is gone.' },
              { icon:'📊', title:'Spreadsheet Hell', body:'Twelve versions of the same Excel file. Manual water-reading math. Wrong formulas discovered on month 8. You built a portfolio — not a data-entry operation.' },
              { icon:'📝', title:'Paper Lease Nightmares', body:'Printed agreements stored in a drawer. No way to prove a tenant signed. No reminder when leases expire. Lost documents, disputed terms, legal exposure.' },
              { icon:'🔧', title:'Maintenance Black Hole', body:"Texts to the caretaker that disappear. No tracking, no assignment, no accountability. Tenants waiting weeks with no update. Tenant satisfaction destroyed." },
              { icon:'💸', title:'Billing Errors Cost You', body:'Forgetting to add water charges. Miscalculating garbage fees. Tenants paying wrong amounts. Reconciliation done manually every month — always finding mistakes.' },
              { icon:'🔓', title:'Zero Audit Trail', body:'If a manager leaves, your records go with them. No log of who changed what. No history of payments, repairs, or decisions. Disputes with nothing to show.' },
            ].map((p, i) => (
              <div key={i} className={`prob-card reveal reveal-d${Math.min(i + 1, 4)}`}>
                <div className="prob-icon">{p.icon}</div>
                <h3 className="dsp" style={{ fontSize:24, fontWeight:600, color:'var(--cream)', marginBottom:12 }}>{p.title}</h3>
                <p style={{ color:'rgba(194,214,216,.48)', fontSize:15, lineHeight:1.82 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 2: THE SOLUTION ════════════════════════════════════ */}
      <section id="solution" className="section diag-up" style={{ background:'var(--cream)' }} aria-label="Makeja Homes platform overview">
        <div className="container">
          <div className="sol-grid">
            <div>
              <Ch num="02" text="The Platform" />
              <h2 className="sol-headline reveal" style={{ marginBottom:32 }}>
                One platform.<br />
                Every<br />
                <em className="sol-terra">workflow.</em>
              </h2>
              <p className="reveal reveal-d1" style={{ fontSize:17, color:'var(--slate-m)', lineHeight:1.9, marginBottom:32 }}>
                Makeja Homes replaces WhatsApp, Excel, and paper leases with a single professional
                system. Your company gets its own subdomain — like <strong style={{ color:'var(--slate)' }}>acme.makejahomes.co.ke</strong> —
                with a fully isolated database, custom roles, and every feature your team needs from
                day one. No generic links — your own branded workspace.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }} className="reveal reveal-d2">
                {[
                  'Local payment integrations — M-Pesa STK Push, Paystack, bank transfer, all auto-reconciled',
                  'Digital leases — email link → unique token → tenant signs online → lease ACTIVE',
                  'Automated monthly bills: Rent + Water readings + Garbage + Recurring charges',
                  'Maintenance tracked PENDING → ASSIGNED → IN_PROGRESS → COMPLETED',
                  'AI-powered insights via Claude Haiku — live today, not "coming soon"',
                  'Full audit trail — every admin action logged with timestamp and user',
                ].map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                    <div style={{ width:9, height:9, borderRadius:'50%', background:'var(--terra)', flexShrink:0, marginTop:7, boxShadow:'0 0 12px rgba(226,125,96,.6)' }} />
                    <span style={{ fontSize:15, color:'var(--slate-m)' }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/onboarding" className="btn-primary reveal reveal-d3" style={{ marginTop:48, display:'inline-flex' }}>
                Get Your Subdomain <ArrowRight />
              </Link>
            </div>

            {/* Solution visual: multi-tenant card stack */}
            <div className="reveal-r sol-visual-wrap">
              {/* Subdomain card */}
              <div className="sol-tenant-card sol-card-1">
                <div style={{ fontFamily:'Jost,sans-serif', fontSize:10, fontWeight:700, color:'var(--terra)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>Your Workspace</div>
                <div style={{ fontFamily:'Jost,sans-serif', fontSize:18, fontWeight:700, color:'var(--slate)', marginBottom:4 }}>acme.makejahomes.co.ke</div>
                <div style={{ fontSize:13, color:'var(--slate-l)', lineHeight:1.6 }}>Isolated PostgreSQL schema · Your data, only yours</div>
                <div style={{ display:'flex', gap:8, marginTop:16, flexWrap:'wrap' }}>
                  {['Admin','Manager','Caretaker','Storekeeper','Tenant'].map(r => (
                    <span key={r} style={{ background:'rgba(62,78,80,.07)', border:'1px solid rgba(62,78,80,.12)', borderRadius:6, padding:'3px 10px', fontFamily:'Jost,sans-serif', fontSize:10, fontWeight:600, color:'var(--slate-m)', letterSpacing:.3 }}>{r}</span>
                  ))}
                </div>
              </div>
              {/* Mini feature pills */}
              <div className="sol-pills-row">
                <div className="sol-pill sol-pill-mpesa">🟢 M-Pesa STK Push</div>
                <div className="sol-pill sol-pill-lease">✍️ Digital Lease</div>
                <div className="sol-pill sol-pill-ai">🤖 Njiti AI Agent</div>
              </div>
              {/* Stat card */}
              <div className="sol-stat-strip">
                <div className="sol-stat-item">
                  <div className="dsp" style={{ fontWeight:700, fontSize:36, color:'var(--terra)', lineHeight:1 }}>14 days</div>
                  <div style={{ fontFamily:'Jost,sans-serif', fontSize:10, fontWeight:700, color:'var(--slate-m)', textTransform:'uppercase', letterSpacing:1, marginTop:6 }}>Free trial — no card</div>
                </div>
                <div style={{ width:'1px', background:'rgba(62,78,80,.1)' }} />
                <div className="sol-stat-item">
                  <div className="dsp" style={{ fontWeight:700, fontSize:36, color:'var(--gold)', lineHeight:1 }}>5</div>
                  <div style={{ fontFamily:'Jost,sans-serif', fontSize:10, fontWeight:700, color:'var(--slate-m)', textTransform:'uppercase', letterSpacing:1, marginTop:6 }}>Role dashboards</div>
                </div>
                <div style={{ width:'1px', background:'rgba(62,78,80,.1)' }} />
                <div className="sol-stat-item">
                  <div className="dsp" style={{ fontWeight:700, fontSize:36, color:'var(--slate)', lineHeight:1 }}>∞</div>
                  <div style={{ fontFamily:'Jost,sans-serif', fontSize:10, fontWeight:700, color:'var(--slate-m)', textTransform:'uppercase', letterSpacing:1, marginTop:6 }}>Properties</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 3: FEATURES BENTO ══════════════════════════════════ */}
      <section id="features" className="section" style={{ background:'var(--cream-d)' }} aria-label="Features">
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:88 }}>
            <Ch num="03" text="Every Feature" />
            <h2 className="dsp reveal" style={{ fontSize:'clamp(40px,5vw,72px)', fontWeight:600, letterSpacing:'-2.5px', lineHeight:.98, color:'var(--slate)', marginBottom:24 }}>
              Built for every<br /><em style={{ color:'var(--terra)' }}>workflow you have.</em>
            </h2>
            <p className="reveal reveal-d1" style={{ fontSize:18, color:'var(--slate-m)', maxWidth:540, margin:'0 auto', lineHeight:1.72 }}>
              Not a generic SaaS with a fresh coat of paint — a purpose-built system for how
              professional property management actually works.
            </p>
          </div>

          <div className="bento-grid">
            {/* Row 1 */}
            <FeatureCard
              delay="reveal-d1"
              icon={<svg width="28" height="28" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>}
              title="Portfolio Management"
              body="Multi-property, multi-unit. Track Studios, 1BR–3BR, Penthouses, Shops, Offices, and Warehouses. Status flows VACANT → RESERVED → OCCUPIED. Archive decommissioned units without losing history."
              tags={['Multi-property','Unit types','Status tracking','Archiving']}
            />
            <FeatureCard
              delay="reveal-d2"
              icon={<svg width="26" height="26" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>}
              title="M-Pesa + Paystack Payments"
              body="STK Push triggers straight to tenant's phone. Daraja API callback auto-reconciles — no manual matching. Paystack for cards. Manual recording and bank transfer also supported with proof upload."
              tags={['STK Push','Auto-reconcile','Paystack','Bank transfer']}
            />
            <FeatureCard
              delay="reveal-d3"
              icon={<svg width="24" height="24" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
              title="Digital Lease Signing"
              body="Tenant receives an email with a unique token link. They open it, review the lease, and sign online — no printing, no scanning. Lease status flips to ACTIVE automatically."
            />

            {/* Row 2 */}
            <FeatureCard
              delay="reveal-d1"
              icon={<svg width="24" height="24" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
              title="Automated Billing"
              body="Monthly bills = Rent + Water (meter reading–based) + Garbage + Recurring charges. Mass billing generates hundreds of statements in one click. Auto-reminders chase overdue tenants."
              tags={['Water readings','Mass billing','Auto-reminders']}
            />
            <FeatureCard
              delay="reveal-d2"
              icon={<svg width="26" height="26" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>}
              title="Maintenance Workflows"
              body="Full 5-stage lifecycle: PENDING → ASSIGNED → IN_PROGRESS → AWAITING_PARTS → COMPLETED. Assigned to caretakers with notes, linked to inventory for parts tracking. Tenants see real-time status."
              tags={['5-stage lifecycle','Inventory linked','Caretaker assigned']}
            />
            <FeatureCard
              delay="reveal-d3"
              icon={<svg width="28" height="28" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>}
              title="Inventory & Purchase Orders"
              body="Full stock management with a dedicated Storekeeper role. Purchase Order workflow: DRAFT → APPROVED → RECEIVED auto-increments stock. Maintenance requests consume inventory. Never run out of parts unnoticed."
              tags={['Stock management','PO workflow','Auto-stock update','Storekeeper role']}
            />

            {/* Row 3: AI + Roles strip */}
            <div className="bento-ai-row">
              <FeatureCard
                delay="reveal-d1"
                icon={<svg width="26" height="26" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
                title="Njiti AI Agent"
                body="Your in-dashboard AI guide. Ask Njiti anything — how to transfer a tenant, how to raise a purchase order, how to generate a report. Step-by-step guidance for every workflow, always available inside the app. Powered by Claude."
                tags={['In-dashboard','Workflow guidance','Powered by Claude']}
              />
              <FeatureCard
                delay="reveal-d2"
                icon={<svg width="26" height="26" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>}
                title="AI Business Insights"
                body="Claude Haiku analyses your portfolio data — occupancy trends, collection performance, high-risk tenants, revenue forecasts — and surfaces actionable insights. This is live today. Not Q3. Not roadmap. Now."
                tags={['Claude Haiku','Occupancy trends','Collection analysis','Live today']}
              />
            </div>

            {/* Row 4: Feature detail rows */}
            <div className="bento-detail-row reveal">
              <div style={{ fontFamily:'Jost,sans-serif', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:2, color:'var(--slate-l)', marginBottom:32 }}>More in every plan</div>
              <div className="feature-detail-grid">
                {[
                  { icon:'👥', title:'5 Role Dashboards', body:'Admin, Manager, Caretaker, Storekeeper, Tenant — each with purpose-built views and permissions. Nothing leaks between roles.' },
                  { icon:'🏠', title:'Tenant Portal', body:'Tenants pay, sign leases, submit maintenance requests, view billing history, and track their request status — all from their own dashboard.' },
                  { icon:'📊', title:'Reports & Analytics', body:'Revenue, occupancy rates, collection rates, expense reports, expiring leases — filterable by property, date, and status.' },
                  { icon:'🧾', title:'Tax & Compliance', body:'KRA VAT calculations and withholding tax built into billing. Correct figures, correct filings.' },
                  { icon:'🔄', title:'Unit Transfer Wizard', body:'3-step guided transfer: select destination unit → set terms → confirm and archive old lease. Full history preserved.' },
                  { icon:'🔍', title:'Audit Trail', body:'Every admin action — payment recording, lease change, user creation — logged with timestamp, user ID, and detail. Tamper-evident history.' },
                  { icon:'🛡️', title:'Enterprise Security', body:'JWT auth, CSRF protection, input sanitization, role-based access, rate limiting, 20-min idle session timeout with warning modal.' },
                  { icon:'🏢', title:'Multi-Tenant SaaS', body:'Each company gets their own subdomain and isolated PostgreSQL schema. Your data is never co-mingled with another company\'s data.' },
                ].map((item, i) => (
                  <div key={i} className="feature-detail-item">
                    <div className="fdi-icon">{item.icon}</div>
                    <div>
                      <div className="fdi-title">{item.title}</div>
                      <div className="fdi-body">{item.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 4: DASHBOARD PREVIEW ══════════════════════════════ */}
      <section id="dashprev" className="section" style={{ background:'var(--warm)' }}>
        <div className="container">
          <div className="dashprev-grid">
            <div>
              <Ch num="04" text="Command Center" />
              <h2 className="dsp reveal" style={{ fontSize:'clamp(40px,5vw,68px)', fontWeight:600, letterSpacing:'-2px', lineHeight:1, color:'var(--slate)', marginBottom:24 }}>
                Your portfolio.<br />Every role.<br /><em style={{ color:'var(--terra)' }}>One screen.</em>
              </h2>
              <p className="reveal reveal-d1" style={{ fontSize:16, color:'var(--slate-m)', lineHeight:1.9, marginBottom:36 }}>
                Role-aware dashboards that show each user exactly what they need. The Admin
                sees portfolio-wide KPIs. The Caretaker sees their maintenance queue.
                The Tenant sees their balance and lease. Each role, perfectly scoped.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:18 }} className="reveal reveal-d2">
                {[
                  { icon:'📈', title:'Real-time KPIs', sub:'Occupancy, revenue, collection rate — live' },
                  { icon:'💬', title:'M-Pesa auto-reconciliation', sub:'Daraja callbacks match payments instantly' },
                  { icon:'📋', title:'Bulk operations', sub:'Mass billing, mass reminders, bulk exports' },
                  { icon:'⏱️', title:'Lease expiry tracking', sub:'30 / 60 / 90-day automated email sequences' },
                ].map((item, i) => (
                  <div key={i} style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                    <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:'rgba(226,125,96,.1)', border:'1px solid rgba(226,125,96,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontFamily:'Jost,sans-serif', fontWeight:600, fontSize:14, color:'var(--slate)', marginBottom:3 }}>{item.title}</div>
                      <div style={{ fontSize:13, color:'var(--slate-l)', lineHeight:1.6 }}>{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock dashboard */}
            <div className="reveal-r">
              <div className="dash-shell">
                <div className="dash-topbar">
                  <div className="dash-dot" style={{ background:'#ff5f57' }} />
                  <div className="dash-dot" style={{ background:'#ffbd2e' }} />
                  <div className="dash-dot" style={{ background:'#28c840' }} />
                  <div className="dash-url">acme.makejahomes.co.ke/dashboard</div>
                </div>
                <div className="dash-body">
                  <div className="dash-sidebar">
                    <div className="dash-sidebar-brand">
                      <div style={{ width:26, height:26, borderRadius:7, background:'linear-gradient(135deg,var(--slate),var(--terra))', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cormorant Garamond,serif', fontWeight:700, fontSize:14, color:'white', flexShrink:0 }}>M</div>
                      <span style={{ fontFamily:'Jost,sans-serif', fontWeight:700, fontSize:13, color:'rgba(194,214,216,.7)' }}>Acme Properties</span>
                    </div>
                    <div className="dash-section-label">Overview</div>
                    {[
                      { label:'Dashboard', icon:'⬛', active:true },
                      { label:'Properties', icon:'🏠', active:false },
                      { label:'Units', icon:'🔑', active:false },
                      { label:'Tenants', icon:'👥', active:false },
                    ].map(item => (
                      <div key={item.label} className={`dash-nav-item${item.active ? ' active' : ''}`}>
                        <span style={{ fontSize:11 }}>{item.icon}</span> {item.label}
                      </div>
                    ))}
                    <div className="dash-section-label">Finance</div>
                    {[
                      { label:'Billing', icon:'💰', active:false },
                      { label:'Payments', icon:'💳', active:false },
                      { label:'Reports', icon:'📊', active:false },
                    ].map(item => (
                      <div key={item.label} className={`dash-nav-item${item.active ? ' active' : ''}`}>
                        <span style={{ fontSize:11 }}>{item.icon}</span> {item.label}
                      </div>
                    ))}
                    <div className="dash-section-label">Operations</div>
                    {[
                      { label:'Maintenance', icon:'🔧', active:false },
                      { label:'Inventory', icon:'📦', active:false },
                      { label:'Njiti AI', icon:'🤖', active:false },
                    ].map(item => (
                      <div key={item.label} className={`dash-nav-item${item.active ? ' active' : ''}`}>
                        <span style={{ fontSize:11 }}>{item.icon}</span> {item.label}
                      </div>
                    ))}
                  </div>
                  <div className="dash-main">
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                      <div style={{ fontFamily:'Jost,sans-serif', fontSize:14, fontWeight:600, color:'var(--slate)' }}>Admin Overview — April 2026</div>
                      <div style={{ background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)', borderRadius:6, padding:'3px 10px', fontFamily:'Jost,sans-serif', fontSize:10, fontWeight:700, color:'#16a34a' }}>● Live</div>
                    </div>
                    <div className="kpi-grid">
                      <div className="kpi">
                        <div className="kpi-val" style={{ color:'var(--terra)' }}>284</div>
                        <div className="kpi-sub">Active Units</div>
                        <div className="kpi-delta">↑ +6 this month</div>
                      </div>
                      <div className="kpi">
                        <div className="kpi-val" style={{ fontSize:22 }}>3.8M</div>
                        <div className="kpi-sub">KES Revenue</div>
                        <div className="kpi-delta">↑ +12.4% vs last</div>
                      </div>
                      <div className="kpi">
                        <div className="kpi-val">91.5%</div>
                        <div className="kpi-sub">Collection Rate</div>
                        <div className="kpi-delta">↑ +3.2% vs last</div>
                      </div>
                    </div>
                    {/* Mini payment activity */}
                    <div className="dash-table">
                      <div className="dt-head">
                        <span>Tenant</span>
                        <span style={{ textAlign:'center' }}>Unit</span>
                        <span style={{ textAlign:'center' }}>Amount</span>
                        <span style={{ textAlign:'center' }}>Status</span>
                      </div>
                      {[
                        { name:'Janet Achieng', unit:'A-104', amount:'KES 28,000', sc:'s-paid', label:'M-Pesa' },
                        { name:'Brian Mutuku', unit:'B-201', amount:'KES 35,500', sc:'s-pend', label:'Pending' },
                        { name:'Wanjiku Njoroge', unit:'C-302', amount:'KES 42,000', sc:'s-paid', label:'M-Pesa' },
                        { name:'Kevin Odhiambo', unit:'A-208', amount:'KES 18,000', sc:'s-over', label:'Overdue' },
                      ].map(r => (
                        <div key={r.name} className="dt-row">
                          <span className="dt-name">{r.name}</span>
                          <span className="dt-val">{r.unit}</span>
                          <span className="dt-val" style={{ fontWeight:600, color:'var(--slate)' }}>{r.amount}</span>
                          <span className="dt-val"><span className={`status-pill ${r.sc}`}>{r.label}</span></span>
                        </div>
                      ))}
                    </div>
                    {/* Njiti chat snippet */}
                    <div className="dash-njiti-strip">
                      <div style={{ fontFamily:'Jost,sans-serif', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--slate-l)', marginBottom:10 }}>Njiti AI</div>
                      <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                        <div style={{ width:24, height:24, borderRadius:7, background:'var(--terra)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0 }}>🤖</div>
                        <div style={{ background:'rgba(62,78,80,.07)', borderRadius:'0 10px 10px 10px', padding:'8px 12px', fontSize:11, color:'var(--slate)', lineHeight:1.6, flex:1 }}>
                          Your April collection rate is 91.5% — up 3.2%. Brian Mutuku in B-201 is 3 days overdue. Send reminder?
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 5: A ROLE FOR EVERYONE ════════════════════════════ */}
      <section id="roles" className="section" style={{ background:'var(--char)' }} aria-label="User roles">
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(194,214,216,.028) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }} />
        <div className="container" style={{ position:'relative', zIndex:2 }}>
          <div style={{ textAlign:'center', marginBottom:88 }}>
            <Ch num="05" text="A Role for Everyone" light />
            <h2 className="dsp reveal" style={{ fontSize:'clamp(40px,5vw,72px)', fontWeight:600, letterSpacing:'-2.5px', lineHeight:.98, color:'var(--cream)', marginBottom:24 }}>
              Five dashboards.<br /><em style={{ color:'var(--terra)' }}>One system.</em>
            </h2>
            <p className="reveal reveal-d1" style={{ fontSize:18, color:'rgba(194,214,216,.5)', maxWidth:540, margin:'0 auto', lineHeight:1.72 }}>
              Every person on your team gets a purpose-built interface. Nothing overwhelming.
              Nothing missing. Exactly what each role needs.
            </p>
          </div>

          <div className="roles-grid">
            <RoleCard
              icon="👑" role="Admin"
              color="var(--terra)"
              delay="reveal-d1"
              duties={[
                'Full portfolio overview & KPIs',
                'Create properties, units, and staff',
                'Set subscription plan & billing',
                'Full reports & AI insights',
                'Audit trail access',
                'Njiti AI assistant',
              ]}
            />
            <RoleCard
              icon="🗂️" role="Manager"
              color="var(--gold)"
              delay="reveal-d2"
              duties={[
                'Manage tenants & leases',
                'Approve maintenance requests',
                'Send payment reminders',
                'Generate monthly bills',
                'View financial reports',
                'Handle unit transfers',
              ]}
            />
            <RoleCard
              icon="🔧" role="Caretaker"
              color="#6EE7B7"
              delay="reveal-d3"
              duties={[
                'View & update maintenance jobs',
                'Request parts from inventory',
                'Mark tasks IN_PROGRESS → COMPLETED',
                'Communicate with tenants',
                'Log repair notes & photos',
              ]}
            />
            <RoleCard
              icon="📦" role="Storekeeper"
              color="#93C5FD"
              delay="reveal-d4"
              duties={[
                'Manage stock inventory',
                'Receive purchase orders',
                'Issue items to maintenance jobs',
                'Monitor stock levels',
                'Approve/reject PO requests',
              ]}
            />
            <RoleCard
              icon="🏠" role="Tenant"
              color="var(--slate-xl)"
              delay="reveal-d4"
              duties={[
                'View and pay bills online',
                'M-Pesa STK Push payment',
                'Sign leases digitally',
                'Submit maintenance requests',
                'View payment history',
                'Download receipts',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 6: THE TENANT WORKFLOW ════════════════════════════ */}
      <section id="workflow" className="section" style={{ background:'var(--cream)' }} aria-label="Tenant lifecycle workflow">
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:88 }}>
            <Ch num="06" text="The Tenant Lifecycle" />
            <h2 className="dsp reveal" style={{ fontSize:'clamp(40px,5vw,72px)', fontWeight:600, letterSpacing:'-2.5px', lineHeight:.98, color:'var(--slate)', marginBottom:24 }}>
              End-to-end.<br /><em style={{ color:'var(--terra)' }}>Fully automated.</em>
            </h2>
            <p className="reveal reveal-d1" style={{ fontSize:18, color:'var(--slate-m)', maxWidth:560, margin:'0 auto', lineHeight:1.72 }}>
              From the first inquiry to the final deposit refund — every step of the tenant
              journey is handled inside Makeja Homes.
            </p>
          </div>

          <div className="workflow-timeline">
            {[
              { num:'01', title:'Onboarding', color:'var(--terra)', body:'Add tenant details, assign unit, set lease terms. System auto-generates the lease agreement with all specified conditions and charges.' },
              { num:'02', title:'Digital Lease Signing', color:'var(--gold)', body:'Tenant receives an email with a unique signing link. They open it, review the full agreement, and sign online. Lease flips to ACTIVE.' },
              { num:'03', title:'Monthly Billing', color:'#6EE7B7', body:'Each billing cycle, system auto-generates: Rent + Water (based on meter readings) + Garbage + any recurring charges. One statement, all in.' },
              { num:'04', title:'M-Pesa Payment', color:'#93C5FD', body:'Tenant pays via STK Push directly from their phone. Daraja callback reconciles the payment in real time. Receipt auto-generated and emailed.' },
              { num:'05', title:'Maintenance Requests', color:'var(--terra-l)', body:'Tenant submits a request. Manager assigns to Caretaker. Caretaker updates status. Parts pulled from inventory if needed. Tenant sees every update.' },
              { num:'06', title:'Unit Transfer', color:'var(--gold)', body:'3-step transfer wizard: choose destination unit → set new lease terms → confirm. Old lease archived, new lease created, move date recorded.' },
              { num:'07', title:'Vacating & Assessment', color:'var(--slate-xl)', body:'Tenant submits notice. Damage assessment completed. Deposit refund calculated (deducting any damage amounts). Payment recorded. Audit trail sealed.' },
            ].map((step, i) => (
              <div key={i} className={`wf-step reveal reveal-d${Math.min(i + 1, 4)}`}>
                <div className="wf-num" style={{ color: step.color }}>{step.num}</div>
                <div className="wf-connector" style={i < 6 ? { background:`linear-gradient(to bottom,${step.color},rgba(62,78,80,.12))` } : { display:'none' }} />
                <div className="wf-card">
                  <div className="wf-dot" style={{ background: step.color, boxShadow:`0 0 16px ${step.color}60` }} />
                  <h3 className="wf-title">{step.title}</h3>
                  <p className="wf-body">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 7: PRICING ═════════════════════════════════════════ */}
      <section id="pricing" className="section" style={{ background:'var(--warm)' }} aria-label="Pricing plans">
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:80 }}>
            <Ch num="07" text="Pricing" />
            <h2 className="dsp reveal" style={{ fontSize:'clamp(40px,5vw,72px)', fontWeight:600, letterSpacing:'-2.5px', lineHeight:.98, color:'var(--slate)', marginBottom:20 }}>
              Simple, transparent<br /><em style={{ color:'var(--terra)' }}>pricing.</em>
            </h2>
            <p className="reveal reveal-d1" style={{ fontSize:18, color:'var(--slate-m)' }}>
              Start free. Scale as you grow. Unlimited properties on every plan.
            </p>
          </div>

          <div className="price-grid-inner">
            {/* Starter */}
            <div className="price-card reveal">
              <div className="price-name" style={{ color:'var(--slate-m)' }}>Starter</div>
              <div className="price-desc">For independent landlords getting started</div>
              <div className="price-amt">
                <span className="price-cur">KES</span>
                <span className="price-num">4,999</span>
                <span className="price-per">/mo</span>
              </div>
              <div className="price-units-badge">Up to 20 units</div>
              <div className="price-feat">
                {[
                  'Unlimited properties',
                  'Up to 20 units',
                  'All 5 role dashboards',
                  'M-Pesa + Paystack payments',
                  'Digital lease signing',
                  'Automated billing & water',
                  'Maintenance workflows',
                  'Tenant portal',
                  'Email support',
                ].map(f => <PriceFeat key={f} text={f} />)}
              </div>
              <Link href="/onboarding" className="btn-slate">Start Free Trial</Link>
            </div>

            {/* Growth — most popular */}
            <div className="price-card popular reveal reveal-d2">
              <div className="pop-badge">Most Popular</div>
              <div className="price-name" style={{ color:'var(--terra)' }}>Growth</div>
              <div className="price-desc">For growing property businesses</div>
              <div className="price-amt">
                <span className="price-cur">KES</span>
                <span className="price-num">9,999</span>
                <span className="price-per">/mo</span>
              </div>
              <div className="price-units-badge price-units-popular">Up to 100 units</div>
              <div className="price-feat">
                {[
                  'Everything in Starter',
                  'Up to 100 units',
                  'AI Business Insights',
                  'Njiti AI Agent',
                  'Purchase orders & inventory',
                  'Advanced reports & analytics',
                  'KRA tax module',
                  'Audit trail',
                  'Priority support',
                ].map(f => <PriceFeat key={f} text={f} />)}
              </div>
              <Link href="/onboarding" className="btn-terra">Start Free Trial</Link>
            </div>

            {/* Pro */}
            <div className="price-card reveal reveal-d3">
              <div className="price-name" style={{ color:'var(--slate-m)' }}>Pro</div>
              <div className="price-desc">For property management companies</div>
              <div className="price-amt">
                <span className="price-cur">KES</span>
                <span className="price-num" style={{ fontSize:46 }}>24,999</span>
                <span className="price-per">/mo</span>
              </div>
              <div className="price-units-badge">Up to 500 units</div>
              <div className="price-feat">
                {[
                  'Everything in Growth',
                  'Up to 500 units',
                  'Dedicated account manager',
                  'Custom integrations',
                  'SLA uptime guarantee',
                  'Onboarding & training',
                ].map(f => <PriceFeat key={f} text={f} />)}
              </div>
              <Link href="/onboarding" className="btn-outline-terra">Start Free Trial</Link>
            </div>
          </div>

          {/* Enterprise add-on */}
          <div className="price-enterprise-row reveal" style={{ marginTop:28 }}>
            <div>
              <div style={{ fontFamily:'Jost,sans-serif', fontWeight:700, fontSize:14, color:'var(--slate)', marginBottom:4 }}>Enterprise</div>
              <div style={{ fontSize:14, color:'var(--slate-m)' }}>500+ units, white-labelling, custom SLAs, dedicated infrastructure. Let's talk.</div>
            </div>
            <a href="https://wa.me/254796809106" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ flexShrink:0, textDecoration:'none' }}>
              WhatsApp Us <ArrowRight />
            </a>
          </div>

          <p className="reveal" style={{ textAlign:'center', marginTop:36, fontSize:14, color:'var(--slate-l)', fontFamily:'Jost,sans-serif', letterSpacing:.2 }}>
            All plans include a 14-day free trial · No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      {/* ═══ CHAPTER 8: VISION ══════════════════════════════════════════ */}
      <section id="vision" className="section" style={{ background:'var(--slate)', position:'relative', overflow:'hidden' }} aria-label="Our vision and testimonials">
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(194,214,216,.035) 1px,transparent 1px)', backgroundSize:'36px 36px', pointerEvents:'none' }} />

        <div className="container" style={{ position:'relative', zIndex:2 }}>
          <div className="vision-inner">
            <div>
              <Ch num="08" text="Our Vision" light />
              <h2 className="dsp reveal" style={{ fontSize:'clamp(44px,5.5vw,76px)', fontWeight:600, letterSpacing:'-2px', lineHeight:.98, color:'var(--cream)', marginBottom:36 }}>
                Built for Africa.<br /><em style={{ color:'var(--terra)' }}>Ready for the world.</em>
              </h2>
              <p className="reveal reveal-d1" style={{ fontSize:17, color:'rgba(194,214,216,.58)', lineHeight:1.9, marginBottom:24 }}>
                Makeja Homes was born in Nairobi — built to solve the real problems of property
                management across Africa: mobile payment reconciliation, water-reading billing,
                local tax compliance, and the chaos of managing tenants across WhatsApp.
              </p>
              <p className="reveal reveal-d2" style={{ fontSize:17, color:'rgba(194,214,216,.58)', lineHeight:1.9, marginBottom:48 }}>
                Get that right — and you have the foundations of something that works anywhere.
                From Nairobi to Lagos. From Kigali to Cape Town. From East Africa to the world.
              </p>
              <Link href="/onboarding" className="btn-primary reveal reveal-d3" style={{ display:'inline-flex' }}>
                Join the Platform <ArrowRight />
              </Link>
            </div>

            <div className="vision-cards">
              {[
                { icon:'🌍', title:'Born in Nairobi', body:'Every feature built from real conversations with Kenyan property managers. Not adapted from a US product.' },
                { icon:'🤖', title:'AI — Live Today', body:'Claude Haiku insights and Njiti AI Agent are running now. No Q3 promises. No roadmap theatre. Live.' },
                { icon:'🔒', title:'Enterprise Security', body:'JWT auth, CSRF protection, rate limiting, isolated schemas. The same security stack as fintech.' },
                { icon:'🔲', title:'Multi-Tenant SaaS', body:'Your company. Your subdomain. Your data. Completely isolated from every other customer on the platform.' },
              ].map((item, i) => (
                <div key={i} className={`vis-card reveal reveal-d${i + 1}`}>
                  <div style={{ fontSize:28, marginBottom:14 }}>{item.icon}</div>
                  <div className="dsp" style={{ fontWeight:600, fontSize:20, color:'var(--cream)', marginBottom:8 }}>{item.title}</div>
                  <div style={{ fontSize:14, color:'rgba(194,214,216,.48)', lineHeight:1.72 }}>{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="testimonials-grid" style={{ marginTop:100, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
            {[
              { q:'"Before Makeja I managed 40 units on WhatsApp and Excel. Now I run 80+ with half the admin time. The M-Pesa auto-reconciliation alone saves me 12 hours a month."', name:'James Mwangi', role:'Property Manager, Westlands' },
              { q:'"Digital lease signing changed everything. No more chasing tenants to the office with a printout. They sign from their phone, I get notified instantly."', name:'Grace Kamau', role:'Landlord, Karen — 80 units', highlight:true },
              { q:'"The Njiti AI agent is genuinely useful. I asked it how to transfer a tenant between units and it walked me through every step. I didn\'t need to call anyone."', name:'David Ochieng', role:'Portfolio Manager — 6 properties' },
            ].map((t, i) => (
              <div key={i} className={`vis-card reveal reveal-d${i + 1}`} style={t.highlight ? { borderColor:'rgba(226,125,96,.2)' } : {}}>
                <div style={{ color:'var(--gold)', fontSize:16, marginBottom:20 }}>★★★★★</div>
                <p style={{ fontSize:15, color:'rgba(194,214,216,.58)', lineHeight:1.85, marginBottom:28, fontStyle:'italic' }}>{t.q}</p>
                <div className="dsp" style={{ fontWeight:600, fontSize:17, color:'var(--cream)' }}>{t.name}</div>
                <div style={{ fontSize:12, color:'rgba(194,214,216,.38)', fontFamily:'Jost,sans-serif', letterSpacing:.3, marginTop:4 }}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 9: FINAL CTA ════════════════════════════════════════ */}
      <section id="cta">
        <div style={{ position:'absolute', top:-80, right:-60, width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,.14) 0%,transparent 65%)', filter:'blur(60px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:-40, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(157,74,54,.6) 0%,transparent 65%)', filter:'blur(50px)', pointerEvents:'none' }} />

        <div className="container" style={{ position:'relative', zIndex:2, textAlign:'center' }}>
          <Ch num="09" text="Your Destination" />
          <h2 className="cta-h reveal">
            Stop managing<br />in WhatsApp.
          </h2>
          <p className="cta-sub reveal reveal-d1">
            Get your own subdomain, 5 role dashboards, M-Pesa integration, and the full
            Makeja Homes platform — free for 14 days. No credit card. No contracts.
          </p>
          <div className="reveal reveal-d2" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, flexWrap:'wrap' }}>
            <Link href="/onboarding" className="btn-cta-white">
              Start Free — 14 Days <ArrowRight />
            </Link>
            <a href="https://wa.me/254796809106" target="_blank" rel="noopener noreferrer" className="btn-cta-outline">
              💬 WhatsApp Us
            </a>
          </div>
          <p className="reveal reveal-d3" style={{ marginTop:28, fontSize:14, color:'rgba(255,255,255,.48)', fontFamily:'Jost,sans-serif', letterSpacing:.3 }}>
            No credit card · Cancel anytime · Real human support · Built in Nairobi, Kenya 🇰🇪
          </p>

          <div className="reveal reveal-d4 stat-strip" style={{ marginTop:80, paddingTop:56, borderTop:'1px solid rgba(255,255,255,.15)', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
            {[
              { v:'3,200+', l:'Units Tracked' },
              { v:'KES 42M+', l:'Processed' },
              { v:'98.2%', l:'Uptime' },
              { v:'14 days', l:'Free Trial' },
            ].map((s, i) => (
              <div key={i} style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,.15)' : 'none', padding:'8px 0' }}>
                <div className="dsp" style={{ fontSize:42, fontWeight:700, color:'white', lineHeight:1 }}>{s.v}</div>
                <div style={{ fontFamily:'Jost,sans-serif', fontSize:11, fontWeight:600, color:'rgba(255,255,255,.48)', textTransform:'uppercase', letterSpacing:1, marginTop:8 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      </main>
      {/* ═══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer id="footer" aria-label="Site footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
                <div className="logo-mark">M</div>
                <span style={{ fontFamily:'Jost,sans-serif', fontWeight:700, fontSize:18, color:'var(--cream)' }}>Makeja Homes</span>
              </div>
              <p style={{ color:'rgba(194,214,216,.28)', fontSize:15, lineHeight:1.85, maxWidth:290, marginBottom:32 }}>
                Professional property management software for serious landlords and property companies. Local payment integrations built in.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <a href="mailto:makejahomes@gmail.com" style={{ color:'rgba(194,214,216,.28)', fontSize:14, textDecoration:'none', display:'flex', alignItems:'center', gap:9 }}>
                  ✉ makejahomes@gmail.com
                </a>
                <a href="tel:+254796809106" style={{ color:'rgba(194,214,216,.28)', fontSize:14, textDecoration:'none', display:'flex', alignItems:'center', gap:9 }}>
                  📞 +254 796 809 106
                </a>
                <a href="https://wa.me/254796809106" target="_blank" rel="noopener noreferrer" style={{ color:'rgba(194,214,216,.28)', fontSize:14, textDecoration:'none', display:'flex', alignItems:'center', gap:9 }}>
                  💬 WhatsApp
                </a>
              </div>
            </div>
            <div>
              <div className="footer-head">Product</div>
              {[['Features', '#features'], ['Pricing', '#pricing'], ['How It Works', '#workflow'], ['Login', '/auth/login'], ['Start Free Trial', '/onboarding']].map(([l, h]) => (
                <Link key={h} href={h} className="fl">{l}</Link>
              ))}
            </div>
            <div>
              <div className="footer-head">Company</div>
              {[['About Us', '#vision'], ['Contact', '#footer'], ['Blog', '/blog'], ['Careers', '/careers']].map(([l, h]) => (
                <Link key={h} href={h} className="fl">{l}</Link>
              ))}
            </div>
            <div>
              <div className="footer-head">Legal</div>
              {[['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Security', '/security'], ['Cookies', '/cookies']].map(([l, h]) => (
                <Link key={h} href={h} className="fl">{l}</Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop:'1px solid rgba(194,214,216,.055)', paddingTop:36, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
            <p style={{ fontSize:13, color:'rgba(194,214,216,.2)', fontFamily:'Jost,sans-serif' }}>
              © 2026 Makeja Homes Ltd. Built in Nairobi, Kenya 🇰🇪
            </p>
            <p style={{ fontSize:13, color:'rgba(194,214,216,.2)', fontFamily:'Jost,sans-serif' }}>
              Professional property intelligence — from Africa, for the world.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
