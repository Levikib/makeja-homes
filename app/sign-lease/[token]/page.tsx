import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { PrismaClient } from "@prisma/client";
import SignLeaseClient from "./SignLeaseClient";
import { getSchemaFromHost, buildTenantUrl } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export default async function SignLeasePage({ params }: { params: { token: string } }) {
  const headersList = headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const schema = getSchemaFromHost(host);

  const prisma = new PrismaClient({ datasources: { db: { url: buildTenantUrl(schema) } } });

  let lease: any;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT la.id, la."rentAmount", la."depositAmount", la."startDate", la."endDate",
        la."contractTerms", la."contractSignedAt", la."signatureToken",
        u."firstName", u."lastName", u.email,
        un."unitNumber",
        p.name as "propertyName", p.address as "propertyAddress", p.city as "propertyCity"
      FROM lease_agreements la
      JOIN tenants t ON t.id = la."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = la."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE la."signatureToken" = $1 LIMIT 1
    `, params.token);
    lease = rows[0] ?? null;
  } catch (err) {
    console.error("[sign-lease] DB error:", err, "host:", host, "schema:", schema, "token:", params.token);
    lease = null;
  } finally {
    await prisma.$disconnect();
  }

  if (!lease) {
    console.error("[sign-lease] notFound — host:", host, "schema:", schema, "token:", params.token);
    notFound();
  }

  // Already signed
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
            If you have any questions, please contact your property manager.
          </p>
        </div>
      </div>
    );
  }

  // Shape data to match what SignLeaseClient expects
  const leaseData = {
    id: lease.id,
    rentAmount: lease.rentAmount,
    depositAmount: lease.depositAmount,
    startDate: lease.startDate,
    endDate: lease.endDate,
    contractTerms: lease.contractTerms,
    tenants: {
      users: {
        firstName: lease.firstName,
        lastName: lease.lastName,
        email: lease.email,
      },
    },
    units: {
      unitNumber: lease.unitNumber,
      properties: {
        name: lease.propertyName,
        address: lease.propertyAddress,
        city: lease.propertyCity,
      },
    },
  };

  return <SignLeaseClient lease={leaseData} />;
}
