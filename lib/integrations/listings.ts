/**
 * Property Listings Integration
 *
 * Auto-pushes vacant units to Kenyan property portals when a unit becomes vacant.
 * Pulls down listings when a unit is occupied.
 *
 * Supported portals:
 *   - Jumia House (Lamudi Kenya) — REST API
 *   - BuyRentKenya — REST API
 *   - PropertyPro Kenya — REST API
 *
 * Note: All three portals have partner/developer APIs. You need a partner account
 * with each to get API keys. The integration is ready — just plug in the keys.
 */

export interface ListingPortalConfig {
  jumiaHouse?: { apiKey: string; agencyId: string; enabled: boolean }
  buyRentKenya?: { apiKey: string; agentId: string; enabled: boolean }
  propertyPro?: { apiKey: string; agentEmail: string; enabled: boolean }
}

export interface UnitListing {
  externalId: string       // our unit ID — used to track and pull listings
  title: string
  description: string
  propertyName: string
  address: string
  city: string
  unitNumber: string
  unitType: string         // e.g. "BEDSITTER", "1BR", "2BR", "3BR", "STUDIO"
  rentAmount: number
  currency: string         // "KES"
  bedrooms: number
  bathrooms: number
  sizeSqm?: number
  amenities: string[]
  images: string[]         // public URLs
  availableFrom: string    // ISO date
  contactPhone?: string
  contactEmail?: string
}

export interface ListingResult {
  portal: string
  success: boolean
  listingId?: string
  listingUrl?: string
  error?: string
}

// ── Jumia House (Lamudi Kenya) ────────────────────────────────────────────

async function pushToJumiaHouse(
  config: NonNullable<ListingPortalConfig['jumiaHouse']>,
  unit: UnitListing
): Promise<ListingResult> {
  try {
    const res = await fetch('https://www.jumia.com.ng/api/v1/listings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agency_id: config.agencyId,
        external_id: unit.externalId,
        title: unit.title,
        description: unit.description,
        property_type: 'apartment',
        listing_type: 'rent',
        price: unit.rentAmount,
        currency: unit.currency,
        location: { address: unit.address, city: unit.city, country: 'Kenya' },
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        size: unit.sizeSqm,
        amenities: unit.amenities,
        images: unit.images.map((url, i) => ({ url, order: i })),
        available_from: unit.availableFrom,
        contact: { phone: unit.contactPhone, email: unit.contactEmail },
      }),
    })
    const data = await res.json()
    if (!res.ok) return { portal: 'Jumia House', success: false, error: data.message ?? `HTTP ${res.status}` }
    return { portal: 'Jumia House', success: true, listingId: data.id, listingUrl: data.url }
  } catch (e: any) {
    return { portal: 'Jumia House', success: false, error: e.message }
  }
}

async function removeFromJumiaHouse(
  config: NonNullable<ListingPortalConfig['jumiaHouse']>,
  externalId: string
): Promise<void> {
  await fetch(`https://www.jumia.com.ng/api/v1/listings/${externalId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${config.apiKey}` },
  })
}

// ── BuyRentKenya ─────────────────────────────────────────────────────────

async function pushToBuyRentKenya(
  config: NonNullable<ListingPortalConfig['buyRentKenya']>,
  unit: UnitListing
): Promise<ListingResult> {
  try {
    const res = await fetch('https://www.buyrentkenya.com/api/listings', {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: config.agentId,
        ref: unit.externalId,
        headline: unit.title,
        description: unit.description,
        category: 'apartments-flats',
        transaction: 'rent',
        price: unit.rentAmount,
        currency: 'KES',
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        floor_area: unit.sizeSqm,
        location: { town: unit.city, address: unit.address },
        features: unit.amenities,
        photos: unit.images,
        available_date: unit.availableFrom,
        contact: { telephone: unit.contactPhone, email: unit.contactEmail },
      }),
    })
    const data = await res.json()
    if (!res.ok) return { portal: 'BuyRentKenya', success: false, error: data.error ?? `HTTP ${res.status}` }
    return { portal: 'BuyRentKenya', success: true, listingId: data.listing_id, listingUrl: data.listing_url }
  } catch (e: any) {
    return { portal: 'BuyRentKenya', success: false, error: e.message }
  }
}

async function removeFromBuyRentKenya(
  config: NonNullable<ListingPortalConfig['buyRentKenya']>,
  externalId: string
): Promise<void> {
  await fetch(`https://www.buyrentkenya.com/api/listings/${externalId}`, {
    method: 'DELETE',
    headers: { 'X-API-Key': config.apiKey },
  })
}

// ── PropertyPro Kenya ─────────────────────────────────────────────────────

