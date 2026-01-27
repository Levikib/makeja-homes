'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2, FileText, AlertCircle } from 'lucide-react';

interface LeaseData {
  id: string;
  property: string;
  unitNumber: string;
  tenant: string;
  email: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  terms: string;
  alreadySigned: boolean;
}

export default function SignLeasePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [leaseData, setLeaseData] = useState<LeaseData | null>(null);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchLeaseData();
  }, [token]);

  const fetchLeaseData = async () => {
    try {
      const response = await fetch(`/api/tenant/lease/sign/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load lease agreement');
        return;
      }

      setLeaseData(data);
    } catch (err) {
      setError('Failed to load lease agreement');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!agreed || !signature.trim()) {
      setError('Please agree to the terms and provide your full name');
      return;
    }

    setSigning(true);
    setError('');

    try {
      const response = await fetch(`/api/tenant/lease/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signature.trim(),
          signatureType: 'typed',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to sign lease');
        return;
      }

      setSuccess(true);
      
      // Show success message for 3 seconds, then redirect
      setTimeout(() => {
        router.push('/auth/login?message=lease_signed');
      }, 3000);

    } catch (err) {
      setError('Failed to sign lease. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading lease agreement...</p>
        </div>
      </div>
    );
  }

  if (error && !leaseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Lease Agreement Signed!
          </h2>
          <p className="text-gray-600 mb-4">
            Your lease has been successfully signed. Check your email for login credentials to access your tenant dashboard.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  if (leaseData?.alreadySigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Already Signed
          </h2>
          <p className="text-gray-600 mb-6">
            This lease agreement has already been signed.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Lease Agreement
              </h1>
              <p className="text-gray-600">Please review and sign below</p>
            </div>
          </div>
        </div>

        {/* Lease Details */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Agreement Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Property</label>
              <p className="text-gray-900 font-medium">{leaseData?.property}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Unit Number</label>
              <p className="text-gray-900 font-medium">{leaseData?.unitNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Tenant Name</label>
              <p className="text-gray-900 font-medium">{leaseData?.tenant}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900 font-medium">{leaseData?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Start Date</label>
              <p className="text-gray-900 font-medium">
                {new Date(leaseData?.startDate || '').toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">End Date</label>
              <p className="text-gray-900 font-medium">
                {new Date(leaseData?.endDate || '').toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Monthly Rent</label>
              <p className="text-gray-900 font-medium">
                KSH {leaseData?.monthlyRent.toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Security Deposit</label>
              <p className="text-gray-900 font-medium">
                KSH {leaseData?.depositAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {leaseData?.terms && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {leaseData.terms}
              </p>
            </div>
          )}
        </div>

        {/* Signature Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Digital Signature
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name (Type to sign)
            </label>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ fontFamily: 'cursive', fontSize: '1.5rem' }}
            />
          </div>

          <div className="mb-6">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the terms and conditions of this lease agreement.
                By signing electronically, I acknowledge that this signature is legally binding.
              </span>
            </label>
          </div>

          <button
            onClick={handleSign}
            disabled={signing || !agreed || !signature.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {signing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing...
              </>
            ) : (
              'Sign Lease Agreement'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
