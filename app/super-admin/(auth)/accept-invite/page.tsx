"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ email: string; firstName: string; role: string } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError("No invitation token found in the link.");
      setChecking(false);
      return;
    }
    fetch(`/api/super-admin/accept-invite?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setTokenValid(true);
          setInviteInfo({ email: data.email, firstName: data.firstName, role: data.role });
        } else {
          setTokenError(data.error ?? "Invalid or expired invitation link.");
        }
      })
      .catch(() => setTokenError("Could not verify invitation."))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.replace("/super-admin"), 2000);
      } else {
        setError(data.error ?? "Failed to set password.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-violet-500/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Accept Invitation
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Makeja Homes Platform Control</p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {checking && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              <p className="text-gray-400 text-sm">Verifying invitation...</p>
            </div>
          )}

          {!checking && tokenError && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <XCircle className="w-12 h-12 text-red-400" />
              <p className="text-red-300 font-semibold">Invalid Invitation</p>
              <p className="text-gray-400 text-sm">{tokenError}</p>
              <button onClick={() => router.replace("/super-admin/login")}
                className="mt-2 text-violet-400 hover:text-violet-300 text-sm underline transition">
                Back to login
              </button>
            </div>
          )}

          {!checking && tokenValid && success && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400" />
              <p className="text-green-300 font-semibold">Password set successfully!</p>
              <p className="text-gray-400 text-sm">Redirecting to dashboard...</p>
            </div>
          )}

          {!checking && tokenValid && !success && inviteInfo && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-gray-800/60 rounded-xl p-4 mb-2">
                <p className="text-gray-400 text-xs mb-1">Signing in as</p>
                <p className="text-white font-medium">{inviteInfo.firstName}</p>
                <p className="text-gray-400 text-sm">{inviteInfo.email}</p>
                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                  inviteInfo.role === 'OWNER'
                    ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                    : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                }`}>
                  {inviteInfo.role === 'OWNER' ? 'Full Admin' : 'Viewer'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 pr-11 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200" tabIndex={-1}>
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button type="submit" disabled={submitting || !password || !confirmPassword}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />Setting password...</> : "Set Password & Sign In"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    }>
      <AcceptInviteForm />
    </Suspense>
  );
}
