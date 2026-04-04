import Link from 'next/link'
import dynamic from 'next/dynamic'
import './marketing.css'

const HeroScene = dynamic(() => import('@/components/HeroScene'), { ssr: false })
const MarketingInteractions = dynamic(() => import('@/components/MarketingInteractions'), { ssr: false })

export const metadata = {
  title: 'Makeja Homes — Property Management, Evolved.',
  description: 'World-class property management software for the modern landlord. Manage portfolios, automate billing, and scale your real estate business from anywhere.',
}

// ── SVG ICON HELPERS ─────────────────────────────────────────────
const ArrowRight = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)
const Play = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/>
  </svg>
)
const Check = () => (
  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--terra)" strokeWidth="3.5">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
)

// ── FEATURE CARD ─────────────────────────────────────────────────
function FeatureCard({ icon, title, body, tags, span, delay }: {
  icon: React.ReactNode, title: string, body: string,
  tags?: string[], span?: number, delay?: string
}) {
  return (
    <div
      className={`tilt-card reveal${delay ? ' ' + delay : ''}`}
      style={{ gridColumn: span ? `span ${span}` : undefined, cursor: 'default' }}
    >
      <div className="tc-icon">{icon}</div>
      <h3 className="tc-title">{title}</h3>
      <p className="tc-body">{body}</p>
      {tags && (
        <div className="tc-tags">
          {tags.map(t => <span key={t} className="tc-tag">{t}</span>)}
        </div>
      )}
    </div>
  )
}

// ── PRICING FEATURE ───────────────────────────────────────────────
function PriceFeat({ text }: { text: string }) {
  return (
    <div className="pf">
      <div className="pf-check"><Check /></div>
      {text}
    </div>
  )
}

