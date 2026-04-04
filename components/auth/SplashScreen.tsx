"use client"

import { useEffect, useState } from "react"

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"logo" | "tagline" | "out">("logo")

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("tagline"), 800)
    const t2 = setTimeout(() => setPhase("out"), 2000)
    const t3 = setTimeout(onComplete, 2600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-500 ${
        phase === "out" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Animated grid background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(168,85,247,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.8) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl animate-pulse [animation-delay:0.5s]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo mark */}
        <div
          className={`transition-all duration-700 ${
            phase === "logo" ? "scale-75 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/40">
              <span className="text-white font-black text-4xl">M</span>
            </div>
            {/* Ping ring */}
            <div className="absolute inset-0 rounded-2xl bg-purple-500/30 animate-ping [animation-duration:2s]" />
          </div>
        </div>

        {/* Brand name */}
        <div
          className={`transition-all duration-700 delay-100 ${
            phase === "logo" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          }`}
        >
          <h1 className="text-4xl font-black text-white tracking-tight">
            Makeja{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Homes
            </span>
          </h1>
        </div>

        {/* Tagline */}
        <div
          className={`transition-all duration-700 delay-200 ${
            phase === "tagline" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <p className="text-gray-400 text-sm tracking-widest uppercase">
            Property Management, Perfected
          </p>
        </div>

        {/* Loading bar */}
        <div
          className={`transition-all duration-700 delay-300 w-48 ${
            phase === "tagline" ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              style={{
                width: phase === "tagline" ? "100%" : "0%",
                transition: "width 1s ease-in-out",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
