"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, CheckCircle, Building2, ChevronRight } from "lucide-react";
import SplashScreen from "@/components/auth/SplashScreen";

type UserType = "staff" | "tenant";

interface Instance {
  tenantSlug: string;
  companyName: string;
  role: string;
  userId: string;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
}

const roleLabel: Record<string, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  CARETAKER: "Caretaker",
  STOREKEEPER: "Storekeeper",
  TECHNICAL: "Technical",
  TENANT: "Tenant",
};

const roleRoutes: Record<string, string> = {
  TENANT: "/dashboard/tenant",
  ADMIN: "/dashboard/admin",
  MANAGER: "/dashboard/manager",
  CARETAKER: "/dashboard/caretaker",
  STOREKEEPER: "/dashboard/storekeeper",
  TECHNICAL: "/dashboard/technical",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("session") === "expired";
  const resetSuccess = searchParams.get("reset") === "success";

  const [splashDone, setSplashDone] = useState(false);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Multi-instance selection
  const [instances, setInstances] = useState<Instance[] | null>(null);
  const [selectingInstance, setSelectingInstance] = useState(false);

  useEffect(() => {
    if (sessionExpired) setError("Your session has expired. Please login again.");
  }, [sessionExpired]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Step 1: find all instances this email/password belongs to
      const res = await fetch("/api/auth/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      if (data.instances.length === 1) {
        // Only one instance — go straight in
        await loginToInstance(data.instances[0]);
      } else {
        // Multiple — let user pick
        setInstances(data.instances);
        setSelectingInstance(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginToInstance = async (instance: Instance) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          tenantSlug: instance.tenantSlug,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      if (data.mustChangePassword) {
        router.push("/auth/change-password?firstLogin=true");
        return;
      }
      if (data.user) {
        router.push(roleRoutes[data.user.role] ?? "/dashboard/admin");
      }
    } catch (err: any) {
      setError(err.message);
      setSelectingInstance(false);
      setInstances(null);
    } finally {
      setLoading(false);
    }
  };

  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  // ── Instance selection screen ──────────────────────────────
  if (selectingInstance && instances) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Select Account</h2>
            <p className="text-gray-400 text-sm">
              Your email is linked to {instances.length} companies. Choose which to access.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {instances.map((inst) => (
              <button
                key={inst.tenantSlug}
                onClick={() => loginToInstance(inst)}
                disabled={loading}
                className="w-full bg-gradient-to-br from-purple-950/20 to-black border border-purple-500/20 hover:border-purple-500/60 rounded-xl p-4 text-left transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10 disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{inst.companyName}</p>
                    <p className="text-sm text-purple-400 mt-0.5">{roleLabel[inst.role] ?? inst.role}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => { setSelectingInstance(false); setInstances(null); setError(""); }}
            className="mt-6 w-full text-gray-500 hover:text-gray-300 text-sm transition"
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  // ── User type selection ────────────────────────────────────
  if (!userType) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-12">
            <Link href="/" className="inline-flex items-center space-x-2 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">M</span>
              </div>
              <span className="text-white font-bold text-2xl">Makeja Homes</span>
            </Link>
            <p className="text-gray-400 text-lg">Property Management, Perfected</p>
          </div>

          {resetSuccess && (
            <div className="mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3 max-w-md mx-auto">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 text-sm font-semibold mb-1">Password Reset Successful!</p>
                <p className="text-green-300 text-xs">You can now login with your new password.</p>
              </div>
            </div>
          )}

          {sessionExpired && (
            <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3 max-w-md mx-auto">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 text-sm font-semibold mb-1">Session Expired</p>
                <p className="text-yellow-300 text-xs">Your session has expired. Please login again.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setUserType("staff")}
              className="group relative bg-gradient-to-br from-purple-950/20 to-black border-2 border-purple-500/30 hover:border-purple-500 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">👔</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Staff Login</h2>
              <p className="text-gray-400 text-sm mb-4">For administrators, managers, and staff</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">Admin</span>
                <span className="px-3 py-1 bg-pink-500/20 text-pink-300 text-xs rounded-full">Manager</span>
              </div>
            </button>

            <button
              onClick={() => setUserType("tenant")}
              className="group relative bg-gradient-to-br from-purple-950/20 to-black border-2 border-purple-500/30 hover:border-purple-500 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏠</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Tenant Login</h2>
              <p className="text-gray-400 text-sm mb-4">Access your rental portal and payments</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">View Lease</span>
                <span className="px-3 py-1 bg-pink-500/20 text-pink-300 text-xs rounded-full">Pay Rent</span>
              </div>
            </button>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-4">New property management company?</p>
            <Link
              href="/onboarding"
              className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Credentials form ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button onClick={() => setUserType(null)} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 text-sm transition">
          ← Back to selection
        </button>

        <div className="bg-gradient-to-br from-purple-950/20 to-black p-8 rounded-2xl border border-purple-500/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">{userType === "staff" ? "👔" : "🏠"}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {userType === "staff" ? "Staff Login" : "Tenant Login"}
            </h2>
            <p className="text-gray-400 text-sm">Enter your credentials to continue</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 rounded-xl bg-black border border-purple-500/30 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-xl bg-black border border-purple-500/30 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 transition">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-purple-500/10 text-center text-xs text-gray-500">
            {userType === "staff"
              ? "Staff accounts are created by your administrator."
              : "Tenant accounts are created by property management."}
          </div>
        </div>

        <p className="mt-6 text-center text-gray-600 text-xs">© {new Date().getFullYear()} Makeja Homes</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
