// Test script to verify JWT token creation and verification
const { SignJWT, jwtVerify } = require('jose');

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
);

async function testAuth() {
  console.log('Testing JWT auth...\n');

  // Create a token
  const token = await new SignJWT({
    userId: "test-user-id",
    email: "test@example.com",
    role: "ADMIN",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  console.log('Token created:', token.substring(0, 50) + '...\n');

  // Verify the token
  try {
    const { payload } = await jwtVerify(token, secret);
    console.log('Token verified successfully!');
    console.log('Payload:', payload);
  } catch (error) {
    console.error('Token verification failed:', error.message);
  }
}

testAuth();
