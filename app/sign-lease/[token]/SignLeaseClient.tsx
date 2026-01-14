"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle } from "lucide-react";

interface Lease {
  id: string;
  rentAmount: number;
  depositAmount: number;
  startDate: Date;
  endDate: Date;
  contractTerms: string | null;
  tenants: {
    users: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  units: {
    unitNumber: string;
    properties: {
      name: string;
      address: string;
      city: string;
    };
  };
}

export default function SignLeaseClient({ lease }: { lease: Lease }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  const handleSign = async () => {
    if (!agreed) {
      setError("Please agree to the terms and conditions before signing.");
      return;
    }

    setSigning(true);
    setError("");

    try {
      const response = await fetch(`/api/sign-lease`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseId: lease.id,
          agreed: true,
        }),
      });

      if (response.ok) {
        router.push(`/sign-lease/success`);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to sign lease. Please try again.");
        setSigning(false);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              🏠 Lease Agreement
            </h1>
            <p className="text-gray-600">Makeja Homes Property Management</p>
          </div>

          {/* Lease Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Tenant</p>
              <p className="text-lg font-semibold text-gray-900">
                {lease.tenants.users.firstName} {lease.tenants.users.lastName}
              </p>
              <p className="text-sm text-gray-600">{lease.tenants.users.email}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Property</p>
              <p className="text-lg font-semibold text-gray-900">
                {lease.units.properties.name}
              </p>
              <p className="text-sm text-gray-600">Unit {lease.units.unitNumber}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Monthly Rent</p>
              <p className="text-2xl font-bold text-green-600">
                KSH {lease.rentAmount.toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Lease Period</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(lease.startDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                to {new Date(lease.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Contract Terms */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Terms & Conditions</h2>
          <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {lease.contractTerms}
            </pre>
          </div>
        </div>

        {/* Agreement Checkbox */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-start gap-3 mb-6">
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="agree" className="text-gray-700 cursor-pointer">
              I have read and agree to all the terms and conditions stated in this lease
              agreement. I understand that by clicking "Sign Agreement" below, I am creating a
              legally binding digital signature.
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSign}
            disabled={!agreed || signing}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signing ? (
              "Processing..."
            ) : (
              <>
                <Check className="w-6 h-6 mr-2" />
                Sign Lease Agreement
              </>
            )}
          </Button>

          <p className="text-center text-gray-500 text-sm mt-4">
            🔒 Your signature will be securely recorded with timestamp and IP address for
            legal verification.
          </p>
        </div>
      </div>
    </div>
  );
}
