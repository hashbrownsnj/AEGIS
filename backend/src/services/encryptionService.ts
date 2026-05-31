/**
 * ─────────────────────────────────────────────────────────────────
 *  AEGIS — Field-Level Encryption at Rest
 * ─────────────────────────────────────────────────────────────────
 *
 *  Strategy: AES-256-GCM authenticated encryption for PII fields
 *  stored in MongoDB.  Each encrypted value is stored as a compact
 *  JSON string containing: iv (base64), authTag (base64), ciphertext
 *  (base64), and a key-version label so keys can be rotated without
 *  a full re-encrypt pass.
 *
 *  Usage (schema plugin)
 *  ─────────────────────
 *  Import `encryptionPlugin` and call `.plugin(encryptionPlugin, {
 *    fields: ['fullName', 'mrn', ...]
 *  })` on any Mongoose schema whose fields contain PII.
 *
 *  Key management
 *  ──────────────
 *  FIELD_ENCRYPTION_KEY  – 64 hex chars → 32-byte AES-256 key
 *  FIELD_ENCRYPTION_KEY_ID – optional label (default "v1")
 *
 *  For key rotation: add new key as FIELD_ENCRYPTION_KEY_NEXT.
 *  Run the migration helper `reEncryptCollection()` offline, then
 *  promote NEXT to current and retire the old key.
 *
 *  IMPORTANT: This adds application-layer encryption on top of —
 *  not instead of — MongoDB Atlas Encryption at Rest (server-side).
 *  Use both in production. See DEPLOY.md for Atlas configuration.
 * ─────────────────────────────────────────────────────────────────
 */

import crypto from "crypto";
import type { Schema } from "mongoose";

// ── Key loading ────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm" as const;
const IV_BYTES   = 12;  // 96-bit IV — recommended for GCM
const TAG_BYTES  = 16;  // 128-bit auth tag

function loadKeyFromEnv(envVar: string): Buffer | null {
  const raw = process.env[envVar];
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length !== 64) {
    throw new Error(
      `[Encryption] ${envVar} must be exactly 64 hex characters (32 bytes). ` +
      `Got ${trimmed.length} chars. Generate with: ` +
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  return Buffer.from(trimmed, "hex");
}

const ACTIVE_KEY_ID  = process.env.FIELD_ENCRYPTION_KEY_ID?.trim() || "v1";
const ACTIVE_KEY     = loadKeyFromEnv("FIELD_ENCRYPTION_KEY");

/** Keys indexed by key-id, used during decryption to support rotation */
const keyring: Record<string, Buffer> = {};
if (ACTIVE_KEY) keyring[ACTIVE_KEY_ID] = ACTIVE_KEY;

// Accept a secondary key for rotation migrations
const NEXT_KEY_ID = process.env.FIELD_ENCRYPTION_KEY_NEXT_ID?.trim();
const NEXT_KEY    = loadKeyFromEnv("FIELD_ENCRYPTION_KEY_NEXT");
if (NEXT_KEY && NEXT_KEY_ID) keyring[NEXT_KEY_ID] = NEXT_KEY;

// ── Encrypted-value envelope ───────────────────────────────────────

export interface EncryptedEnvelope {
  _enc: true;        // marker — lets us skip already-encrypted values
  kid: string;       // key-id for rotation
  iv: string;        // base64
  tag: string;       // base64 auth tag
  ct: string;        // base64 ciphertext
}

function isEnvelope(value: unknown): value is EncryptedEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as EncryptedEnvelope)._enc === true
  );
}

// ── Core encrypt / decrypt ─────────────────────────────────────────

/**
 * Encrypts a plain string with AES-256-GCM.
 * Returns the compact JSON envelope string stored in MongoDB.
 */
export function encryptField(plaintext: string): string {
  if (!ACTIVE_KEY) {
    throw new Error(
      "[Encryption] FIELD_ENCRYPTION_KEY is not set. " +
      "Cannot encrypt sensitive fields. Add it to your .env file."
    );
  }

  const iv         = crypto.randomBytes(IV_BYTES);
  const cipher     = crypto.createCipheriv(ALGORITHM, ACTIVE_KEY, iv, { authTagLength: TAG_BYTES });
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag    = cipher.getAuthTag();

  const envelope: EncryptedEnvelope = {
    _enc: true,
    kid:  ACTIVE_KEY_ID,
    iv:   iv.toString("base64"),
    tag:  authTag.toString("base64"),
    ct:   ciphertext.toString("base64"),
  };

  return JSON.stringify(envelope);
}

/**
 * Decrypts an envelope JSON string.
 * Falls back gracefully if the value is plain text (migration path).
 */
