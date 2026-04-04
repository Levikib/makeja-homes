/**
 * Server-side input sanitization utilities.
 * Used to strip potentially dangerous characters from free-text fields
 * before persisting to the database or rendering in emails.
 *
 * Prisma's parameterized queries protect against SQL injection; this layer
 * guards against stored XSS when content is later rendered in HTML contexts
 * (e.g., email templates, PDFs).
 */

/** Strip HTML tags and null bytes from a string value */
export function sanitizeText(value: unknown, maxLength = 1000): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\x00/g, "")          // null bytes
    .replace(/<[^>]*>/g, "")        // HTML tags
    .replace(/javascript:/gi, "")   // JS protocol in attribute context
    .replace(/on\w+\s*=/gi, "")     // inline event handlers
    .trim()
    .slice(0, maxLength);
}

/** Sanitize an optional string — returns undefined if the value is absent or empty */
export function sanitizeOptional(value: unknown, maxLength = 1000): string | undefined {
  if (value == null) return undefined;
  const s = sanitizeText(value, maxLength);
  return s.length > 0 ? s : undefined;
}

/** Validate and return a positive number, throwing if invalid */
export function sanitizeAmount(value: unknown, fieldName = "amount"): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid ${fieldName}: must be a non-negative number`);
  }
  return Math.round(n * 100) / 100; // round to 2 decimal places
}

/** Validate a date string — returns a Date or throws */
export function sanitizeDate(value: unknown, fieldName = "date"): Date {
  if (!value) throw new Error(`${fieldName} is required`);
  const d = new Date(value as string);
  if (isNaN(d.getTime())) throw new Error(`Invalid ${fieldName}`);
  return d;
}

/** Validate an enum value against an allowed set */
export function sanitizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName = "value"
): T {
  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid ${fieldName}: must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}
