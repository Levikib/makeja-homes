import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SignLeaseClient from "./SignLeaseClient";

export default async function SignLeasePage({ params }: { params: { token: string } }) {
  // Find lease by signature token
  const lease = await prisma.lease_agreements.findUnique({
    where: { signatureToken: params.token },
    include: {
      tenants: {
        include: {
          users: true,
        },
      },
      units: {
        include: {
          properties: true,
        },
      },
    },
  });

  if (!lease) {
    notFound();
  }

  // Check if already signed
  if (lease.contractSignedAt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Already Signed!</h1>
          <p className="text-gray-600 mb-4">
            This lease agreement was already signed on{" "}
            {new Date(lease.contractSignedAt).toLocaleDateString()} at{" "}
            {new Date(lease.contractSignedAt).toLocaleTimeString()}.
          </p>
          <p className="text-gray-500 text-sm">
            If you have any questions, please contact Makeja Homes.
          </p>
        </div>
      </div>
    );
  }

  return <SignLeaseClient lease={lease} />;
}
