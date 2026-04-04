/**
 * Kenyan Property Tax & Compliance Calculations
 * Based on KRA guidelines, Income Tax Act (Cap 470), VAT Act (Cap 476),
 * and the Land Rates Act.
 *
 * MRI (Monthly Rental Income) Withholding Tax:
 *   - 7.5% on gross monthly rent if annual rent > KSH 288,000
 *   - Applies to resident individuals and companies
 *   - Exemption: annual gross rent ≤ KSH 288,000 (KSH 24,000/month)
 *
 * Withholding Tax on Contractor Payments (S35 Income Tax Act):
 *   - Resident contractors: 3%
 *   - Non-resident contractors: 20%
 *
 * VAT on Management/Service Fees:
 *   - 16% VAT if provider is VAT-registered
 *   - Threshold: annual turnover ≥ KSH 5,000,000
 *
 * Land Rates:
 *   - Nairobi: 0.115% of unimproved site value per annum
 *   - Mombasa: 0.10% - 0.20% per annum
 *   - Kisumu: 0.10% per annum
 *   - Others: county-specific, typically 0.05% - 0.20%
 *
 * Stamp Duty on Leases:
 *   - Leases ≤ 1 year: 0.5% of annual rent
 *   - Leases 1–3 years: 1% of annual rent
 *   - Leases > 3 years: 2% of annual rent
 */

export const MRI_ANNUAL_THRESHOLD = 288_000   // KSH — below this, no MRI tax
export const MRI_WITHHOLDING_RATE = 0.075     // 7.5%
export const WHT_RESIDENT_CONTRACTOR = 0.03   // 3%
export const WHT_NONRESIDENT_CONTRACTOR = 0.20 // 20%
export const VAT_RATE = 0.16                   // 16%
export const VAT_REGISTRATION_THRESHOLD = 5_000_000  // KSH annual turnover

export const LAND_RATES_BY_COUNTY: Record<string, number> = {
  nairobi: 0.00115,
  mombasa: 0.0015,
  kisumu: 0.001,
  nakuru: 0.001,
  eldoret: 0.001,
  thika: 0.001,
  default: 0.001,
}

// ─── MRI Tax ──────────────────────────────────────────────────────────────────

export interface MriTaxResult {
  grossMonthlyRent: number
  annualGrossRent: number
  mriTaxApplicable: boolean
  monthlyTax: number
  annualTax: number
  netMonthlyRent: number
  reason: string
}

export function calculateMriTax(monthlyRent: number): MriTaxResult {
  const annualGrossRent = monthlyRent * 12
  const mriTaxApplicable = annualGrossRent > MRI_ANNUAL_THRESHOLD
  const monthlyTax = mriTaxApplicable ? monthlyRent * MRI_WITHHOLDING_RATE : 0
  const annualTax = monthlyTax * 12

  return {
    grossMonthlyRent: monthlyRent,
    annualGrossRent,
    mriTaxApplicable,
    monthlyTax: Math.round(monthlyTax),
    annualTax: Math.round(annualTax),
    netMonthlyRent: Math.round(monthlyRent - monthlyTax),
    reason: mriTaxApplicable
      ? `Annual rent KSH ${annualGrossRent.toLocaleString()} exceeds threshold of KSH ${MRI_ANNUAL_THRESHOLD.toLocaleString()}. WHT at 7.5% applies.`
      : `Annual rent KSH ${annualGrossRent.toLocaleString()} is below the KSH ${MRI_ANNUAL_THRESHOLD.toLocaleString()} threshold. No MRI WHT applicable.`,
  }
}

// ─── Aggregate MRI across all properties ──────────────────────────────────────

export interface PropertyMriSummary {
  propertyId: string
  propertyName: string
  totalMonthlyRent: number
  taxableUnits: number
  exemptUnits: number
  totalMonthlyTax: number
  totalAnnualTax: number
}

