"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SubscriptionExpiredPage() {
  const router = useRouter()
  const [status, setStatus] = useState<{
    companyName?: string
    subscriptionStatus?: string
    trialEndsAt?: string
    subscriptionEndsAt?: string
    plan?: string
  } | null>(null)

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.active) {
          // Subscription is now active — redirect back
          router.replace("/dashboard/admin")
        } else {
          setStatus(data)
        }
      })
      .catch(() => setStatus({}))
  }, [router])

  const isTrialExpired =
    status?.subscriptionStatus === "TRIAL" ||
    status?.subscriptionStatus === "TRIAL_EXPIRED"
  const isSuspended = status?.subscriptionStatus === "SUSPENDED"

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl px-5 py-3">
            <span className="text-white text-xl font-bold">Makeja Homes</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">
            {isSuspended ? "🚫" : "⏰"}
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {isSuspended
              ? "Account Suspended"
              : isTrialExpired
              ? "Your Free Trial Has Ended"
              : "Subscription Expired"}
          </h1>

          {status?.companyName && (
            <p className="text-gray-400 mb-4">
              <span className="text-purple-400 font-medium">{status.companyName}</span>
            </p>
          )}

          <p className="text-gray-400 mb-8">
            {isSuspended
              ? "Your account has been suspended. Please contact support to resolve this."
              : isTrialExpired
              ? "Your 14-day free trial has expired. Upgrade to a paid plan to continue managing your properties."
              : "Your subscription has lapsed. Renew to regain access to your dashboard."}
          </p>

          {/* Plans */}
          {!isSuspended && (
            <div className="grid grid-cols-1 gap-3 mb-8">
              {[
                { name: "Starter", units: 20, price: "3,999", color: "border-blue-500/30 hover:border-blue-500/60" },
                { name: "Growth", units: 100, price: "9,999", color: "border-purple-500/30 hover:border-purple-500/60", popular: true },
                { name: "Pro", units: 500, price: "24,999", color: "border-pink-500/30 hover:border-pink-500/60" },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`border ${plan.color} rounded-xl p-4 text-left transition-colors relative bg-gray-800/40`}
                >
                  {plan.popular && (
                    <span className="absolute top-3 right-3 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{plan.name}</p>
                      <p className="text-gray-400 text-sm">Up to {plan.units} units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">KSH {plan.price}</p>
                      <p className="text-gray-500 text-xs">/month</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA buttons */}
          <div className="space-y-3">
            <a
              href="mailto:support@makejahomes.co.ke?subject=Subscription%20Renewal"
              className="block w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl py-3 font-semibold hover:opacity-90 transition-opacity"
            >
              {isSuspended ? "Contact Support" : "Upgrade Now"}
            </a>
            <Link
              href="/auth/login"
              className="block w-full border border-gray-700 text-gray-400 rounded-xl py-3 text-sm hover:border-gray-600 transition-colors"
            >
              Sign in with a different account
            </Link>
          </div>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          Questions?{" "}
          <a href="mailto:support@makejahomes.co.ke" className="text-purple-400 hover:text-purple-300">
            support@makejahomes.co.ke
          </a>
        </p>
      </div>
    </div>
  )
}
