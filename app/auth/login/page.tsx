"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

type UserType = "staff" | "tenant";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("session") === "expired";
  const resetSuccess = searchParams.get("reset") === "success";
  
  const [userType, setUserType] = useState<UserType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionExpired) {
      setError("Your session has expired. Please login again.");
    }
  }, [sessionExpired]);

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        userType,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    // ✅ Check if user must change password
    if (data.user.mustChangePassword) {
      console.log("User must change password - redirecting...");
      router.push("/auth/change-password?firstLogin=true");
      return;
    }

    // Redirect based on role
    if (data.user.role === "TENANT") {
      router.push("/dashboard/tenant");
    } else {
      router.push("/dashboard/admin");
    }
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  // User type selection screen
  if (!userType) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <div className="text-center mb-12">
            <Link href="/" className="inline-flex items-center space-x-2 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">M</span>
              </div>
              <span className="text-white font-bold text-2xl">Makeja Homes</span>
            </Link>
            <p className="text-gray-400 text-lg">Property Management, Perfected</p>
          </div>

          {/* Password Reset Success Alert */}
          {resetSuccess && (
            <div className="mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3 max-w-md mx-auto">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 text-sm font-semibold mb-1">Password Reset Successful!</p>
                <p className="text-green-300 text-xs">
                  You can now login with your new password.
                </p>
              </div>
            </div>
          )}

          {/* Session Expired Alert */}
          {sessionExpired && (
            <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3 max-w-md mx-auto">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 text-sm font-semibold mb-1">Session Expired</p>
                <p className="text-yellow-300 text-xs">
                  Your session has expired. Please login again.
                </p>
              </div>
            </div>
          )}

          {/* User Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Staff Login */}
            <button
              onClick={() => setUserType("staff")}
              className="group relative bg-gradient-to-br from-purple-950/20 to-black border-2 border-purple-500/30 hover:border-purple-500 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">👔</span>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3">Staff Login</h2>
              <p className="text-gray-400 text-sm mb-4">
                For administrators, managers, and staff
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">Admin</span>
                <span className="px-3 py-1 bg-pink-500/20 text-pink-300 text-xs rounded-full">Manager</span>
              </div>
            </button>

            {/* Tenant Login */}
            <button
              onClick={() => setUserType("tenant")}
              className="group relative bg-gradient-to-br from-purple-950/20 to-black border-2 border-purple-500/30 hover:border-purple-500 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏠</span>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3">Tenant Login</h2>
              <p className="text-gray-400 text-sm mb-4">
                Access your rental portal and payments
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">View Lease</span>
                <span className="px-3 py-1 bg-pink-500/20 text-pink-300 text-xs rounded-full">Pay Rent</span>
              </div>
            </button>
          </div>

          {/* Create Account */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-4">New property management company?</p>
            <Link
              href="/auth/register"
              className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => setUserType(null)}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Back to selection
        </button>

        {/* Login Card */}
        <div className="bg-gradient-to-br from-purple-950/20 to-black p-8 rounded-lg border border-purple-500/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">{userType === "staff" ? "👔" : "🏠"}</span>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              {userType === "staff" ? "Staff Login" : "Tenant Login"}
            </h2>
            <p className="text-gray-400 text-sm">
              Enter your credentials to continue
            </p>
          </div>

          {/* Password Reset Success Alert */}
          {resetSuccess && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 text-sm font-semibold">Password Reset Successful!</p>
                <p className="text-green-300 text-xs">You can now login with your new password.</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 rounded-lg bg-black border border-purple-500/30 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-lg bg-black border border-purple-500/30 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition pr-12"
                  required
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
              <Link 
                href="/auth/forgot-password" 
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-purple-500/20 text-center text-xs text-gray-500">
            {userType === "staff" ? (
              <p>Staff accounts are created by your administrator.</p>
            ) : (
              <p>Tenant accounts are created by property management.</p>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>© 2024 Makeja Homes</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}