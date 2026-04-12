"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail, Lock, Shield, ChevronRight } from "lucide-react";

// Animated background particles
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-0"
          style={{
            width: `${Math.random() * 4 + 1}px`,
            height: `${Math.random() * 4 + 1}px`,
            background: i % 3 === 0 ? "#7c3aed" : i % 3 === 1 ? "#4f46e5" : "#06b6d4",
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float-particle ${Math.random() * 8 + 6}s ease-in-out ${Math.random() * 5}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// Animated grid lines
function GridLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
      <div className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to right, #7c3aed 1px, transparent 1px), linear-gradient(to bottom, #7c3aed 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

// Glowing orbs
function Orbs() {
  return (
    <>
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.12] blur-[120px]"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)", animation: "pulse-orb 8s ease-in-out infinite" }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.10] blur-[100px]"
        style={{ background: "radial-gradient(circle, #4338ca, transparent 70%)", animation: "pulse-orb 10s ease-in-out 2s infinite" }} />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-[0.07] blur-[80px]"
        style={{ background: "radial-gradient(circle, #06b6d4, transparent 70%)", animation: "pulse-orb 12s ease-in-out 4s infinite" }} />
    </>
  );
}

export default function SuperAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Trigger mount animation
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.replace("/super-admin"), 800);
      } else {
        setError(data.error || "Invalid email or password");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes float-particle {
          0%, 100% { opacity: 0; transform: translateY(0px) scale(1); }
          20% { opacity: 0.6; }
          50% { opacity: 0.3; transform: translateY(-60px) scale(1.2); }
          80% { opacity: 0.6; }
        }
        @keyframes pulse-orb {
          0%, 100% { transform: scale(1) translate(0, 0); }
          33% { transform: scale(1.05) translate(20px, -15px); }
          66% { transform: scale(0.95) translate(-15px, 10px); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes logo-appear {
          0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          60% { transform: scale(1.08) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes scan-line {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(400%); opacity: 0; }
        }
        @keyframes border-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
          50% { box-shadow: 0 0 0 1px rgba(124,58,237,0.3), 0 0 20px 0 rgba(124,58,237,0.1); }
        }
        .card-animate { animation: slide-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        .logo-animate { animation: logo-appear 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
        .title-animate { animation: slide-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .field-animate-1 { animation: slide-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
        .field-animate-2 { animation: slide-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.28s both; }
        .btn-animate { animation: slide-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.36s both; }
        .scan-line { animation: scan-line 3s linear 0.5s forwards; }
        .card-glow { animation: border-glow 4s ease-in-out 1s infinite; }
      `}</style>

      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative">
        <GridLines />
        <Orbs />
        <Particles />

        <div className={`w-full max-w-md relative z-10 transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>

          {/* Logo + title */}
          <div className="text-center mb-8">
            <div className="logo-animate inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)", boxShadow: "0 0 40px rgba(124,58,237,0.4), 0 0 80px rgba(124,58,237,0.15)" }}>
              <Shield className="w-10 h-10 text-white relative z-10" />
              {/* Scan line effect on logo */}
              <div className="scan-line absolute inset-x-0 h-8 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.15), transparent)" }} />
            </div>

            <div className="title-animate">
              <h1 className="text-4xl font-black tracking-tight mb-1"
                style={{ background: "linear-gradient(to right, #a78bfa, #818cf8, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Super Admin
              </h1>
              <p className="text-gray-500 text-sm font-medium tracking-widest uppercase">
                Makeja Homes · Platform Control
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="card-animate card-glow bg-gray-900/70 backdrop-blur-xl border border-gray-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            {/* Subtle inner gradient */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{ background: "radial-gradient(ellipse at top, rgba(124,58,237,0.06) 0%, transparent 60%)" }} />

            {success ? (
              <div className="flex flex-col items-center gap-4 py-6 relative z-10">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #4338ca)", boxShadow: "0 0 30px rgba(124,58,237,0.5)" }}>
                  <ChevronRight className="w-7 h-7 text-white" />
                </div>
                <p className="text-white font-semibold text-lg">Access granted</p>
                <p className="text-gray-400 text-sm">Redirecting to dashboard...</p>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500"
                      style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div className="field-animate-1">
                  <label className="block text-xs font-semibold text-gray-400 mb-2 tracking-wider uppercase">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-violet-400 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@makejahomes.co.ke"
                      required
                      autoComplete="email"
                      className="w-full bg-gray-800/50 border border-gray-700/80 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/70 focus:bg-gray-800/80 focus:ring-2 focus:ring-violet-500/20 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="field-animate-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-2 tracking-wider uppercase">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-violet-400 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full bg-gray-800/50 border border-gray-700/80 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/70 focus:bg-gray-800/80 focus:ring-2 focus:ring-violet-500/20 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="btn-animate pt-1">
                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full relative overflow-hidden text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm group"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4338ca)", boxShadow: "0 4px 24px rgba(124,58,237,0.35)" }}
                  >
                    {/* Button hover shimmer */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "linear-gradient(135deg, #8b5cf6, #4f46e5)" }} />
                    <span className="relative z-10 flex items-center gap-2">
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Authenticating...</>
                      ) : (
                        <><Shield className="w-4 h-4" />Sign In to Dashboard</>
                      )}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-gray-700 text-xs mt-6 tracking-wide">
            MAKEJA HOMES PLATFORM · RESTRICTED ACCESS
          </p>
        </div>
      </div>
    </>
  );
}
