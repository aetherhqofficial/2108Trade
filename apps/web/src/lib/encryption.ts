// ── AES-256-GCM Encryption Utility ──
// Handles encryption and decryption of sensitive data (broker API credentials)
// using the ENCRYPTION_KEY environment variable.
//
// Key format: 64-char hex string → 32 bytes (AES-256).
// Generate with: openssl rand -hex 32

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// ── Constants ────────────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits (GCM auth tag)
const KEY_LENGTH = 32; // 256 bits
const KEY_HEX_LENGTH = 64; // 32 bytes × 2 hex chars

// ── Types ────────────────────────────────────────────────────────────────

/** Raw encryption result, everything base64-encoded. */
export interface EncryptedPayload {
  encrypted: string; // base64 ciphertext
  iv: string; // base64 initialization vector
  tag: string; // base64 authentication tag
  keyVersion: number;
}

/** JSON-serialized wrapper stored in the database. */
export interface EncryptedCredentialsWrapper {
  v: number; // key version
  d: string; // base64 ciphertext
  i: string; // base64 IV
  t: string; // base64 auth tag
}

// ── Key Management ───────────────────────────────────────────────────────

let _encryptionKey: Buffer | null = null;
let _encryptionKeyValidated = false;

/**
 * Returns the AES-256 encryption key from ENCRYPTION_KEY env var.
 * Validates format on first call. Caches the key for subsequent use.
 *
 * Throws if the key is missing, wrong length, or otherwise invalid.
 */
export function getEncryptionKey(): Buffer {
  if (_encryptionKey) return _encryptionKey;

  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex || keyHex.trim() === "") {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
        "Generate one with: openssl rand -hex 32",
    );
  }

  if (keyHex.length !== KEY_HEX_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly ${KEY_HEX_LENGTH} hex characters ` +
        `(32 bytes). Got ${keyHex.length} characters.`,
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error(
      "ENCRYPTION_KEY must contain only hexadecimal characters (0-9, a-f, A-F).",
    );
  }

  _encryptionKey = Buffer.from(keyHex, "hex");

  // Extra safety: ensure we got exactly 32 bytes
  if (_encryptionKey.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY decoded to ${_encryptionKey.length} bytes, expected ${KEY_LENGTH}.`,
    );
  }

  _encryptionKeyValidated = true;
  return _encryptionKey;
}

/**
 * Returns true if the encryption key has been loaded and validated.
 * Safe to call before crypto operations.
 */
export function isEncryptionKeyReady(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

// ── Core Crypto ──────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The data to encrypt.
 * @param key - 32-byte AES-256 key.
 * @returns Encrypted payload with base64-encoded fields.
 */
export function encrypt(
  plaintext: string,
  key: Buffer,
): EncryptedPayload {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    keyVersion: 1, // current version; increment on key rotation
  };
}

/**
 * Decrypts ciphertext using AES-256-GCM.
 *
 * @param encrypted - Base64-encoded ciphertext.
 * @param iv - Base64-encoded initialization vector.
 * @param tag - Base64-encoded authentication tag.
 * @param key - 32-byte AES-256 key.
 * @returns Decrypted plaintext string.
 */
export function decrypt(
  encrypted: string,
  iv: string,
  tag: string,
  key: Buffer,
): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

// ── Credential Helpers ───────────────────────────────────────────────────

/**
 * Encrypts broker API credentials and returns a JSON string suitable
 * for storing in the `encryptedApiCredentials` database column.
 *
 * The wrapper format includes the key version for future key rotation support.
 *
 * @param plaintext - Credentials as a JSON string (e.g. `{"apiKey":"...","apiSecret":"..."}`).
 * @returns JSON string with encrypted payload and metadata.
 */
export function encryptApiCredentials(plaintext: string): string {
  const key = getEncryptionKey();
  const payload = encrypt(plaintext, key);

  const wrapper: EncryptedCredentialsWrapper = {
    v: payload.keyVersion,
    d: payload.encrypted,
    i: payload.iv,
    t: payload.tag,
  };

  return JSON.stringify(wrapper);
}

/**
 * Decrypts broker API credentials previously encrypted with `encryptApiCredentials`.
 *
 * @param wrapper - JSON string from the `encryptedApiCredentials` database column.
 * @returns Decrypted credentials as a string.
 */
export function decryptApiCredentials(wrapper: string): string {
  const key = getEncryptionKey();

  let parsed: EncryptedCredentialsWrapper;
  try {
    parsed = JSON.parse(wrapper) as EncryptedCredentialsWrapper;
  } catch {
    throw new Error(
      "Failed to parse encrypted credentials wrapper: invalid JSON.",
    );
  }

  if (!parsed.v || !parsed.d || !parsed.i || !parsed.t) {
    throw new Error(
      "Invalid encrypted credentials format: missing required fields.",
    );
  }

  // Future: when key rotation is implemented, select the key by parsed.v
  return decrypt(parsed.d, parsed.i, parsed.t, key);
}

/**
 * Masks an API credential for safe display.
 * Shows only the last 4 characters, prefixed with asterisks.
 *
 * @param credential - The raw API key or secret.
 * @returns Masked string like "****abcd".
 */
export function maskCredential(credential: string): string {
  if (credential.length <= 4) return "****";
  return "****" + credential.slice(-4);
}
