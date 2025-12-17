import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import { 
  Building2, 
  Users, 
  FileText, 
  TrendingUp, 
  Shield, 
  Zap,
  CheckCircle2,
  PlayCircle
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <LandingNav />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Property Management,<br />Perfected
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto">
              Transform your rental business with Makeja Homes. Manage properties, tenants, and payments all in one powerful platform built for Kenya.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition"
              >
                Start Free Trial
              </Link>
              <Link
                href="#how-it-works"
                className="border border-purple-500 text-purple-400 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-500/10 transition"
              >
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-black to-purple-950/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-purple-400 mb-2">171+</div>
              <div className="text-gray-400">Units Managed</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-pink-400 mb-2">KSH 1.2M+</div>
              <div className="text-gray-400">Monthly Revenue</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-purple-400 mb-2">79.5%</div>
              <div className="text-gray-400">Occupancy Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Scale Your Business
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              Powerful features designed specifically for Kenyan property managers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Building2 className="w-8 h-8" />}
              title="Multi-Property Management"
              description="Manage unlimited properties and units from a single dashboard. Track occupancy, maintenance, and finances effortlessly."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Tenant Management"
              description="Complete tenant lifecycle management. From applications to move-out, handle everything in one place."
            />
            <FeatureCard
              icon={<FileText className="w-8 h-8" />}
              title="Automated Leases"
              description="Generate professional lease agreements instantly. Digital signatures and automatic renewals included."
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Financial Tracking"
              description="Real-time revenue tracking, expense management, and financial reports. Know your numbers instantly."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="M-Pesa Integration"
              description="Accept rent payments via M-Pesa. Automatic reconciliation and instant notifications."
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Maintenance Workflow"
              description="Track maintenance requests from submission to completion. Keep tenants happy and properties maintained."
            />
          </div>
        </div>
      </section>

      {/* How It Works / Demo Videos Section */}
      <section id="how-it-works" className="py-20 px-4 bg-gradient-to-b from-purple-950/20 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              See Makeja Homes{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                In Action
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              Watch how easy it is to manage your properties
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DemoCard
              title="Dashboard Overview"
              description="Get a complete view of your properties, tenants, and financials"
              comingSoon
            />
            <DemoCard
              title="Adding New Tenants"
              description="Learn how to onboard tenants and create lease agreements"
              comingSoon
            />
            <DemoCard
              title="Payment Processing"
              description="See how M-Pesa payments are automatically tracked"
              comingSoon
            />
            <DemoCard
              title="Maintenance Management"
              description="Handle maintenance requests from start to finish"
              comingSoon
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Property Management?
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Start your 14-day free trial. No credit card required.
          </p>
          <Link
            href="/auth/register"
            className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-10 py-4 rounded-lg text-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4">Makeja Homes</h3>
              <p className="text-gray-400 text-sm">
                Property Management, Perfected
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="#features" className="hover:text-purple-400">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-purple-400">How It Works</Link></li>
                <li><Link href="/auth/register" className="hover:text-purple-400">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/contact" className="hover:text-purple-400">Contact</Link></li>
                <li><Link href="#" className="hover:text-purple-400">About</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="#" className="hover:text-purple-400">Privacy</Link></li>
                <li><Link href="#" className="hover:text-purple-400">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-purple-500/20 text-center text-gray-400 text-sm">
            © 2024 Makeja Homes. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-black hover:border-purple-500/40 transition group">
      <div className="text-purple-400 mb-4 group-hover:scale-110 transition">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function DemoCard({ title, description, comingSoon }: { title: string; description: string; comingSoon?: boolean }) {
  return (
    <div className="relative p-8 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-black hover:border-purple-500/40 transition group cursor-pointer">
      <div className="flex items-center justify-center h-48 bg-black/50 rounded-lg mb-4 relative overflow-hidden">
        <PlayCircle className="w-16 h-16 text-purple-400 group-hover:scale-110 transition" />
        {comingSoon && (
          <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
            Coming Soon
          </div>
        )}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}