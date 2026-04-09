import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('id')
    if (!paymentId) return NextResponse.json({ error: 'Payment ID required' }, { status: 400 })

    const db = getPrismaForRequest(request)

    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        p.id,
        p."referenceNumber",
        p.amount,
        p."paymentType"::text AS "paymentType",
        p."paymentMethod"::text AS "paymentMethod",
        p.status::text AS status,
        p."paymentDate",
        p.notes,
        p."transactionId",
        p."bankName",
        p."periodStart",
        p."periodEnd",
        p."paymentComponents",
        u."firstName",
        u."lastName",
        u.email,
        u."phoneNumber",
        un."unitNumber",
        prop.name AS "propertyName",
        prop.address,
        prop.city,
        prop."mpesaPaybillNumber",
        prop."mpesaTillNumber",
        vb."firstName" AS "verifiedByFirst",
        vb."lastName"  AS "verifiedByLast"
      FROM payments p
      JOIN tenants t ON t.id = p."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties prop ON prop.id = un."propertyId"
      LEFT JOIN users vb ON vb.id = p."verifiedById"
      WHERE p.id = $1
      LIMIT 1
    `, paymentId)

    if (!rows.length) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    const p = rows[0]

    const fmtDate = (d: any) =>
      new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
    const fmtAmt = (n: number) => `KSH ${Math.round(n).toLocaleString()}`

    const components: any[] = Array.isArray(p.paymentComponents) ? p.paymentComponents : []
    const componentRows = components.length > 0
      ? components.map((c: any) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;">${c.type ?? c.label ?? 'Payment'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${fmtAmt(c.amount ?? 0)}</td>
          </tr>`).join('')
      : `<tr><td style="padding:8px 12px;color:#374151;">${p.paymentType}</td><td style="padding:8px 12px;text-align:right;color:#374151;">${fmtAmt(Number(p.amount))}</td></tr>`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Receipt – ${p.referenceNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111827; padding: 32px 16px; }
  .page { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
  .header { background: linear-gradient(135deg, #a855f7, #ec4899); padding: 32px 36px; color: #fff; }
  .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .header p { opacity: 0.85; font-size: 14px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.25); border-radius: 6px; padding: 4px 12px; font-size: 12px; font-weight: 600; margin-top: 12px; }
  .body { padding: 32px 36px; }
  .ref { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
  .ref span { font-weight: 600; color: #111827; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
  .info-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 8px; }
  .info-block p { font-size: 14px; color: #111827; line-height: 1.6; }
  .info-block p.muted { color: #6b7280; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { padding: 10px 12px; background: #f3f4f6; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; text-align: left; }
  thead th:last-child { text-align: right; }
  .total-row td { padding: 12px; font-weight: 700; font-size: 16px; color: #111827; border-top: 2px solid #e5e7eb; }
  .total-row td:last-child { text-align: right; color: #a855f7; }
  .footer { padding: 20px 36px; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .footer p { font-size: 12px; color: #9ca3af; }
  .status-pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .status-completed { background: #d1fae5; color: #065f46; }
  .status-pending { background: #fef3c7; color: #92400e; }
  .status-failed { background: #fee2e2; color: #991b1b; }
  .notes { background: #f3f4f6; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #6b7280; margin-bottom: 20px; }
  @media print {
    body { padding: 0; background: #fff; }
    .page { box-shadow: none; border-radius: 0; }
    .print-btn { display: none; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>Payment Receipt</h1>
    <p>${p.propertyName} — ${p.address ?? ''}, ${p.city ?? ''}</p>
    <div class="badge">OFFICIAL RECEIPT</div>
  </div>
  <div class="body">
    <div class="ref">
      Reference: <span>${p.referenceNumber}</span> &nbsp;·&nbsp;
      Date: <span>${fmtDate(p.paymentDate)}</span> &nbsp;·&nbsp;
      Status: <span class="status-pill status-${(p.status ?? '').toLowerCase()}">${p.status}</span>
    </div>
    <div class="grid2">
      <div class="info-block">
        <h3>Tenant</h3>
        <p>${p.firstName} ${p.lastName}</p>
        <p class="muted">${p.email}</p>
        ${p.phoneNumber ? `<p class="muted">${p.phoneNumber}</p>` : ''}
      </div>
      <div class="info-block">
        <h3>Unit</h3>
        <p>Unit ${p.unitNumber}</p>
        <p class="muted">${p.propertyName}</p>
        <p class="muted">${p.city ?? ''}</p>
      </div>
      <div class="info-block">
        <h3>Payment Method</h3>
        <p>${(p.paymentMethod ?? '').replace(/_/g, ' ')}</p>
        ${p.transactionId ? `<p class="muted">Txn: ${p.transactionId}</p>` : ''}
        ${p.bankName ? `<p class="muted">${p.bankName}</p>` : ''}
      </div>
      <div class="info-block">
        <h3>Period</h3>
        <p>${p.periodStart ? fmtDate(p.periodStart) : '—'}</p>
        ${p.periodEnd ? `<p class="muted">to ${fmtDate(p.periodEnd)}</p>` : ''}
        ${p.verifiedByFirst ? `<p class="muted">Verified by ${p.verifiedByFirst} ${p.verifiedByLast}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr><th>Description</th><th>Amount</th></tr>
      </thead>
      <tbody>
        ${componentRows}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td>Total Paid</td>
          <td>${fmtAmt(Number(p.amount))}</td>
        </tr>
      </tfoot>
    </table>

    ${p.notes ? `<div class="notes"><strong>Notes:</strong> ${p.notes}</div>` : ''}
  </div>
  <div class="footer">
    <p>Makeja Homes &copy; ${new Date().getFullYear()} &nbsp;·&nbsp; support@makejahomes.co.ke</p>
    <button class="print-btn" onclick="window.print()" style="background:#a855f7;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600;">Print / Save PDF</button>
  </div>
</div>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: any) {
    console.error('[RECEIPT]', err?.message)
    return NextResponse.json({ error: 'Failed to generate receipt' }, { status: 500 })
  }
}
