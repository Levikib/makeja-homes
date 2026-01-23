/**
 * Paystack Integration Library
 * Handles all Paystack API interactions for Makeja Homes
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  console.warn("⚠️ PAYSTACK_SECRET_KEY not configured in environment variables");
}

/**
 * Make authenticated request to Paystack API
 */
async function paystackRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${PAYSTACK_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Paystack API Error:", data);
    throw new Error(data.message || "Paystack request failed");
  }

  return data;
}

/**
 * List all supported banks in Kenya
 */
export async function listBanks() {
  try {
    console.log("🏦 Fetching Kenyan banks from Paystack...");
    
    const data = await paystackRequest("/bank?country=kenya");
    
    return data.data.map((bank: any) => ({
      id: bank.id,
      name: bank.name,
      code: bank.code,
      active: bank.active,
    }));
  } catch (error: any) {
    console.error("❌ Error fetching banks:", error);
    throw new Error("Failed to fetch banks from Paystack");
  }
}

/**
 * Verify bank account number
 */
export async function resolveAccountNumber(
  accountNumber: string,
  bankCode: string
) {
  try {
    console.log("🔍 Verifying account:", { accountNumber, bankCode });
    
    const data = await paystackRequest(
      `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
    );

    return {
      accountNumber: data.data.account_number,
      accountName: data.data.account_name,
      bankId: data.data.bank_id,
    };
  } catch (error: any) {
    console.error("❌ Account verification failed:", error);
    throw new Error("Invalid bank account. Please verify your details.");
  }
}

/**
 * Create a Paystack subaccount for property owner
 * Money goes 100% to the landlord's account (no commission)
 */
export async function createSubaccount(
  businessName: string,
  bankCode: string,
  accountNumber: string,
  email: string
) {
  try {
    console.log("🏦 Creating Paystack subaccount...");
    
    const data = await paystackRequest("/subaccount", {
      method: "POST",
      body: JSON.stringify({
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: 0, // 100% goes to landlord
        description: `Property payments for ${businessName}`,
        primary_contact_email: email,
      }),
    });

    return {
      subaccountCode: data.data.subaccount_code,
      businessName: data.data.business_name,
      accountNumber: data.data.account_number,
      bankName: data.data.settlement_bank,
    };
  } catch (error: any) {
    console.error("❌ Subaccount creation failed:", error);
    throw new Error(error.message || "Failed to create Paystack subaccount");
  }
}

/**
 * Update existing Paystack subaccount
 */
export async function updateSubaccount(
  subaccountCode: string,
  updates: {
    businessName?: string;
    bankCode?: string;
    accountNumber?: string;
    email?: string;
  }
) {
  try {
    console.log("🔄 Updating Paystack subaccount:", subaccountCode);
    
    const body: any = {};
    
    if (updates.businessName) body.business_name = updates.businessName;
    if (updates.bankCode) body.settlement_bank = updates.bankCode;
    if (updates.accountNumber) body.account_number = updates.accountNumber;
    if (updates.email) body.primary_contact_email = updates.email;

    const data = await paystackRequest(`/subaccount/${subaccountCode}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    return {
      subaccountCode: data.data.subaccount_code,
      businessName: data.data.business_name,
      accountNumber: data.data.account_number,
    };
  } catch (error: any) {
    console.error("❌ Subaccount update failed:", error);
    throw new Error(error.message || "Failed to update Paystack subaccount");
  }
}

/**
 * Initialize payment transaction
 */
export async function initializeTransaction(
  email: string,
  amount: number, // Amount in kobo (smallest currency unit)
  reference: string,
  subaccountCode?: string,
  metadata?: any
) {
  try {
    console.log("💳 Initializing Paystack transaction:", {
      email,
      amount,
      reference,
      subaccountCode,
    });

    const body: any = {
      email,
      amount,
      reference,
      currency: "KES",
      metadata: metadata || {},
    };

    if (subaccountCode) {
      body.subaccount = subaccountCode;
    }

    const data = await paystackRequest("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    };
  } catch (error: any) {
    console.error("❌ Transaction initialization failed:", error);
    throw new Error(error.message || "Failed to initialize payment");
  }
}

/**
 * Verify transaction status
 */
export async function verifyTransaction(reference: string) {
  try {
    console.log("🔍 Verifying transaction:", reference);
    
    const data = await paystackRequest(`/transaction/verify/${reference}`);

    return {
      status: data.data.status,
      reference: data.data.reference,
      amount: data.data.amount,
      currency: data.data.currency,
      paidAt: data.data.paid_at,
      channel: data.data.channel,
      customer: {
        email: data.data.customer.email,
        customerCode: data.data.customer.customer_code,
      },
      metadata: data.data.metadata,
    };
  } catch (error: any) {
    console.error("❌ Transaction verification failed:", error);
    throw new Error(error.message || "Failed to verify transaction");
  }
}