export function decryptField(stored: string): string {
  // ── 1. Attempt JSON parse ─────────────────────────────────────
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    // Not JSON → legacy plain-text value stored before encryption was
    // enabled.  Return as-is so migrations can re-encrypt gradually.
    return stored;
  }

  // ── 2. If it's not an envelope, return raw ────────────────────
  if (!isEnvelope(parsed)) return stored;

  // ── 3. Look up the key by kid ─────────────────────────────────
  const key = keyring[parsed.kid];
  if (!key) {
    throw new Error(
      `[Encryption] No key found for key-id "${parsed.kid}". ` +
      "Check FIELD_ENCRYPTION_KEY_ID or add the old key as FIELD_ENCRYPTION_KEY_NEXT."
    );
  }

  const iv         = Buffer.from(parsed.iv,  "base64");
  const authTag    = Buffer.from(parsed.tag, "base64");
  const ciphertext = Buffer.from(parsed.ct,  "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  decipher.setAuthTag(authTag);

  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    throw new Error(
      "[Encryption] GCM authentication failed — data may have been tampered with, " +
      "or the wrong key is being used."
    );
  }
}

// ── Mongoose schema plugin ─────────────────────────────────────────

export interface EncryptionPluginOptions {
  /** Field paths to encrypt/decrypt automatically on save/load */
  fields: string[];
}

/**
 * Mongoose plugin that transparently encrypts listed string fields
 * before saving and decrypts them after loading.
 *
 * Example:
 * ```ts
 * PatientSchema.plugin(encryptionPlugin, {
 *   fields: ['fullName', 'mrn', 'allergies']
 * });
 * ```
 */
export function encryptionPlugin(
  schema: Schema,
  options: EncryptionPluginOptions
): void {
  if (!options?.fields?.length) return;
  const { fields } = options;

  // ── Pre-save: encrypt ─────────────────────────────────────────
  schema.pre("save", function (next) {
    for (const field of fields) {
      const value = (this as Record<string, unknown>)[field];
      if (typeof value === "string") {
        try {
          // Don't double-encrypt
          const parsed = JSON.parse(value);
          if (isEnvelope(parsed)) { continue; }
        } catch { /* not JSON — proceed to encrypt */ }
        (this as Record<string, unknown>)[field] = encryptField(value);
      }
      // Handle string arrays (e.g. allergies, symptoms)
      if (Array.isArray(value)) {
        (this as Record<string, unknown>)[field] = value.map((item: unknown) => {
          if (typeof item !== "string") return item;
          try {
            const parsed = JSON.parse(item);
            if (isEnvelope(parsed)) return item;
          } catch { /* not JSON */ }
          return encryptField(item);
        });
      }
    }
    next();
  });

  // ── Post-load: decrypt (find, findOne, etc.) ──────────────────
  const decryptDoc = (doc: Record<string, unknown>) => {
    if (!doc) return;
    for (const field of fields) {
      const value = doc[field];
      if (typeof value === "string") {
        try { doc[field] = decryptField(value); } catch { /* leave as-is */ }
      }
      if (Array.isArray(value)) {
        doc[field] = value.map((item: unknown) =>
          typeof item === "string" ? (() => { try { return decryptField(item); } catch { return item; } })() : item
        );
      }
    }
  };

  schema.post("find", function (docs: Record<string, unknown>[]) {
    docs?.forEach(decryptDoc);
  });
  schema.post("findOne", function (doc: Record<string, unknown>) {
    decryptDoc(doc);
  });
  schema.post("findOneAndUpdate", function (doc: Record<string, unknown>) {
    decryptDoc(doc);
  });
}

// ── Encryption health check ────────────────────────────────────────

export function checkEncryptionConfig(): void {
  if (!ACTIVE_KEY) {
    console.warn(
      "\n⚠️  [AEGIS Encryption] FIELD_ENCRYPTION_KEY is not set.\n" +
      "   PII fields will be stored in plain text.\n" +
      "   Generate a key: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n" +
      "   Then add FIELD_ENCRYPTION_KEY=<64-hex-chars> to your .env\n"
    );
  } else {
    // Self-test: encrypt then decrypt a known string
    const probe = "AEGIS_SELFTEST_" + Date.now();
    const enc   = encryptField(probe);
    const dec   = decryptField(enc);
    if (dec !== probe) throw new Error("[Encryption] Self-test FAILED — enc/dec round-trip mismatch");
    console.log(`✓  [AEGIS Encryption] AES-256-GCM active (key-id: ${ACTIVE_KEY_ID})`);
  }
}