async function pushToPropertyPro(
  config: NonNullable<ListingPortalConfig['propertyPro']>,
  unit: UnitListing
): Promise<ListingResult> {
  try {
    const res = await fetch('https://www.propertypro.co.ke/api/v2/properties', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_email: config.agentEmail,
        ref_no: unit.externalId,
        property_name: unit.title,
        description: unit.description,
        property_type: 'Apartment',
        offer_type: 'For Rent',
        price: unit.rentAmount,
        price_currency: 'KES',
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        size: unit.sizeSqm ? `${unit.sizeSqm} sqm` : undefined,
        state: 'Kenya',
        city: unit.city,
        address: unit.address,
        amenities: unit.amenities,
        images: unit.images,
        available_from: unit.availableFrom,
        contact_name: unit.propertyName,
        contact_phone: unit.contactPhone,
        contact_email: unit.contactEmail,
      }),
    })
    const data = await res.json()
    if (!res.ok) return { portal: 'PropertyPro', success: false, error: data.detail ?? `HTTP ${res.status}` }
    return { portal: 'PropertyPro', success: true, listingId: data.id, listingUrl: data.url }
  } catch (e: any) {
    return { portal: 'PropertyPro', success: false, error: e.message }
  }
}

async function removeFromPropertyPro(
  config: NonNullable<ListingPortalConfig['propertyPro']>,
  externalId: string
): Promise<void> {
  await fetch(`https://www.propertypro.co.ke/api/v2/properties/${externalId}`, {
    method: 'DELETE',
    headers: { Authorization: `Token ${config.apiKey}` },
  })
}

// ── Public API ────────────────────────────────────────────────────────────

export async function pushListingToPortals(
  config: ListingPortalConfig,
  unit: UnitListing
): Promise<ListingResult[]> {
  const tasks: Promise<ListingResult>[] = []

  if (config.jumiaHouse?.enabled) tasks.push(pushToJumiaHouse(config.jumiaHouse, unit))
  if (config.buyRentKenya?.enabled) tasks.push(pushToBuyRentKenya(config.buyRentKenya, unit))
  if (config.propertyPro?.enabled) tasks.push(pushToPropertyPro(config.propertyPro, unit))

  if (!tasks.length) return [{ portal: 'none', success: false, error: 'No listing portals are enabled' }]
  return Promise.all(tasks)
}

export async function removeListingFromPortals(
  config: ListingPortalConfig,
  externalId: string
): Promise<void> {
  const tasks: Promise<void>[] = []
  if (config.jumiaHouse?.enabled) tasks.push(removeFromJumiaHouse(config.jumiaHouse, externalId))
  if (config.buyRentKenya?.enabled) tasks.push(removeFromBuyRentKenya(config.buyRentKenya, externalId))
  if (config.propertyPro?.enabled) tasks.push(removeFromPropertyPro(config.propertyPro, externalId))
  await Promise.allSettled(tasks)
}

// Helper: build a listing object from Makeja data
export function buildUnitListing(params: {
  unitId: string
  unitNumber: string
  unitType: string
  bedrooms: number
  bathrooms: number
  sizeSqm?: number
  rentAmount: number
  propertyName: string
  propertyAddress: string
  propertyCity: string
  amenities?: string[]
  images?: string[]
  contactPhone?: string
  contactEmail?: string
}): UnitListing {
  const typeLabel: Record<string, string> = {
    BEDSITTER: 'Bedsitter',
    STUDIO: 'Studio',
    ONE_BR: '1 Bedroom',
    TWO_BR: '2 Bedroom',
    THREE_BR: '3 Bedroom',
    FOUR_BR: '4 Bedroom',
    PENTHOUSE: 'Penthouse',
  }
  const label = typeLabel[params.unitType] ?? params.unitType

  return {
    externalId: params.unitId,
    title: `${label} for Rent — ${params.propertyName}, Unit ${params.unitNumber}`,
    description: `Modern ${label.toLowerCase()} available for rent at ${params.propertyName}. Located at ${params.propertyAddress}, ${params.propertyCity}. Rent: KES ${params.rentAmount.toLocaleString()}/month.`,
    propertyName: params.propertyName,
    address: params.propertyAddress,
    city: params.propertyCity,
    unitNumber: params.unitNumber,
    unitType: params.unitType,
    rentAmount: params.rentAmount,
    currency: 'KES',
    bedrooms: params.bedrooms,
    bathrooms: params.bathrooms,
    sizeSqm: params.sizeSqm,
    amenities: params.amenities ?? [],
    images: params.images ?? [],
    availableFrom: new Date().toISOString().split('T')[0],
    contactPhone: params.contactPhone,
    contactEmail: params.contactEmail,
  }
}