// ── CHAPTER LABEL ─────────────────────────────────────────────────
function Ch({ num, text, light }: { num: string, text: string, light?: boolean }) {
  return (
    <div className="ch" style={{ marginBottom: 24 }}>
      <span className="ch-num">{num}</span>
      <div className="ch-line" />
      <span className="ch-text" style={light ? { color: 'rgba(194,214,216,.48)' } : {}}>{text}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
export default function MarketingPage() {
  return (
    <>
      {/* Grain overlay */}
      <canvas id="grain" />

      {/* Custom cursor */}
      <div id="cur-dot" />
      <div id="cur-ring" />

      {/* Scroll progress */}
      <div id="progress" />

      {/* Client-side interactions */}
      <MarketingInteractions />

      {/* ═══ NAV ════════════════════════════════════════════════════ */}
      <nav id="nav">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div className="logo-mark">M</div>
          <span className="logo-text">Makeja Homes</span>
        </Link>

        <div className="hide-m" style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <a href="#features" className="nl">Features</a>
          <a href="#howitworks" className="nl">How It Works</a>
          <a href="#pricing" className="nl">Pricing</a>
          <a href="#vision" className="nl">About</a>
          <a href="#footer" className="nl">Contact</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/auth/login" className="nl hide-m" style={{ padding: '8px 14px' }}>Login</Link>
          <Link href="/auth/register" className="nav-cta">Get Started →</Link>
        </div>
      </nav>

      {/* ═══ HERO ════════════════════════════════════════════════════ */}
      <section id="hero">
        <HeroScene />

        {/* Vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 80% at 60% 50%,transparent 30%,rgba(19,27,29,.72) 80%)', pointerEvents: 'none', zIndex: 5 }} />
        {/* Bottom blend */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, background: 'linear-gradient(to bottom,transparent,var(--char))', pointerEvents: 'none', zIndex: 6 }} />

        {/* HERO IMAGE SLOT — paste your image path here */}
        {/* <img src="/images/hero-city.jpg" style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',zIndex:0,opacity:.14 }} alt="" /> */}

        <div className="hero-content" style={{ position: 'relative', zIndex: 10, maxWidth: 780 }}>
          <div className="hero-tag">
            <span className="hero-tag-dot" />
            World-Class Property Intelligence · Born in Nairobi 🇰🇪
          </div>

          <h1 className="hero-h1">
            <span style={{ display: 'block' }}>Your Properties.</span>
            <span style={{ display: 'block' }}>
              <em className="hero-h1-terra">Your Empire.</em>
            </span>
          </h1>

          <p className="hero-sub">
            Makeja Homes is the unified command center for ambitious property managers worldwide.
            Every property, every tenant, every transaction — organized, automated, and 
            completely under your control. Built in Africa. Ready for the world.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/auth/register" className="btn-primary">
              Begin Your Journey <ArrowRight />
            </Link>
            <a href="#features" className="btn-ghost">
              <Play /> See How It Works
            </a>
          </div>
        </div>

        {/* Floating stat cards */}
        <div className="hero-stats hide-m">
          <div className="hero-stat">
            <div className="hero-stat-v">
              <span className="count-up" data-target="171">0</span>+
            </div>
            <div className="hero-stat-l">Units Managed</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-v" style={{ fontSize: 28 }}>
              KSH <span className="count-up" data-target="1.2" data-suffix="M+">0</span>
            </div>
            <div className="hero-stat-l">Monthly Revenue</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-v">
              <span className="count-up" data-target="79.5" data-suffix="%">0</span>
            </div>
            <div className="hero-stat-l">Avg Occupancy</div>
          </div>
        </div>

        <div className="hero-scroll">
          <span>Scroll</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* ═══ MARQUEE ════════════════════════════════════════════════ */}
      <div id="marquee">
        <div className="marquee-inner">
          {['Portfolio Management','Tenant Portals','Automated Billing','Digital Payments','Lease Automation','Maintenance Tracking','Financial Reports','Role-Based Access','AI Automation','Global Ready'].map(item => (
            <>
              <span className="mi" key={item}>{item}</span>
              <span className="mi-dot" key={item+'-dot'}>✦</span>
            </>
          ))}
          {/* Duplicate for seamless loop */}
          {['Portfolio Management','Tenant Portals','Automated Billing','Digital Payments','Lease Automation','Maintenance Tracking','Financial Reports','Role-Based Access','AI Automation','Global Ready'].map(item => (
            <>
              <span className="mi" key={item+'-2'}>{item}</span>
              <span className="mi-dot" key={item+'-dot2'}>✦</span>
            </>
          ))}
        </div>
      </div>

      {/* ═══ CHAPTER 1: THE PROBLEM ══════════════════════════════════ */}
      <section id="problem" className="section diag-down">
        <div className="container">
          <Ch num="01" text="The Problem" light />
          <h2
            className="dsp reveal"
            style={{ fontSize: 'clamp(48px,6vw,88px)', fontWeight: 600, letterSpacing: '-2.5px', lineHeight: .98, textAlign: 'center', color: 'var(--cream)', marginBottom: 24 }}
          >
            How most landlords<br /><em style={{ color: 'var(--terra)' }}>still manage property.</em>
          </h2>
          <p
            className="reveal reveal-d1"
            style={{ textAlign: 'center', fontSize: 18, color: 'rgba(194,214,216,.52)', maxWidth: 540, margin: '0 auto 80px', lineHeight: 1.72 }}
          >
            Chaos dressed up as a system. The industry runs on WhatsApp, Excel, and hope.
            You deserve better — and your tenants do too.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
            {[
              { icon: '📱', title: 'WhatsApp Chaos', body: 'Broadcast lists for reminders. Personal accounts for payments. Zero paper trail. One disputed transaction and your professional credibility evaporates.' },
              { icon: '📊', title: 'Spreadsheet Hell', body: 'Twelve versions of the same file. Broken formulas. Manual data entry every month. You built a property portfolio — not a data entry operation.' },
              { icon: '🔓', title: 'Zero Security', body: "Sensitive tenant data scattered across Gmail, WhatsApp, and phone contacts. One breach, one lost device — and you've compromised your tenants and your business." },
            ].map((p, i) => (
              <div key={i} className={`prob-card reveal reveal-d${i + 1}`}>
                <div className="prob-icon">{p.icon}</div>
                <h3 className="dsp" style={{ fontSize: 26, fontWeight: 600, color: 'var(--cream)', marginBottom: 14 }}>{p.title}</h3>
                <p style={{ color: 'rgba(194,214,216,.48)', fontSize: 15, lineHeight: 1.82 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 2: THE REVELATION ══════════════════════════════ */}
      <section id="solution" className="section diag-up">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 100, alignItems: 'center' }}>
            <div>
              <Ch num="02" text="The Platform" />
              <h2 className="sol-headline reveal" style={{ marginBottom: 32 }}>
                One platform.<br />
                Total<br />
                <em className="sol-terra">control.</em>
              </h2>
              <p className="reveal reveal-d1" style={{ fontSize: 18, color: 'var(--slate-m)', lineHeight: 1.85, marginBottom: 36 }}>
                Makeja Homes replaces the chaos of spreadsheets, WhatsApp threads, and 
                disconnected tools with a single, intelligent platform — built to the same 
                standard as the world's best property management software, and priced for 
                the global emerging market.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="reveal reveal-d2">
                {[
                  'Manage every property and unit from one elegant dashboard',
                  'Tenants pay digitally, sign leases online, access their own portal',
                  'Automated billing, reminders, and lease management — around the clock',
                  'Bank-grade security, real-time reporting, complete audit trail',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--terra)', flexShrink: 0, marginTop: 7, boxShadow: '0 0 12px rgba(226,125,96,.6)' }} />
                    <span style={{ fontSize: 16, color: 'var(--slate-m)' }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth/register" className="btn-primary reveal reveal-d3" style={{ marginTop: 48, display: 'inline-flex' }}>
                Start Free Trial <ArrowRight />
              </Link>
            </div>

            {/* IMAGE SLOT */}
            <div className="reveal-r" style={{ position: 'relative' }}>
              <div style={{
                borderRadius: 28, overflow: 'hidden',
                background: 'linear-gradient(135deg,var(--cream-d),var(--slate-xl))',
                aspectRatio: '4/5', position: 'relative',
                boxShadow: '0 40px 100px rgba(62,78,80,.18)',
              }}>
                {/* REPLACE WITH: <img src="/images/solution-property.jpg" style={{width:'100%',height:'100%',objectFit:'cover'}} alt="Modern property managed with Makeja Homes" /> */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 72, opacity: .35 }}>🏙️</div>
                  <div style={{ fontFamily: 'Jost,sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--slate-m)', textTransform: 'uppercase', letterSpacing: 2, opacity: .5 }}>Image Slot</div>
                  <div style={{ fontSize: 11, color: 'var(--slate-l)', opacity: .45, textAlign: 'center', padding: '0 40px', lineHeight: 1.6 }}>
                    Recommended: Exterior of modern<br />residential building — warm golden tones
                  </div>
                </div>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right,rgba(226,125,96,.09),transparent)' }} />
              </div>
              {/* Badges */}
              <div style={{ position: 'absolute', bottom: -24, left: -24, background: 'white', borderRadius: 20, padding: '20px 28px', boxShadow: '0 20px 60px rgba(62,78,80,.15)', border: '1px solid rgba(62,78,80,.08)' }}>
                <div className="dsp" style={{ fontWeight: 700, fontSize: 32, color: 'var(--terra)' }}>14 days</div>
                <div style={{ fontFamily: 'Jost,sans-serif', fontSize: 11, fontWeight: 700, color: 'var(--slate-m)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Free trial — no card</div>
              </div>
              <div style={{ position: 'absolute', top: -20, right: -16, background: 'var(--terra)', borderRadius: 16, padding: '16px 20px', boxShadow: '0 12px 40px rgba(226,125,96,.4)' }}>
                <div className="dsp" style={{ fontWeight: 700, fontSize: 28, color: 'white' }}>5★</div>
                <div style={{ fontFamily: 'Jost,sans-serif', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.8)', textTransform: 'uppercase', letterSpacing: .8, marginTop: 4 }}>Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 3: FEATURES BENTO ══════════════════════════════ */}
      <section id="features" className="section" style={{ background: 'var(--cream-d)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 88 }}>
            <Ch num="03" text="The Platform" />
            <h2 className="dsp reveal" style={{ fontSize: 'clamp(48px,6vw,84px)', fontWeight: 600, letterSpacing: '-2.5px', lineHeight: .98, color: 'var(--slate)', marginBottom: 24 }}>
              Every tool you need.<br /><em style={{ color: 'var(--terra)' }}>Perfectly engineered.</em>
            </h2>
            <p className="reveal reveal-d1" style={{ fontSize: 18, color: 'var(--slate-m)', maxWidth: 520, margin: '0 auto', lineHeight: 1.72 }}>
              Built for how the world's best property managers think and operate.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 20 }}>
            <FeatureCard
              span={5} delay="reveal-d1"
              icon={<svg width="28" height="28" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>}
              title="Portfolio Management"
              body="Manage every property, every unit, across any city or country. Track occupancy, performance, and portfolio-level analytics from one elegant command center built for scale."
              tags={['Multi-property', 'Unit tracking', 'Occupancy rates', 'Archiving']}
            />
            <FeatureCard
              span={4} delay="reveal-d2"
              icon={<svg width="26" height="26" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
              title="Smart Payments"
              body="Paystack integration, automated email receipts, real-time webhook verification. Monthly bills as a single source of truth. Every payment, perfectly recorded."
            />
            <FeatureCard
              span={3} delay="reveal-d3"
              icon={<svg width="24" height="24" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
              title="Enterprise Security"
              body="Bank-grade data protection. JWT auth. Role-based access control. Your tenants' data stays secure — always."
            />
            <FeatureCard
              span={3} delay="reveal-d1"
              icon={<svg width="24" height="24" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
              title="Tenant Portals"
              body="Every tenant gets their own dashboard — pay, sign leases, submit maintenance requests, view their full history."
            />
            <FeatureCard
              span={4} delay="reveal-d2"
              icon={<svg width="26" height="26" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
              title="Financial Analytics"
              body="Real-time revenue tracking, occupancy rates, expense management, and reporting designed for data-driven property decisions globally."
            />
            <FeatureCard
              span={5} delay="reveal-d3"
              icon={<svg width="28" height="28" fill="none" stroke="var(--terra)" strokeWidth="1.8" viewBox="0 0 24 24"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>}
              title="Intelligent Automation"
              body="Lease expiry reminders at 30, 60, 90 days. Automatic monthly billing cycles. Cron-scheduled alerts. Your platform works 24/7 while you focus on growth."
              tags={['Lease reminders', 'Auto-billing', 'Cron schedules']}
            />

            {/* Full-width extra */}
            <div style={{ gridColumn: 'span 12', background: 'white', border: '1px solid rgba(62,78,80,.1)', borderRadius: 24, padding: '48px 56px' }} className="reveal">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 52 }}>
                {[
                  { title: 'Lease Management', body: 'Digital agreements with token-based signing. Full audit trail, expiry tracking, and automated renewal workflows.' },
                  { title: 'Maintenance Tracking', body: 'Full lifecycle management from PENDING through COMPLETED with assignment, notes, and resolution timelines.' },
                  { title: 'Inventory & Stores', body: 'Purchase orders, stock management, and a dedicated storekeeper role — built for properties with on-site teams.' },
                  { title: '5 Role Types', body: 'Admin, Manager, Caretaker, Storekeeper, Tenant — each with a purpose-built dashboard and access scope.' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="dsp" style={{ fontWeight: 600, fontSize: 20, color: 'var(--slate)', marginBottom: 8 }}>{item.title}</div>
                    <div style={{ fontSize: 14, color: 'var(--slate-m)', lineHeight: 1.75 }}>{item.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 4: DASHBOARD PREVIEW ═════════════════════════════ */}
      <section id="dashprev" style={{ padding: '140px 0', background: 'var(--warm)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 100, alignItems: 'center' }}>
            <div>
              <Ch num="04" text="Command Center" />
              <h2 className="dsp reveal" style={{ fontSize: 'clamp(40px,5vw,68px)', fontWeight: 600, letterSpacing: '-2px', lineHeight: 1, color: 'var(--slate)', marginBottom: 24 }}>
                Your entire<br />portfolio.<br /><em style={{ color: 'var(--terra)' }}>One screen.</em>
              </h2>
              <p className="reveal reveal-d1" style={{ fontSize: 17, color: 'var(--slate-m)', lineHeight: 1.85, marginBottom: 40 }}>
                A real-time command center that gives you instant clarity across every property, 
                payment, and maintenance request — from any device, anywhere in the world.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="reveal reveal-d2">
                {[
                  { icon: '📊', title: 'Real-time occupancy & revenue', sub: 'Live data, zero manual refresh' },
                  { icon: '🔔', title: 'Overdue payment alerts', sub: 'Automated at 7, 14, and 30 days' },
                  { icon: '📅', title: 'Lease expiry tracker', sub: '30 / 60 / 90-day email sequences' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'rgba(226,125,96,.1)', border: '1px solid rgba(226,125,96,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontFamily: 'Jost,sans-serif', fontWeight: 600, fontSize: 15, color: 'var(--slate)', marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 14, color: 'var(--slate-l)', lineHeight: 1.6 }}>{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock dashboard */}
            <div className="reveal-r">
              <div className="dash-shell">
                <div className="dash-topbar">
                  <div className="dash-dot" style={{ background: '#ff5f57' }} />
                  <div className="dash-dot" style={{ background: '#ffbd2e' }} />
                  <div className="dash-dot" style={{ background: '#28c840' }} />
                  <div className="dash-url">app.makejahomes.co.ke/dashboard</div>
                </div>
                <div className="dash-body">
                  <div className="dash-sidebar">
                    <div style={{ fontFamily: 'Jost,sans-serif', fontSize: 11, fontWeight: 700, color: 'rgba(194,214,216,.28)', textTransform: 'uppercase', letterSpacing: 1.5, padding: '0 14px', marginBottom: 16, marginTop: 8 }}>Navigation</div>
                    {[
                      { label: 'Dashboard', active: true },
                      { label: 'Properties', active: false },
                      { label: 'Tenants', active: false },
                      { label: 'Payments', active: false },
                      { label: 'Maintenance', active: false },
                      { label: 'Reports', active: false },
                    ].map(item => (
                      <div key={item.label} className={`dash-nav-item${item.active ? ' active' : ''}`}>{item.label}</div>
                    ))}
                  </div>
                  <div className="dash-main">
                    <div style={{ fontFamily: 'Jost,sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--slate)', marginBottom: 18 }}>Overview — March 2025</div>
                    <div className="kpi-grid">
                      <div className="kpi">
                        <div className="kpi-val" style={{ color: 'var(--terra)' }}>171</div>
                        <div className="kpi-sub">Active Units</div>
                        <div className="kpi-delta">+3 this month</div>
                      </div>
                      <div className="kpi">
                        <div className="kpi-val" style={{ fontSize: 26 }}>1.2M</div>
                        <div className="kpi-sub">KSH Revenue</div>
                        <div className="kpi-delta">+8.4% vs last</div>
                      </div>
                      <div className="kpi">
                        <div className="kpi-val">79.5%</div>
                        <div className="kpi-sub">Occupancy</div>
                        <div className="kpi-delta">+2.1% vs last</div>
                      </div>
                    </div>
                    <div className="dash-table">
                      <div className="dt-head">
                        <span>Property</span><span style={{ textAlign: 'center' }}>Units</span>
                        <span style={{ textAlign: 'center' }}>Occ.</span><span style={{ textAlign: 'center' }}>Status</span>
                      </div>
                      {[
                        { name: 'Greenview Apts', units: '48/52', occ: 92, status: 'Active', sc: 's-paid' },
                        { name: 'Parklands Estate', units: '31/38', occ: 81, status: 'Billing', sc: 's-pend' },
                        { name: 'Kilimani Heights', units: '64/81', occ: 79, status: 'Active', sc: 's-paid' },
                      ].map(r => (
                        <div key={r.name} className="dt-row">
                          <span className="dt-name">{r.name}</span>
                          <span className="dt-val">{r.units}</span>
                          <span className="dt-val">
                            <div className="prog-bar"><div className="prog-fill" style={{ width: r.occ + '%' }} /></div>
                          </span>
                          <span className="dt-val"><span className={`status-pill ${r.sc}`}>{r.status}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 5: HOW IT WORKS ══════════════════════════════════ */}
      <section id="howitworks" className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 100 }}>
            <Ch num="05" text="The Journey" />
            <h2 className="dsp reveal" style={{ fontSize: 'clamp(48px,6vw,84px)', fontWeight: 600, letterSpacing: '-2.5px', lineHeight: .98, color: 'var(--slate)', marginBottom: 24 }}>
              Up and running<br /><em style={{ color: 'var(--terra)' }}>in 60 minutes.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 72, position: 'relative' }}>
            {[
              { num: '01', title: 'Create your account', body: 'Sign up in under a minute. No credit card, no contracts, no bureaucracy. Your 14-day free trial starts immediately with full access to every feature on the platform.' },
              { num: '02', title: 'Add your portfolio', body: 'Import your properties, units, and existing tenants in minutes. Our onboarding wizard walks you through every step methodically — nothing falls through the cracks.' },
              { num: '03', title: 'Manage everything', body: 'Collect payments, track maintenance, generate professional reports, execute leases digitally. Your entire portfolio — organized, automated, and completely in your control.' },
            ].map((s, i) => (
              <div key={i} className={`reveal reveal-d${i + 1}`}>
                <span className="step-num">{s.num}</span>
                <div className="step-icon-wrap" />
                <h3 className="step-title">{s.title}</h3>
                <p className="step-body">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 6: PRICING ════════════════════════════════════════ */}
      <section id="pricing" className="section" style={{ background: 'var(--warm)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <Ch num="06" text="Investment" />
            <h2 className="dsp reveal" style={{ fontSize: 'clamp(48px,6vw,84px)', fontWeight: 600, letterSpacing: '-2.5px', lineHeight: .98, color: 'var(--slate)', marginBottom: 20 }}>
              Simple, transparent<br /><em style={{ color: 'var(--terra)' }}>pricing.</em>
            </h2>
            <p className="reveal reveal-d1" style={{ fontSize: 18, color: 'var(--slate-m)' }}>
              Start free. Scale as you grow. Zero hidden fees.
            </p>
          </div>

          <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, alignItems: 'center' }}>
            {/* Starter */}
            <div className="price-card reveal">
              <div className="price-name" style={{ color: 'var(--slate-m)' }}>Starter</div>
              <div className="price-desc">For independent landlords</div>
              <div className="price-amt">
                <span className="price-cur">KES</span>
                <span className="price-num">4,999</span>
                <span className="price-per">/mo</span>
              </div>
              <div className="price-feat">
                {['Up to 50 units', '3 properties', 'Tenant portal', 'Digital payments', 'Financial reports', 'Email support'].map(f => <PriceFeat key={f} text={f} />)}
              </div>
              <Link href="/auth/register" className="btn-slate">Start Free Trial</Link>
            </div>

            {/* Pro */}
            <div className="price-card popular reveal reveal-d2">
              <div className="pop-badge">Most Popular</div>
              <div className="price-name" style={{ color: 'var(--terra)' }}>Pro</div>
              <div className="price-desc">For serious property managers</div>
              <div className="price-amt">
                <span className="price-cur">KES</span>
                <span className="price-num">9,999</span>
                <span className="price-per">/mo</span>
              </div>
              <div className="price-feat">
                {['Up to 200 units', 'Unlimited properties', 'Everything in Starter', 'Advanced analytics', 'Team accounts & roles', 'Custom reports', 'Priority support', 'API access'].map(f => <PriceFeat key={f} text={f} />)}
              </div>
              <Link href="/auth/register" className="btn-terra">Start Free Trial</Link>
            </div>

            {/* Enterprise */}
            <div className="price-card reveal reveal-d3">
              <div className="price-name" style={{ color: 'var(--slate-m)' }}>Enterprise</div>
              <div className="price-desc">For property companies</div>
              <div className="price-amt">
                <span className="price-cur">KES</span>
                <span className="price-num" style={{ fontSize: 46 }}>24,999</span>
                <span className="price-per">/mo</span>
              </div>
              <div className="price-feat">
                {['Unlimited everything', 'All Pro features', 'White-labeling', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee + training'].map(f => <PriceFeat key={f} text={f} />)}
              </div>
              <Link href="/contact" className="btn-outline-terra">Contact Sales</Link>
            </div>
          </div>
          <p className="reveal" style={{ textAlign: 'center', marginTop: 44, fontSize: 14, color: 'var(--slate-l)', fontFamily: 'Jost,sans-serif', letterSpacing: .2 }}>
            All plans include a 14-day free trial · No credit card required · Cancel anytime · Custom currency on request
          </p>
        </div>
      </section>

      {/* ═══ CHAPTER 7: VISION ════════════════════════════════════════ */}
      <section id="vision" className="section" style={{ background: 'var(--slate)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(194,214,216,.035) 1px,transparent 1px)', backgroundSize: '36px 36px', pointerEvents: 'none' }} />

        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 100, alignItems: 'start' }}>
            <div>
              <Ch num="07" text="Our Vision" light />
              <h2 className="dsp reveal" style={{ fontSize: 'clamp(44px,5.5vw,76px)', fontWeight: 600, letterSpacing: '-2px', lineHeight: .98, color: 'var(--cream)', marginBottom: 36 }}>
                Built in Africa.<br /><em style={{ color: 'var(--terra)' }}>Ready for the world.</em>
              </h2>
              <p className="reveal reveal-d1" style={{ fontSize: 17, color: 'rgba(194,214,216,.58)', lineHeight: 1.9, marginBottom: 24 }}>
                Makeja Homes was born in Nairobi, Kenya — but it was never designed to stay there. 
                We are building world-class property management infrastructure that competes 
                with the best platforms globally, at a price point that works for emerging markets.
              </p>
              <p className="reveal reveal-d2" style={{ fontSize: 17, color: 'rgba(194,214,216,.58)', lineHeight: 1.9, marginBottom: 48 }}>
                From a single landlord in Westlands to a property fund in Dubai, from Nairobi 
                to Lagos to London — the vision is a platform that travels as far as ambition takes it.
              </p>
              <Link href="/auth/register" className="btn-primary reveal reveal-d3" style={{ display: 'inline-flex' }}>
                Join the Movement <ArrowRight />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {[
                { icon: '🌍', title: 'Global Reach', body: 'Nairobi-built. London-ready. Dubai-capable. No boundaries.' },
                { icon: '🛡️', title: 'Enterprise Grade', body: 'Bank-level security and uptime SLAs — wherever you operate.' },
                { icon: '⚡', title: 'AI-Powered', body: 'Predictive insights and smart automation — coming Q3 2025.' },
                { icon: '🔲', title: 'White Label', body: 'Your brand. Your domain. Our technology powering it all.' },
              ].map((item, i) => (
                <div key={i} className={`vis-card reveal reveal-d${i + 1}`}>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>{item.icon}</div>
                  <div className="dsp" style={{ fontWeight: 600, fontSize: 20, color: 'var(--cream)', marginBottom: 8 }}>{item.title}</div>
                  <div style={{ fontSize: 14, color: 'rgba(194,214,216,.48)', lineHeight: 1.72 }}>{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="testimonials-grid" style={{ marginTop: 100, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {[
              { q: '"Before Makeja I managed 40 units on WhatsApp and Excel. Now I run 80+ units and spend half the time on admin. There is no comparison."', name: 'James Mwangi', role: 'Property Manager, Westlands' },
              { q: '"The tenant portal changed everything. Tenants pay online, get instant receipts. Payment reconciliation saves me 10+ hours every month."', name: 'Grace Kamau', role: 'Landlord, Karen — 80 units', highlight: true },
              { q: '"The onboarding was shockingly smooth. All 6 properties were set up in under 2 hours. The maintenance tracking module alone is worth the price."', name: 'David Ochieng', role: 'Portfolio Manager — 6 properties' },
            ].map((t, i) => (
              <div key={i} className={`vis-card reveal reveal-d${i + 1}`} style={t.highlight ? { borderColor: 'rgba(226,125,96,.2)' } : {}}>
                <div style={{ color: 'var(--gold)', fontSize: 16, marginBottom: 20 }}>★★★★★</div>
                <p style={{ fontSize: 15, color: 'rgba(194,214,216,.58)', lineHeight: 1.85, marginBottom: 28, fontStyle: 'italic' }}>{t.q}</p>
                <div className="dsp" style={{ fontWeight: 600, fontSize: 17, color: 'var(--cream)' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(194,214,216,.38)', fontFamily: 'Jost,sans-serif', letterSpacing: .3, marginTop: 4 }}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 8: THE DESTINATION — TERRACOTTA FIRE ════════════ */}
      <section id="cta">
        {/* CTA IMAGE SLOT */}
        {/* <img src="/images/cta-bg.jpg" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.14,mixBlendMode:'multiply'}} alt="" /> */}
        <div style={{ position: 'absolute', top: -80, right: -60, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,.14) 0%,transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -40, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(157,74,54,.6) 0%,transparent 65%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

        <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <Ch num="08" text="Your Destination" />
          <h2 className="cta-h reveal">Your journey<br />starts here.</h2>
          <p className="cta-sub reveal reveal-d1">
            Join property managers across the globe who have chosen Makeja Homes for smarter, 
            faster, more profitable portfolio management.
          </p>
          <div className="reveal reveal-d2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            <Link href="/auth/register" className="btn-cta-white">
              Start Free — 14 Days <ArrowRight />
            </Link>
            <Link href="/contact" className="btn-cta-outline">Talk to Sales</Link>
          </div>
          <p className="reveal reveal-d3" style={{ marginTop: 28, fontSize: 14, color: 'rgba(255,255,255,.48)', fontFamily: 'Jost,sans-serif', letterSpacing: .3 }}>
            No credit card · Cancel anytime · Real human support · Built in Nairobi, Kenya 🇰🇪
          </p>

          {/* Final stat strip */}
          <div className="reveal reveal-d4 stat-strip" style={{ marginTop: 80, paddingTop: 56, borderTop: '1px solid rgba(255,255,255,.15)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
            {[
              { v: '171+', l: 'Units Managed' },
              { v: '1.2M+', l: 'Monthly KSH' },
              { v: '79.5%', l: 'Avg Occupancy' },
              { v: '14d', l: 'Free Trial' },
            ].map((s, i) => (
              <div key={i} style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,.15)' : 'none', padding: '8px 0' }}>
                <div className="dsp" style={{ fontSize: 48, fontWeight: 700, color: 'white', lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontFamily: 'Jost,sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.48)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═════════════════════════════════════════════════ */}
      <footer id="footer">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr 1fr', gap: 80, marginBottom: 72 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div className="logo-mark">M</div>
                <span style={{ fontFamily: 'Jost,sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--cream)' }}>Makeja Homes</span>
              </div>
              <p style={{ color: 'rgba(194,214,216,.28)', fontSize: 15, lineHeight: 1.85, maxWidth: 290, marginBottom: 32 }}>
                World-class property management software. Built in Nairobi, Kenya. Ready for the world.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="mailto:makejahomes@gmail.com" style={{ color: 'rgba(194,214,216,.28)', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
                  ✉ makejahomes@gmail.com
                </a>
                <a href="tel:+254796809106" style={{ color: 'rgba(194,214,216,.28)', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
                  📞 +254 796 809 106
                </a>
              </div>
            </div>
            <div>
              <div className="footer-head">Product</div>
              {[['Features', '#features'], ['Pricing', '#pricing'], ['Login', '/auth/login'], ['Start Trial', '/auth/register'], ['Documentation', '/docs']].map(([l, h]) => (
                <Link key={h} href={h} className="fl">{l}</Link>
              ))}
            </div>
            <div>
              <div className="footer-head">Company</div>
              {[['About Us', '#vision'], ['Blog', '/blog'], ['Contact', '#footer'], ['Careers', '/careers']].map(([l, h]) => (
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
          <div style={{ borderTop: '1px solid rgba(194,214,216,.055)', paddingTop: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'rgba(194,214,216,.2)', fontFamily: 'Jost,sans-serif' }}>
              © 2025 Makeja Homes Ltd. Built in Nairobi, Kenya 🇰🇪
            </p>
            <p style={{ fontSize: 13, color: 'rgba(194,214,216,.2)', fontFamily: 'Jost,sans-serif' }}>
              World-class property intelligence — from Africa, for the world.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