export function calculatePropertyMri(
  propertyName: string,
  propertyId: string,
  units: { monthlyRent: number }[]
): PropertyMriSummary {
  let totalMonthlyRent = 0
  let totalMonthlyTax = 0
  let taxableUnits = 0
  let exemptUnits = 0

  for (const unit of units) {
    const result = calculateMriTax(unit.monthlyRent)
    totalMonthlyRent += unit.monthlyRent
    totalMonthlyTax += result.monthlyTax
    if (result.mriTaxApplicable) taxableUnits++
    else exemptUnits++
  }

  return {
    propertyId,
    propertyName,
    totalMonthlyRent: Math.round(totalMonthlyRent),
    taxableUnits,
    exemptUnits,
    totalMonthlyTax: Math.round(totalMonthlyTax),
    totalAnnualTax: Math.round(totalMonthlyTax * 12),
  }
}

// ─── Contractor WHT ───────────────────────────────────────────────────────────

export interface WhtResult {
  grossAmount: number
  whtRate: number
  whtAmount: number
  netPayable: number
  isResident: boolean
}

export function calculateContractorWht(grossAmount: number, isResident = true): WhtResult {
  const whtRate = isResident ? WHT_RESIDENT_CONTRACTOR : WHT_NONRESIDENT_CONTRACTOR
  const whtAmount = Math.round(grossAmount * whtRate)
  return {
    grossAmount,
    whtRate,
    whtAmount,
    netPayable: grossAmount - whtAmount,
    isResident,
  }
}

// ─── VAT ──────────────────────────────────────────────────────────────────────

export interface VatResult {
  netAmount: number
  vatAmount: number
  grossAmount: number
  vatApplicable: boolean
}

export function calculateVat(netAmount: number, vatRegistered: boolean): VatResult {
  const vatApplicable = vatRegistered
  const vatAmount = vatApplicable ? Math.round(netAmount * VAT_RATE) : 0
  return {
    netAmount,
    vatAmount,
    grossAmount: netAmount + vatAmount,
    vatApplicable,
  }
}

// ─── Land Rates ───────────────────────────────────────────────────────────────

export interface LandRateResult {
  unimprovedSiteValue: number
  county: string
  annualRate: number
  annualLandRate: number
  monthlyProvision: number
}

export function calculateLandRate(unimprovedSiteValue: number, county: string): LandRateResult {
  const normalised = county.toLowerCase().replace(/\s+/g, '')
  const annualRate = LAND_RATES_BY_COUNTY[normalised] ?? LAND_RATES_BY_COUNTY.default
  const annualLandRate = Math.round(unimprovedSiteValue * annualRate)
  return {
    unimprovedSiteValue,
    county,
    annualRate,
    annualLandRate,
    monthlyProvision: Math.round(annualLandRate / 12),
  }
}

// ─── Stamp Duty ───────────────────────────────────────────────────────────────

export interface StampDutyResult {
  annualRent: number
  leaseDurationYears: number
  stampDutyRate: number
  stampDutyAmount: number
}

export function calculateStampDuty(monthlyRent: number, leaseDurationMonths: number): StampDutyResult {
  const annualRent = monthlyRent * 12
  const leaseDurationYears = leaseDurationMonths / 12
  let stampDutyRate = 0.005  // 0.5% for ≤ 1 year
  if (leaseDurationYears > 3) stampDutyRate = 0.02
  else if (leaseDurationYears > 1) stampDutyRate = 0.01

  return {
    annualRent,
    leaseDurationYears,
    stampDutyRate,
    stampDutyAmount: Math.round(annualRent * stampDutyRate),
  }
}

// ─── Full annual tax summary ──────────────────────────────────────────────────

export interface AnnualTaxSummary {
  year: number
  grossRentCollected: number
  mriWhtOwed: number
  whtDeductedOnContractors: number
  landRatesPaid: number
  stampDutyPaid: number
  totalTaxLiability: number
  netIncome: number
}
