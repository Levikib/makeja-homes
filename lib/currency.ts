// lib/currency.ts
// Utility functions for formatting currency in Kenyan Shillings

/**
 * Format a number as Kenyan Shillings (KSh)
 */
export function formatCurrency(amount: number, includeDecimals: boolean = false): string {
  if (isNaN(amount)) return "KSh 0";
  
  const formatter = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });

  return formatter.format(amount).replace('KES', 'KSh');
}

export function formatNumber(amount: number): string {
  if (isNaN(amount)) return "0";
  return new Intl.NumberFormat('en-KE').format(amount);
}

export function parseCurrency(currencyString: string): number {
  if (!currencyString) return 0;
  const cleaned = currencyString.replace(/KSh/gi, '').replace(/,/g, '').trim();
  return parseFloat(cleaned) || 0;
}
