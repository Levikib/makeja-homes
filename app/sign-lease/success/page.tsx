import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, FileText } from "lucide-react";

export default function SignLeaseSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="bg-green-100 rounded-full p-6">
              <CheckCircle className="w-20 h-20 text-green-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 Lease Signed Successfully!
          </h1>

          {/* Message */}
          <p className="text-lg text-gray-600 mb-8">
            Your lease agreement has been digitally signed and is now active. You will receive
            a confirmation email shortly.
          </p>

          {/* Info Cards */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              What happens next?
            </h2>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Your lease is now active and legally binding</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>You'll receive a confirmation email with your lease details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Property management will contact you about move-in details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Keep this confirmation for your records</span>
              </li>
            </ul>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 text-left">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> If you have any questions about your lease or move-in
              process, please contact Makeja Homes at{" "}
              <a href="mailto:support@makejahomes.com" className="underline">
                support@makejahomes.com
              </a>
            </p>
          </div>

          {/* Action */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-6 text-lg">
                <Home className="w-5 h-5 mr-2" />
                Return to Home
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <p className="text-gray-500 text-sm mt-8">
            Signed digitally on {new Date().toLocaleDateString()} at{" "}
            {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
