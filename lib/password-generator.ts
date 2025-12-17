/**
 * Generate a secure template password for new users
 * Format: Makeja{Random4Digits}! (e.g., Makeja8274!)
 * 
 * This password:
 * - Is easy to communicate (verbally or via SMS)
 * - Has reasonable security (capital letter, numbers, special char)
 * - Forces users to change it on first login
 */
export function generateTemplatePassword(): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  return `Makeja${randomDigits}!`;
}

/**
 * Format template password for display in emails/SMS
 * Returns object with formatted strings
 */
export function formatPasswordMessage(password: string) {
  return {
    email: `Your temporary password is: ${password}\n\nYou will be required to change this password on your first login.`,
    sms: `Your Makeja Homes login password: ${password}. Change it on first login.`,
    display: password,
  };
}

/**
 * Validate that a password meets minimum requirements
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a random strong password (for admins who want system-generated)
 * Format: Capital + 10 chars mix + special char
 */
export function generateStrongPassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";

  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one of each type
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly (total 12 characters)
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}
