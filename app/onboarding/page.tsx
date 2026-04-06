'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Globe,
  CreditCard,
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronRight,
  Check,
  Loader2,
  ArrowRight,
  Zap,
  TrendingUp,
  Shield,
  Crown,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────
// Types & constants
// ──────────────────────────────────────────────────────────

type Plan = 'starter' | 'growth' | 'pro' | 'enterprise'

interface FormData {
  companyName: string
  adminName: string
  email: string
  phone: string
  city: string
  subdomain: string
  plan: Plan | ''
  password: string
  confirmPassword: string
}

const STEPS = [
  { id: 1, label: 'Company Info', icon: Building2 },
  { id: 2, label: 'Account ID', icon: Globe },
  { id: 3, label: 'Choose Plan', icon: CreditCard },
  { id: 4, label: 'Password', icon: Lock },
  { id: 5, label: 'Done', icon: CheckCircle },
]

const PLANS = [
  {
    id: 'starter' as Plan,
    name: 'Starter',
    price: 'KSH 3,999',
    period: '/mo',
    units: 'Up to 20 units',
    tagline: 'Perfect for solo landlords',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/40',
    glowColor: 'shadow-blue-500/20',
    features: ['Up to 20 rental units', 'Tenant portal', 'Rent collection', 'Maintenance requests', '14-day free trial'],
  },
  {
    id: 'growth' as Plan,
    name: 'Growth',
    price: 'KSH 9,999',
    period: '/mo',
    units: 'Up to 100 units',
    tagline: 'Great for small agencies',
    icon: TrendingUp,
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/40',
    glowColor: 'shadow-purple-500/20',
    popular: true,
    features: ['Up to 100 rental units', 'Everything in Starter', 'Multiple properties', 'Staff accounts', 'Advanced reports', '14-day free trial'],
  },
  {
    id: 'pro' as Plan,
    name: 'Pro',
    price: 'KSH 24,999',
    period: '/mo',
    units: 'Up to 500 units',
    tagline: 'For growing property managers',
    icon: Shield,
    color: 'from-orange-500 to-red-500',
    borderColor: 'border-orange-500/40',
    glowColor: 'shadow-orange-500/20',
    features: ['Up to 500 rental units', 'Everything in Growth', 'Inventory system', 'Purchase orders', 'Paystack integration', '14-day free trial'],
  },
  {
    id: 'enterprise' as Plan,
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    units: 'Unlimited units',
    tagline: 'Large portfolios & institutions',
    icon: Crown,
    color: 'from-yellow-500 to-amber-500',
    borderColor: 'border-yellow-500/40',
    glowColor: 'shadow-yellow-500/20',
    features: ['Unlimited units', 'Everything in Pro', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee', 'Priority support'],
  },
]

// ──────────────────────────────────────────────────────────
// Password strength helpers
// ──────────────────────────────────────────────────────────

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score === 2) return { score, label: 'Fair', color: 'bg-yellow-500' }
  if (score === 3) return { score, label: 'Good', color: 'bg-blue-500' }
  return { score, label: 'Strong', color: 'bg-green-500' }
}

// ──────────────────────────────────────────────────────────
// Shared input classes
// ──────────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition'

// ──────────────────────────────────────────────────────────
// Step components
// ──────────────────────────────────────────────────────────

