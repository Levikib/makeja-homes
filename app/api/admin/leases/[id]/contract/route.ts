import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const prisma = getPrismaForRequest(request)
    const lease = await prisma.lease_agreements.findUnique({
      where: { id: params.id },
      include: {
        tenants: {
          include: {
            users: {
              select: {
                firstName: true, lastName: true, email: true,
                phoneNumber: true, idNumber: true,
              },
            },
          },
        },
        units: {
          include: {
            properties: {
              select: {
                name: true, address: true, city: true, country: true,
                mpesaPaybillNumber: true, mpesaTillNumber: true,
                mpesaPaybillName: true,
              },
            },
          },
        },
      },
    })

    if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 })

    const tenant = lease.tenants
    const user = tenant.users
    const unit = lease.units
    const property = unit.properties

    const fmtDate = (d: any) =>
      new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
    const fmtAmt = (n: any) => `KSH ${Math.round(Number(n)).toLocaleString()}`

    const leaseDurationMonths = Math.round(
      (new Date(lease.endDate).getTime() - new Date(lease.startDate).getTime()) /
      (1000 * 60 * 60 * 24 * 30)
    )

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Lease Agreement – ${user.firstName} ${user.lastName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; background: #fff; color: #111; padding: 40px 32px; font-size: 14px; line-height: 1.7; }
  .page { max-width: 750px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 32px; border-bottom: 3px double #111; padding-bottom: 20px; }
  .logo { display: inline-block; background: linear-gradient(135deg, #a855f7, #ec4899); border-radius: 8px; padding: 8px 18px; margin-bottom: 12px; }
  .logo span { color: #fff; font-size: 18px; font-weight: 700; font-family: sans-serif; }
  h1 { font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
  h2 { font-size: 16px; font-weight: 700; margin: 24px 0 10px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .party-box { border: 1px solid #ddd; border-radius: 6px; padding: 16px; }
  .party-box h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin-bottom: 8px; }
  .party-box p { font-size: 13px; line-height: 1.6; }
  .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .details-table td { padding: 8px 12px; border: 1px solid #ddd; font-size: 13px; }
  .details-table td:first-child { background: #f9f9f9; font-weight: 600; width: 40%; }
  ol { padding-left: 24px; margin-bottom: 20px; }
  ol li { margin-bottom: 10px; font-size: 13px; }
  .signature-block { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; padding-top: 20px; border-top: 2px solid #111; }
  .sig-line { margin-bottom: 8px; border-bottom: 1px solid #555; height: 40px; }
  .sig-label { font-size: 12px; color: #555; }
  .sig-name { font-size: 13px; font-weight: 600; margin-top: 4px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
  .highlight { background: #fef3c7; padding: 12px 16px; border-left: 4px solid #f59e0b; margin-bottom: 20px; font-size: 13px; border-radius: 0 6px 6px 0; }
  @media print {
    body { padding: 16px; }
    .print-btn { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo"><span>Makeja Homes</span></div>
    <h1>Residential Lease Agreement</h1>
    <p style="font-size:13px;color:#555;">Contract No: ${lease.id.slice(-10).toUpperCase()} &nbsp;·&nbsp; Generated: ${fmtDate(new Date())}</p>
  </div>

  <div class="highlight">
    This Residential Lease Agreement is entered into between the Landlord and the Tenant as described below, for the property unit specified herein, subject to the terms and conditions contained in this Agreement.
  </div>

  <h2>1. Parties to the Agreement</h2>
  <div class="parties">
    <div class="party-box">
      <h3>Landlord / Management</h3>
      <p><strong>${property.name}</strong><br/>
      ${property.address}<br/>
      ${property.city}, ${property.country}<br/>
      ${property.mpesaPaybillName ? `<br/>Paybill: ${property.mpesaPaybillName} (${property.mpesaPaybillNumber})` : ''}
      ${property.mpesaTillNumber ? `<br/>Till: ${property.mpesaTillNumber}` : ''}
      </p>
    </div>
    <div class="party-box">
      <h3>Tenant</h3>
      <p><strong>${user.firstName} ${user.lastName}</strong><br/>
      ${user.email}<br/>
      ${user.phoneNumber ?? ''}<br/>
      ${user.idNumber ? `ID/Passport: ${user.idNumber}` : ''}
      </p>
    </div>
  </div>

  <h2>2. Lease Details</h2>
  <table class="details-table">
    <tr><td>Property</td><td>${property.name} — ${property.address}, ${property.city}</td></tr>
    <tr><td>Unit</td><td>Unit ${unit.unitNumber} (${unit.type})</td></tr>
    <tr><td>Lease Start Date</td><td>${fmtDate(lease.startDate)}</td></tr>
    <tr><td>Lease End Date</td><td>${fmtDate(lease.endDate)}</td></tr>
    <tr><td>Duration</td><td>${leaseDurationMonths} months</td></tr>
    <tr><td>Monthly Rent</td><td><strong>${fmtAmt(lease.rentAmount)}</strong></td></tr>
    <tr><td>Security Deposit</td><td>${fmtAmt(lease.depositAmount ?? 0)}</td></tr>
    <tr><td>Status</td><td>${lease.status}</td></tr>
  </table>

  <h2>3. Terms and Conditions</h2>
  <ol>
    <li><strong>Rent Payment:</strong> Monthly rent of <strong>${fmtAmt(lease.rentAmount)}</strong> is due on or before the 5th day of each calendar month. Late payments attract a penalty as stipulated by management.</li>
    <li><strong>Security Deposit:</strong> The Tenant has paid a refundable security deposit of <strong>${fmtAmt(lease.depositAmount ?? 0)}</strong>. This deposit shall be refunded within 30 days after the Tenant vacates, subject to deductions for damages beyond normal wear and tear.</li>
    <li><strong>Utilities:</strong> The Tenant is responsible for payment of water, electricity, garbage collection fees, and any other utility charges applicable to the unit. Water charges are billed monthly based on meter readings.</li>
    <li><strong>Use of Premises:</strong> The Tenant shall use the premises for residential purposes only and shall not sublet, assign, or transfer any interest without written consent from Management.</li>
    <li><strong>Maintenance:</strong> The Tenant shall maintain the unit in a clean and sanitary condition and shall promptly report any damages or maintenance issues to Management. Intentional or negligent damage shall be the financial responsibility of the Tenant.</li>
    <li><strong>Notice to Vacate:</strong> Either party shall provide a minimum of 30 days written notice before the end of the lease period. Failure to provide notice may result in forfeiture of part of the security deposit.</li>
    <li><strong>Prohibited Activities:</strong> The Tenant shall not engage in any illegal activities on the premises, cause nuisance to other tenants, keep pets without written management approval, or make structural alterations to the unit.</li>
    <li><strong>Inspection:</strong> Management reserves the right to inspect the unit with reasonable notice (minimum 24 hours) or immediately in case of emergency.</li>
    <li><strong>Renewal:</strong> This lease may be renewed by mutual agreement in writing. Continued occupation after the end date without a new agreement shall constitute a month-to-month tenancy.</li>
    <li><strong>Governing Law:</strong> This Agreement is governed by the laws of Kenya including the Landlord and Tenant Act (Cap 301) and the Rent Restriction Act (Cap 296).</li>
  </ol>

  ${lease.terms ? `
  <h2>4. Special Conditions</h2>
  <p style="font-size:13px;">${lease.terms}</p>
  ` : ''}

  <h2>${lease.terms ? '5' : '4'}. Signatures</h2>
  <p style="font-size:13px;margin-bottom:20px;">By signing below, both parties agree to all terms and conditions stated in this Lease Agreement.</p>

  <div class="signature-block">
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Landlord / Authorised Representative</div>
      <div class="sig-name">${property.name}</div>
      <div class="sig-label" style="margin-top:8px;">Date: ___________________________</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Tenant Signature</div>
      <div class="sig-name">${user.firstName} ${user.lastName}</div>
      <div class="sig-label" style="margin-top:8px;">Date: ___________________________</div>
    </div>
  </div>

  <div class="footer">
    <p>Generated by Makeja Homes Property Management System &nbsp;·&nbsp; support@makejahomes.co.ke</p>
    <p>This document is legally binding once signed by both parties.</p>
    <button onclick="window.print()" class="print-btn" style="margin-top:12px;background:#a855f7;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600;">Print / Save PDF</button>
  </div>
</div>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: any) {
    console.error('[LEASE CONTRACT]', err?.message)
    return NextResponse.json({ error: 'Failed to generate lease contract' }, { status: 500 })
  }
}
