/**
 * QuickBooks Online integration
 *
 * OAuth2 flow:
 *   1. Admin clicks "Connect QuickBooks" → GET /api/integrations/quickbooks/connect
 *      redirects to Intuit OAuth2 consent page
 *   2. Intuit redirects back to /api/integrations/quickbooks/callback
 *      with ?code=...&realmId=...
 *   3. We exchange the code for access+refresh tokens, store in integrations table
 *
 * Sync operations (called from payment/expense routes):
 *   - syncPaymentToQBO:  payment received → create Sales Receipt in QBO
 *   - syncExpenseToQBO:  expense recorded → create Expense/Purchase in QBO
 *   - syncTenantToQBO:   new tenant → create Customer in QBO
 */

export interface QBOTokens {
  accessToken: string
  refreshToken: string
  realmId: string       // QuickBooks company ID
  expiresAt: number     // unix timestamp ms
  refreshExpiresAt: number
}

export interface QBOConfig extends QBOTokens {
  clientId: string
  clientSecret: string
  environment: 'sandbox' | 'production'
}

const QBO_BASE = {
  sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  production: 'https://quickbooks.api.intuit.com',
}

const INTUIT_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

// ── OAuth helpers ─────────────────────────────────────────────────────────

export function getAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    access_type: 'offline',
  })
  return `https://appcenter.intuit.com/connect/oauth2?${params}`
}

export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; refreshExpiresIn: number }> {
  const res = await fetch(INTUIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }).toString(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`QBO token exchange failed: ${err}`)
  }
  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    refreshExpiresIn: data.x_refresh_token_expires_in,
  }
}

export async function refreshAccessToken(config: QBOConfig): Promise<QBOTokens> {
  const res = await fetch(INTUIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: config.refreshToken }).toString(),
  })
  if (!res.ok) throw new Error('QBO token refresh failed')
  const data = await res.json()
  const now = Date.now()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? config.refreshToken,
    realmId: config.realmId,
    expiresAt: now + data.expires_in * 1000,
    refreshExpiresAt: now + data.x_refresh_token_expires_in * 1000,
  }
}

async function qboRequest(
  config: QBOConfig,
  method: string,
  path: string,
  body?: object
): Promise<any> {
  // Auto-refresh if token expired
  let tokens: QBOTokens = config
  if (Date.now() > config.expiresAt - 60_000) {
    tokens = await refreshAccessToken(config)
  }

  const base = QBO_BASE[config.environment]
  const res = await fetch(`${base}/v3/company/${config.realmId}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`QBO API error ${res.status}: ${err}`)
  }
  return res.json()
}

// ── Sync: Customer (Tenant) ───────────────────────────────────────────────

export async function syncTenantToQBO(
  config: QBOConfig,
  tenant: { id: string; name: string; email: string; phone?: string; unitNumber: string; propertyName: string }
): Promise<{ qboCustomerId: string }> {
  const data = await qboRequest(config, 'POST', '/customer', {
    DisplayName: `${tenant.name} — ${tenant.propertyName} Unit ${tenant.unitNumber}`,
    PrimaryEmailAddr: tenant.email ? { Address: tenant.email } : undefined,
    PrimaryPhone: tenant.phone ? { FreeFormNumber: tenant.phone } : undefined,
    Notes: `Tenant ID: ${tenant.id}`,
    Active: true,
  })
  return { qboCustomerId: data.Customer?.Id }
}

export async function findQBOCustomer(
  config: QBOConfig,
  tenantId: string
): Promise<string | null> {
  const query = encodeURIComponent(`SELECT * FROM Customer WHERE Notes LIKE '%${tenantId}%' MAXRESULTS 1`)
  const data = await qboRequest(config, 'GET', `/query?query=${query}`)
  const customers = data?.QueryResponse?.Customer
  return customers?.[0]?.Id ?? null
}

// ── Sync: Payment → Sales Receipt ────────────────────────────────────────

export async function syncPaymentToQBO(
  config: QBOConfig,
  payment: {
    id: string
    referenceNumber: string
    amount: number
    paymentDate: string
    paymentMethod: string
    tenantName: string
    tenantId: string
    unitNumber: string
    propertyName: string
    notes?: string
  }
): Promise<{ qboSalesReceiptId: string }> {
  // Find or create the customer
  let customerId = await findQBOCustomer(config, payment.tenantId)
  if (!customerId) {
    const created = await syncTenantToQBO(config, {
      id: payment.tenantId,
      name: payment.tenantName,
      email: '',
      unitNumber: payment.unitNumber,
      propertyName: payment.propertyName,
    })
    customerId = created.qboCustomerId
  }

  const paymentMethodMap: Record<string, string> = {
    MPESA: 'Mobile Money',
    BANK_TRANSFER: 'Bank Transfer',
    CASH: 'Cash',
    CHEQUE: 'Check',
    PAYSTACK: 'Credit Card',
  }

  const data = await qboRequest(config, 'POST', '/salesreceipt', {
    CustomerRef: { value: customerId },
    DocNumber: payment.referenceNumber,
    TxnDate: payment.paymentDate.split('T')[0],
    PaymentMethodRef: { name: paymentMethodMap[payment.paymentMethod] ?? payment.paymentMethod },
    PrivateNote: payment.notes ?? `Rent payment — ${payment.propertyName} Unit ${payment.unitNumber}`,
    Line: [
      {
        Amount: payment.amount,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { name: 'Rent Income', value: '1' },
          Qty: 1,
          UnitPrice: payment.amount,
        },
        Description: `Rent — ${payment.propertyName} Unit ${payment.unitNumber}`,
      },
    ],
  })

  return { qboSalesReceiptId: data.SalesReceipt?.Id }
}

// ── Sync: Expense → Purchase ──────────────────────────────────────────────

export async function syncExpenseToQBO(
  config: QBOConfig,
  expense: {
    id: string
    amount: number
    category: string
    description: string
    date: string
    paymentMethod?: string
    propertyName: string
  }
): Promise<{ qboPurchaseId: string }> {
  const paymentTypeMap: Record<string, string> = {
    CASH: 'Cash',
    BANK_TRANSFER: 'Check',
    MPESA: 'Check',
  }

  const data = await qboRequest(config, 'POST', '/purchase', {
    PaymentType: paymentTypeMap[expense.paymentMethod ?? 'CASH'] ?? 'Cash',
    TxnDate: expense.date.split('T')[0],
    PrivateNote: `${expense.description} — ${expense.propertyName}`,
    Line: [
      {
        Amount: expense.amount,
        DetailType: 'AccountBasedExpenseLineDetail',
        AccountBasedExpenseLineDetail: {
          AccountRef: { name: expense.category },
        },
        Description: expense.description,
      },
    ],
  })

  return { qboPurchaseId: data.Purchase?.Id }
}

// ── Sync: Profit & Loss report ────────────────────────────────────────────

export async function getQBOProfitAndLoss(
  config: QBOConfig,
  startDate: string,  // YYYY-MM-DD
  endDate: string
): Promise<any> {
  return qboRequest(
    config, 'GET',
    `/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}&accounting_method=Cash`
  )
}
