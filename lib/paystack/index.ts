import axios from 'axios';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initialize Paystack payment
export async function initializePayment(
  email: string,
  amount: number, // in KES
  reference: string,
  subaccountCode?: string,
  metadata?: any
) {
  try {
    const payload: any = {
      email,
      amount: Math.round(amount * 100), // Convert to kobo/cents
      reference,
      currency: 'KES',
      channels: ['mobile_money', 'card', 'bank'],
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant/payments?reference=${reference}`,
      metadata,
    };

    // Add subaccount if provided (NO commission - 100% to landlord)
    if (subaccountCode) {
      payload.subaccount = subaccountCode;
      payload.transaction_charge = 0; // No commission to platform
    }

    console.log("📤 Paystack request:", {
      email,
      amount: payload.amount,
      reference,
      hasSubaccount: !!subaccountCode,
    });

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log("✅ Paystack initialized:", response.data.data.reference);

    return {
      success: true,
      authorizationUrl: response.data.data.authorization_url,
      accessCode: response.data.data.access_code,
      reference: response.data.data.reference,
    };
  } catch (error: any) {
    console.error('❌ Paystack initialization error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to initialize payment');
  }
}

// Verify payment
export async function verifyPayment(reference: string) {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data.data;

    return {
      success: data.status === 'success',
      amount: data.amount / 100, // Convert from kobo
      paidAt: data.paid_at,
      channel: data.channel,
      reference: data.reference,
      customerEmail: data.customer.email,
      metadata: data.metadata,
    };
  } catch (error: any) {
    console.error('❌ Paystack verification error:', error.response?.data || error.message);
    throw new Error('Failed to verify payment');
  }
}

// Create subaccount for landlord (NO COMMISSION)
export async function createSubaccount(
  businessName: string,
  bankCode: string,
  accountNumber: string,
  email: string
) {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/subaccount`,
      {
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: 0, // NO COMMISSION - 100% to landlord
        description: `Property payments for ${businessName}`,
        primary_contact_email: email,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log("✅ Subaccount created:", response.data.data.subaccount_code);

    return {
      success: true,
      subaccountCode: response.data.data.subaccount_code,
      accountNumber: response.data.data.account_number,
      bankName: response.data.data.settlement_bank,
    };
  } catch (error: any) {
    console.error('❌ Subaccount creation error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create subaccount');
  }
}

// List supported banks in Kenya (FIXED - Remove duplicates)
export async function listBanks() {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/bank?country=kenya`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    // Remove duplicate banks by code
    const uniqueBanks = response.data.data.reduce((acc: any[], bank: any) => {
      if (!acc.find(b => b.code === bank.code)) {
        acc.push(bank);
      }
      return acc;
    }, []);

    // Sort alphabetically by name
    const sortedBanks = uniqueBanks.sort((a: any, b: any) => 
      a.name.localeCompare(b.name)
    );

    console.log(`✅ Found ${sortedBanks.length} unique banks`);

    return sortedBanks;
  } catch (error: any) {
    console.error('❌ Error listing banks:', error.response?.data || error.message);
    throw new Error('Failed to fetch banks');
  }
}

// Resolve bank account (verify account details)
export async function resolveAccountNumber(accountNumber: string, bankCode: string) {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return {
      success: true,
      accountNumber: response.data.data.account_number,
      accountName: response.data.data.account_name,
      bankId: response.data.data.bank_id,
    };
  } catch (error: any) {
    console.error('❌ Error resolving account:', error.response?.data || error.message);
    throw new Error('Invalid account details');
  }
}