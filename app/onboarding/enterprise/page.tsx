'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, CheckCircle, AlertCircle, ArrowLeft, Send } from 'lucide-react'

const UNIT_RANGES = [
  '100 – 250 units',
  '251 – 500 units',
  '501 – 1,000 units',
  '1,001 – 5,000 units',
  '5,000+ units',
]

export default function EnterprisePage() {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    units: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const messageBody = `Enterprise Inquiry\n\nCompany: ${formData.companyName}\nContact: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nApproximate Units: ${formData.units}\n\nRequirements:\n${formData.message}`

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          message: messageBody,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send. Please try again.')
      }

      setSuccess(true)
      setFormData({ name: '', companyName: '', email: '', phone: '', units: '', message: '' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-10 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to plans
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-6">
            <Building2 className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Get a Custom Quote
          </h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Tell us about your portfolio. We'll craft a bespoke plan with pricing that fits your scale.
          </p>
        </div>

        {/* Perks */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          {[
            'Unlimited units',
            'Dedicated account manager',
            'Custom integrations',
            'SLA guarantee',
            'Priority support',
            'Custom onboarding',
          ].map((perk) => (
            <div
              key={perk}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300"
            >
              <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
              {perk}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-8">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Message Received!</h2>
              <p className="text-gray-400 mb-8">
                Our enterprise team will reach out within one business day to discuss your requirements.
              </p>
              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Your Name <span className="text-purple-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Jane Mwangi"
                      className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Company Name <span className="text-purple-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      required
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Horizon Properties Ltd"
                      className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address <span className="text-purple-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="jane@horizon.co.ke"
                      className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+254 700 000 000"
                      className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Approximate Number of Units <span className="text-purple-400">*</span>
                  </label>
                  <select
                    name="units"
                    required
                    value={formData.units}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition appearance-none"
                  >
                    <option value="" disabled className="text-gray-500">
                      Select range...
                    </option>
                    {UNIT_RANGES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Requirements / Message <span className="text-purple-400">*</span>
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your portfolio, specific features you need, integration requirements, or any questions..."
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Inquiry
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
