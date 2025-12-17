"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Users, AlertCircle, Eye, EyeOff, Clock } from "lucide-react";

type UserType = "staff" | "tenant";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("session") === "expired";
  
  const [userType, setUserType] = useState<UserType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Show session expired message
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

      // Check if first-time login (needs password change)
      if (data.firstLogin) {
        router.push(`/auth/change-password?userId=${data.userId}`);
        return;
      }

      // Redirect based on role
      if (data.role === "TENANT") {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Logo/Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
              MAKEJA HOMES
            </h1>
            <p className="text-gray-400 text-lg">Property Management, Perfected</p>
          </div>

          {/* Session Expired Alert */}
          {sessionExpired && (
            <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3 max-w-md mx-auto">
              <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 text-sm font-semibold mb-1">Session Expired</p>
                <p className="text-yellow-300 text-xs">
                  Your session has expired after 15 minutes of inactivity. Please login again.
                </p>
              </div>
            </div>
          )}

          {/* User Type Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Staff Login Card */}
            <button
              onClick={() => setUserType("staff")}
              className="group relative bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-2 border-blue-500/30 hover:border-blue-500 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-600/0 group-hover:from-blue-500/5 group-hover:to-purple-600/5 rounded-2xl transition-all duration-300" />
              
              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-3">Staff Login</h2>
                <p className="text-gray-400 text-sm mb-4">
                  For administrators, managers, caretakers, and staff members
                </p>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">Admin</span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">Manager</span>
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-300 text-xs rounded-full">Caretaker</span>
                </div>
              </div>
            </button>

            {/* Tenant Login Card */}
            <button
              onClick={() => setUserType("tenant")}
              className="group relative bg-gradient-to-br from-green-500/10 to-cyan-600/10 border-2 border-green-500/30 hover:border-green-500 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-cyan-600/0 group-hover:from-green-500/5 group-hover:to-cyan-600/5 rounded-2xl transition-all duration-300" />
              
              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-cyan-600 rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-3">Tenant Login</h2>
                <p className="text-gray-400 text-sm mb-4">
                  For tenants to access their rental portal and make payments
                </p>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">View Lease</span>
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded-full">Pay Rent</span>
                  <span className="px-3 py-1 bg-teal-500/20 text-teal-300 text-xs rounded-full">Maintenance</span>
                </div>
              </div>
            </button>
          </div>

          {/* Create Account Link */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-4">New property management company?</p>
            <Link href="/auth/register">
              <Button className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white px-8">
                Create Account
              </Button>
            </Link>
            <p className="text-gray-500 text-xs mt-2">
              Sign up to start managing your properties
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Login form screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => setUserType(null)}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Back to selection
        </button>

        {/* Login Card */}
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              userType === "staff" 
                ? "bg-gradient-to-br from-blue-500 to-purple-600" 
                : "bg-gradient-to-br from-green-500 to-cyan-600"
            }`}>
              {userType === "staff" ? (
                <Building2 className="w-8 h-8 text-white" />
              ) : (
                <Users className="w-8 h-8 text-white" />
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              {userType === "staff" ? "Staff Login" : "Tenant Login"}
            </h2>
            <p className="text-gray-400 text-sm">
              {userType === "staff" 
                ? "Enter your credentials to access the system" 
                : "Access your tenant portal"}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              sessionExpired 
                ? "bg-yellow-500/10 border border-yellow-500/30" 
                : "bg-red-500/10 border border-red-500/30"
            }`}>
              {sessionExpired ? (
                <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p className={sessionExpired ? "text-yellow-400 text-sm" : "text-red-400 text-sm"}>
                {error}
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="bg-gray-900 border-gray-700 text-white placeholder-gray-500 pr-12"
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

            {/* Forgot Password */}
            <div className="text-right">
              <Link 
                href="/auth/forgot-password" 
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className={`w-full py-6 text-lg font-semibold ${
                userType === "staff"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  : "bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700"
              }`}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 pt-6 border-t border-gray-700 text-center text-xs text-gray-500">
            {userType === "staff" ? (
              <p>
                Staff accounts are created by your organization administrator.
                <br />
                Contact your admin if you need access.
              </p>
            ) : (
              <p>
                Tenant accounts are created by property management.
                <br />
                Check your email for login credentials.
              </p>
            )}
          </div>
        </div>

        {/* Makeja Homes Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>© 2024 Makeja Homes. Property Management, Perfected.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
