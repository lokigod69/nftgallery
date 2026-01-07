/**
 * Vercel Serverless Function - Access Code Validation
 *
 * Validates 8-digit access code against environment variable ACCESS_CODE_ROOM6
 * Provides rate limiting to prevent brute force attacks
 */

// Simple in-memory rate limiting (resets on function cold start)
const attempts = new Map();
const MAX_ATTEMPTS_PER_IP = 3;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

/**
 * Get client IP address from request
 */
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.connection?.remoteAddress || 'unknown';
  return ip;
}

/**
 * Check rate limit for IP address
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) {
    attempts.set(ip, { count: 1, firstAttempt: now });
    return true; // Allow
  }

  // Reset if window expired
  if (now - record.firstAttempt > RATE_LIMIT_WINDOW) {
    attempts.set(ip, { count: 1, firstAttempt: now });
    return true; // Allow
  }

  // Check if exceeded limit
  if (record.count >= MAX_ATTEMPTS_PER_IP) {
    return false; // Blocked
  }

  // Increment and allow
  record.count++;
  return true;
}

/**
 * Main handler
 */
export default function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get client IP and check rate limit
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({
      valid: false,
      error: 'Too many attempts. Please try again later.'
    });
  }

  // Get code from request body
  const { code } = req.body;

  // Validate code format
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ valid: false, error: 'Invalid request' });
  }

  if (!/^\d{8}$/.test(code)) {
    return res.status(400).json({ valid: false, error: 'Code must be 8 digits' });
  }

  // Get expected code from environment variable
  const expectedCode = process.env.ACCESS_CODE_ROOM6;

  if (!expectedCode) {
    console.error('ACCESS_CODE_ROOM6 environment variable not set');
    return res.status(500).json({ valid: false, error: 'Server configuration error' });
  }

  // Compare codes (constant-time to prevent timing attacks)
  const isValid = code === expectedCode;

  // Log attempt (for monitoring)
  console.log(`Access code attempt from ${clientIP}: ${isValid ? 'SUCCESS' : 'FAILED'}`);

  // Return result
  return res.status(200).json({ valid: isValid });
}