function StepCompanyInfo({
  data,
  onChange,
  onNext,
}: {
  data: FormData
  onChange: (field: keyof FormData, value: string) => void
  onNext: () => void
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!data.companyName.trim()) e.companyName = 'Company name is required.'
    if (!data.adminName.trim()) e.adminName = 'Your name is required.'
    if (!data.email.trim()) {
      e.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      e.email = 'Enter a valid email address.'
    }
    if (!data.phone.trim()) e.phone = 'Phone number is required.'
    if (!data.city.trim()) e.city = 'City is required.'
    return e
  }

  const handleNext = () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Company / Property Business Name <span className="text-purple-400">*</span>
        </label>
        <input
          type="text"
          value={data.companyName}
          onChange={(e) => onChange('companyName', e.target.value)}
          placeholder="e.g. Mizpha Properties Ltd"
          className={inputCls}
        />
        {errors.companyName && <p className="mt-1.5 text-sm text-red-400">{errors.companyName}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Your Full Name <span className="text-purple-400">*</span>
        </label>
        <input
          type="text"
          value={data.adminName}
          onChange={(e) => onChange('adminName', e.target.value)}
          placeholder="e.g. Jane Mwangi"
          className={inputCls}
        />
        {errors.adminName && <p className="mt-1.5 text-sm text-red-400">{errors.adminName}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Address <span className="text-purple-400">*</span>
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="jane@yourcompany.co.ke"
            className={inputCls}
          />
          {errors.email && <p className="mt-1.5 text-sm text-red-400">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Phone Number <span className="text-purple-400">*</span>
          </label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="+254 700 000 000"
            className={inputCls}
          />
          {errors.phone && <p className="mt-1.5 text-sm text-red-400">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          City / Town <span className="text-purple-400">*</span>
        </label>
        <input
          type="text"
          value={data.city}
          onChange={(e) => onChange('city', e.target.value)}
          placeholder="e.g. Nairobi"
          className={inputCls}
        />
        {errors.city && <p className="mt-1.5 text-sm text-red-400">{errors.city}</p>}
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="w-full mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition flex items-center justify-center gap-2"
      >
        Continue <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

function StepSubdomain({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: FormData
  onChange: (field: keyof FormData, value: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const [checking, setChecking] = useState(false)
  const [availability, setAvailability] = useState<{ available: boolean; message: string } | null>(null)
  const [error, setError] = useState('')

  const slug = data.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')

  const checkAvailability = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setAvailability(null)
      return
    }
    setChecking(true)
    try {
      const res = await fetch(`/api/onboarding/check-subdomain?slug=${encodeURIComponent(value)}`)
      const result = await res.json()
      // Normalize the message — no subdomain URLs shown
      if (result.available) {
        result.message = `"${value}" is available!`
      }
      setAvailability(result)
    } catch {
      setAvailability(null)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    setAvailability(null)
    const timer = setTimeout(() => {
      if (slug.length >= 3) checkAvailability(slug)
    }, 600)
    return () => clearTimeout(timer)
  }, [slug, checkAvailability])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30)
    onChange('subdomain', clean)
    setError('')
  }

  const handleNext = () => {
    if (!slug) { setError('Please enter an account ID.'); return }
    if (slug.length < 3) { setError('Account ID must be at least 3 characters.'); return }
    if (!availability?.available) { setError('Please choose an available account ID.'); return }
    onNext()
  }

  const isValid = slug.length >= 3 && slug.length <= 30

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Choose Your Account ID <span className="text-purple-400">*</span>
        </label>
        <p className="text-sm text-gray-500 mb-4">
          This is a unique identifier for your company on Makeja Homes. It's used internally to keep your data separate from other businesses.
        </p>

        <div className="relative">
          <input
            type="text"
            value={data.subdomain}
            onChange={handleInput}
            placeholder="yourcompany"
            maxLength={30}
            className={`${inputCls} pr-10`}
            autoFocus
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {checking && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
            {!checking && availability?.available && <Check className="w-5 h-5 text-green-400" />}
            {!checking && availability && !availability.available && (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
        </div>

        {/* Format hint */}
        <p className="mt-1.5 text-xs text-gray-600">
          Lowercase letters, numbers and hyphens only. 3–30 characters.
        </p>

        {/* Availability feedback */}
        {availability && !checking && (
          <p className={`mt-2 text-sm font-medium ${availability.available ? 'text-green-400' : 'text-red-400'}`}>
            {availability.message}
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* Account ID preview */}
      {slug && (
        <div className="rounded-xl bg-gray-800/60 border border-white/10 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Your Account ID</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-700/80 rounded-lg px-4 py-3">
              <span className="text-purple-300 font-semibold text-base">{slug}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Your team logs in at <span className="text-purple-400">makejahomes.co.ke</span> using their email and password.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 px-6 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-semibold transition"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isValid || checking}
          className="flex-[2] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

function StepChoosePlan({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: FormData
  onChange: (field: keyof FormData, value: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const [error, setError] = useState('')

  const handleSelect = (planId: Plan) => {
    onChange('plan', planId)
    setError('')
  }

  const handleNext = () => {
    if (!data.plan) { setError('Please select a plan to continue.'); return }
    if (data.plan === 'enterprise') {
      // Redirect to enterprise form — don't continue the wizard
      window.location.href = '/onboarding/enterprise'
      return
    }
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-400 mb-1">
          All plans include a <span className="text-purple-300 font-medium">14-day free trial</span> — no credit card required.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const isSelected = data.plan === plan.id

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => handleSelect(plan.id)}
              className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                isSelected
                  ? `${plan.borderColor} bg-gradient-to-br ${plan.color.replace('from-', 'from-').replace('to-', 'to-')}/10 shadow-lg ${plan.glowColor}`
                  : 'border-white/10 bg-gray-800/40 hover:border-white/20 hover:bg-gray-800/60'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              )}

              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${plan.color} mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>

              <div className="mb-1">
                <span className="text-lg font-bold text-white">{plan.name}</span>
              </div>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-extrabold text-white">{plan.price}</span>
                {plan.period && <span className="text-gray-400 text-sm">{plan.period}</span>}
              </div>

              <p className="text-xs text-gray-400 mb-3">{plan.units}</p>
              <p className="text-sm text-gray-300 mb-4">{plan.tagline}</p>

              <ul className="space-y-1.5">
                {plan.features.slice(0, 3).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-400">
                    <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.id === 'enterprise' && (
                <p className="mt-3 text-xs text-yellow-400 font-medium">
                  Redirects to contact form →
                </p>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 px-6 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-semibold transition"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!data.plan}
          className="flex-[2] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {data.plan === 'enterprise' ? (
            <>Get a Quote <ArrowRight className="w-5 h-5" /></>
          ) : (
            <>Continue <ChevronRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  )
}

function StepCreatePassword({
  data,
  onChange,
  onNext,
  onBack,
  submitting,
  submitError,
}: {
  data: FormData
  onChange: (field: keyof FormData, value: string) => void
  onNext: () => void
  onBack: () => void
  submitting: boolean
  submitError: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})

  const strength = getPasswordStrength(data.password)

  const validate = () => {
    const e: { password?: string; confirm?: string } = {}
    if (!data.password) {
      e.password = 'Password is required.'
    } else if (data.password.length < 8) {
      e.password = 'Password must be at least 8 characters.'
    }
    if (!data.confirmPassword) {
      e.confirm = 'Please confirm your password.'
    } else if (data.password !== data.confirmPassword) {
      e.confirm = 'Passwords do not match.'
    }
    return e
  }

  const handleNext = () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  const selectedPlan = PLANS.find((p) => p.id === data.plan)

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="rounded-xl bg-gray-800/60 border border-white/10 p-4 space-y-2">
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Account Summary</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-400">Company</span>
          <span className="text-white font-medium truncate">{data.companyName}</span>
          <span className="text-gray-400">Account ID</span>
          <span className="text-purple-300 font-medium">{data.subdomain}</span>
          <span className="text-gray-400">Plan</span>
          <span className="text-white font-medium capitalize">{selectedPlan?.name}</span>
          <span className="text-gray-400">Admin email</span>
          <span className="text-white font-medium truncate">{data.email}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Create Password <span className="text-purple-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={data.password}
            onChange={(e) => { onChange('password', e.target.value); setErrors((prev) => ({ ...prev, password: undefined })) }}
            placeholder="Min. 8 characters"
            className={`${inputCls} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Strength indicator */}
        {data.password && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    i <= strength.score ? strength.color : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
            {strength.label && (
              <p className={`text-xs font-medium ${
                strength.score <= 1 ? 'text-red-400' :
                strength.score === 2 ? 'text-yellow-400' :
                strength.score === 3 ? 'text-blue-400' : 'text-green-400'
              }`}>
                {strength.label} password
              </p>
            )}
          </div>
        )}

        {errors.password && <p className="mt-1.5 text-sm text-red-400">{errors.password}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Confirm Password <span className="text-purple-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={data.confirmPassword}
            onChange={(e) => { onChange('confirmPassword', e.target.value); setErrors((prev) => ({ ...prev, confirm: undefined })) }}
            placeholder="Re-enter your password"
            className={`${inputCls} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
          >
            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          {data.confirmPassword && data.password === data.confirmPassword && (
            <Check className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
          )}
        </div>
        {errors.confirm && <p className="mt-1.5 text-sm text-red-400">{errors.confirm}</p>}
      </div>

      {submitError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{submitError}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex-1 px-6 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-semibold transition disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={submitting}
          className="flex-[2] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create Account <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-600 text-center">
        By creating an account you agree to our{' '}
        <Link href="/terms" className="text-purple-400 hover:text-purple-300">Terms of Service</Link>
        {' '}and{' '}
        <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>.
      </p>
    </div>
  )
}

function StepDone({ data }: { data: FormData }) {
  const dashboardUrl = `https://makejahomes.co.ke/auth/login`
  const selectedPlan = PLANS.find((p) => p.id === data.plan)

  return (
    <div className="text-center space-y-8">
      {/* Success animation */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/40">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-30 animate-ping" />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Account Created!
        </h2>
        <p className="text-gray-300 text-lg">
          Welcome to Makeja Homes, <span className="font-semibold text-white">{data.adminName.split(' ')[0]}</span>!
        </p>
        <p className="text-gray-400 text-sm mt-2">
          We've sent a confirmation email to <span className="text-white">{data.email}</span>
        </p>
      </div>

      {/* Account info */}
      <div className="rounded-2xl bg-gray-900 border border-white/10 p-6 text-left space-y-4">
        <h3 className="font-semibold text-gray-300 text-sm uppercase tracking-wider">Your Account</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Company</span>
            <span className="text-white font-medium">{data.companyName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Login URL</span>
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 font-medium text-sm truncate max-w-[200px] transition"
            >
              makejahomes.co.ke/auth/login
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Plan</span>
            <span className="text-white font-medium capitalize">{selectedPlan?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Trial period</span>
            <span className="text-green-400 font-medium">14 days free</span>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="rounded-2xl bg-purple-500/10 border border-purple-500/20 p-6 text-left">
        <h3 className="font-semibold text-purple-300 mb-4">Next Steps</h3>
        <ol className="space-y-3">
          {[
            'Check your email for the welcome message and login link',
            'Log in to your new dashboard and set up your first property',
            'Add your units and invite your tenants',
            'Configure payment collection (M-Pesa / Bank transfer)',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <a
        href={dashboardUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl hover:shadow-purple-500/30 transition text-lg"
      >
        Go to Your Dashboard <ArrowRight className="w-5 h-5" />
      </a>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Main wizard component
// ──────────────────────────────────────────────────────────

const INITIAL_DATA: FormData = {
  companyName: '',
  adminName: '',
  email: '',
  phone: '',
  city: '',
  subdomain: '',
  plan: '',
  password: '',
  confirmPassword: '',
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(INITIAL_DATA)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          subdomain: formData.subdomain,
          adminName: formData.adminName,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          password: formData.password,
          plan: formData.plan,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed. Please try again.')
      }

      setStep(5)
    } catch (err: any) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const progressPercent = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        {/* Progress header */}
        {step < 5 && (
          <div className="mb-10">
            {/* Step labels */}
            <div className="flex justify-between mb-3">
              {STEPS.map((s) => {
                const Icon = s.icon
                const isComplete = step > s.id
                const isCurrent = step === s.id
                return (
                  <div key={s.id} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isComplete
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-md shadow-purple-500/30'
                          : isCurrent
                          ? 'bg-gray-800 border-2 border-purple-500 shadow-sm shadow-purple-500/20'
                          : 'bg-gray-800 border border-white/10'
                      }`}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Icon className={`w-4 h-4 ${isCurrent ? 'text-purple-400' : 'text-gray-600'}`} />
                      )}
                    </div>
                    <span
                      className={`text-xs hidden sm:block ${
                        isCurrent ? 'text-purple-300 font-medium' : isComplete ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Card */}
        <div className={`bg-gray-900 border border-white/10 rounded-2xl p-8 ${step === 5 ? 'shadow-2xl shadow-purple-500/10' : ''}`}>
          {step < 5 && (
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-white">
                {step === 1 && 'Tell us about your company'}
                {step === 2 && 'Choose your Account ID'}
                {step === 3 && 'Select a plan'}
                {step === 4 && 'Create your password'}
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                {step === 1 && "We'll use this to set up your account."}
                {step === 2 && "A unique identifier for your company on Makeja Homes."}
                {step === 3 && "All plans include a 14-day free trial."}
                {step === 4 && "Almost there! Secure your account."}
              </p>
            </div>
          )}

          {step === 1 && (
            <StepCompanyInfo
              data={formData}
              onChange={handleChange}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepSubdomain
              data={formData}
              onChange={handleChange}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepChoosePlan
              data={formData}
              onChange={handleChange}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <StepCreatePassword
              data={formData}
              onChange={handleChange}
              onNext={handleSubmit}
              onBack={() => setStep(3)}
              submitting={submitting}
              submitError={submitError}
            />
          )}

          {step === 5 && (
            <StepDone data={formData} />
          )}
        </div>

        {/* Trust badges */}
        {step < 5 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-green-500" />
              256-bit SSL encryption
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              Data stored securely in Kenya
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-purple-500" />
              No credit card for trial
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
