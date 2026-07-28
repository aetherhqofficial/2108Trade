// ── MFA (TOTP-based Multi-Factor Authentication) ──
// Minimal TOTP implementation using Node.js crypto (no external deps).
// Supports generating secrets, verifying codes, and backup codes.

import { createHmac, randomBytes } from "node:crypto";

// ── Constants ────────────────────────────────────────────────────────────

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_EPOCH = 0; // Unix epoch
const BACKUP_CODE_LENGTH = 8;

// ── Base32 Encoding ──────────────────────────────────────────────────────

function base32Encode(buffer: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return result;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

// ── TOTP Core ────────────────────────────────────────────────────────────

/**
 * Generate a TOTP code for the current time window.
 */
function generateTOTPCode(secret: Buffer, timeStep: number): string {
  // 8-byte big-endian counter
  const counter = Buffer.alloc(8);
  counter.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = createHmac("sha1", secret).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const code = binary % 10 ** TOTP_DIGITS;
  return code.toString().padStart(TOTP_DIGITS, "0");
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Generate a new TOTP secret and associated data for MFA setup.
 * Returns the secret, the otpauth:// URI, and a data URI QR code placeholder.
 */
export function generateTOTPSecret(issuer = "2108Trade", account = "user"): {
  secret: string;
  uri: string;
  qrCode: string;
} {
  const secretBuffer = randomBytes(20); // 160 bits for SHA-1
  const secret = base32Encode(secretBuffer);
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(account);
  const uri = `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;

  // QR code as a data URI using the Google Charts API
  const qrCode = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(uri)}`;

  return { secret, uri, qrCode };
}

/**
 * Verify a TOTP token against a secret.
 * Accepts tokens from the current or adjacent time windows (±1 step)
 * to account for clock drift.
 */
export function verifyTOTP(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;

  let secretBuffer: Buffer;
  try {
    secretBuffer = base32Decode(secret);
  } catch {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor((now - TOTP_EPOCH) / TOTP_PERIOD);

  // Check current and adjacent windows
  for (let offset = -1; offset <= 1; offset++) {
    const expected = generateTOTPCode(secretBuffer, currentStep + offset);
    if (expected === token) return true;
  }

  return false;
}

/**
 * Generate backup codes for MFA recovery.
 * Each code is an 8-character random hex string.
 */
export function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(randomBytes(4).toString("hex"));
  }
  return codes;
}
