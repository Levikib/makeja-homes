"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setSuccess(true);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="fixed inset-0 cyber-grid opacity-20" />
        
        <div className="glass-card p-8 w-full max-w-md relative z-10 text-center">
          <div className="inline-block p-4 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/20 mb-4">
            <CheckCircle className="h-12 w-12 text-green-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-4">Check Your Email</h1>
          
          <p className="text-gray-400 mb-6">
            We've sent password reset instructions to <span className="text-white font-medium">{email}</span>
          </p>
          
          <p className="text-sm text-gray-500 mb-8">
            Didn't receive the email? Check your spam folder or contact your administrator.
          </p>
          
          <Link href="/auth/login">
            <button className="w-full py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all font-medium text-white shadow-lg">
              Back to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="fixed inset-0 cyber-grid opacity-20" />
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-purple-500 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      <div className="glass-card p-8 w-full max-w-md relative z-10">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 mb-4">
            <Mail className="h-12 w-12 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Forgot Password?</h1>
          <p className="text-gray-400">
            Enter your email and we'll send you reset instructions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-500/50 transition-colors text-white"
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-white shadow-lg"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}
