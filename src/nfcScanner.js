<<<<<<< HEAD
'use strict';

/**
 * MyZubster NFC Scanner + Verification Module
 *
 * Pure, deterministic helpers for scanning myzubster:nfc:v1: URIs,
 * decoding payloads, and verifying them against a registry record.
 *
 * Features:
 * - Scan & decode standard NFC URIs (myzubster:nfc:v1:)
 * - Scan & decode secure NFC URIs (myzubster:nfc-secure:v1:)
 * - Verify decoded payloads against a chain/registry provider
 * - Deterministic, no network I/O (chainProvider is injectable)
 * - Compatible with NFC hardware scanning (documented integration)
 */

const { decodeNfcTag, decodeSecureNfcTag, verifySecureNfcTag, NFC_URI_PREFIX, SECURE_NFC_URI_PREFIX } = require('./nfcTag');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCAN_STATUS = Object.freeze({
  /** Decoded payload matches registry record */
  VERIFIED: 'verified',
  /** Decoded payload fields differ from registry record */
  MISMATCH: 'mismatch',
  /** No registry record found for the claimed animalId */
  UNKNOWN_ANIMAL: 'unknown_animal',
  /** URI format is invalid or payload cannot be parsed */
  INVALID_URI: 'invalid_uri',
  /** URI uses unsupported or unknown schema */
  UNSUPPORTED_SCHEMA: 'unsupported_schema',
});

const COMPARED_FIELDS = Object.freeze([
=======
// MyZubster NFC Scanner + Verification module.
// Pure, deterministic helpers for decoding scanned myzubster:nfc:v1: URIs and
// verifying the decoded payload against a registry record. No network I/O, no
// wallet, no mainnet access. The "blockchain"/registry lookup is delegated to an
// injectable chainProvider so tests stay hermetic and no real chain is contacted.
'use strict';

const { decodeNfcTag } = require('./nfcTag');

const VERIFICATION_STATUS = Object.freeze({
  VERIFIED: 'verified',
  MISMATCH: 'mismatch',
  UNKNOWN_ANIMAL: 'unknown_animal',
  INVALID_PAYLOAD: 'invalid_payload',
});

const REQUIRED_PAYLOAD_FIELDS = ['schema', 'tagId', 'animalId', 'issuedAt', 'animal', 'registrant'];

// Fields compared between a decoded NFC payload and the registry record.
// [payloadPath, recordField, numeric]
const COMPARED_FIELDS = [
>>>>>>> origin
  ['tagId', 'nfcTagId', false],
  ['animalId', 'animalId', false],
  ['animal.species', 'species', false],
  ['animal.commonName', 'commonName', false],
  ['animal.animalType', 'animalType', false],
  ['animal.latitude', 'latitude', true],
  ['animal.longitude', 'longitude', true],
  ['registrant.xmrAddress', 'xmrAddress', false],
<<<<<<< HEAD
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPath(obj, dottedPath) {
  return dottedPath.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

// ---------------------------------------------------------------------------
// Scan result factory
// ---------------------------------------------------------------------------

function scanResult(valid, status, details = {}) {
  return { valid, status, ...details };
}

// ---------------------------------------------------------------------------
// URI detection & schema-based routing
// ---------------------------------------------------------------------------

/**
 * Detect which schema an NFC URI belongs to.
 * @param {string} uri
 * @returns {'standard'|'secure'|null}
 */
function detectSchema(uri) {
  if (typeof uri !== 'string') return null;
  if (uri.startsWith(NFC_URI_PREFIX)) return 'standard';
  if (uri.startsWith(SECURE_NFC_URI_PREFIX)) return 'secure';
  return null;
}

// ---------------------------------------------------------------------------
// Standard NFC tag verification (BOUNTY #2 core)
// ---------------------------------------------------------------------------

/**
 * Validate a decoded standard NFC payload has all required fields.
 * @param {object} decoded
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePayloadShape(decoded) {
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    return { valid: false, error: 'decoded NFC payload must be an object' };
  }
  if (decoded.schema !== 'myzubster.nfc-tag.v1') {
    return { valid: false, error: `unsupported NFC payload schema: ${decoded.schema}` };
  }
  const required = ['schema', 'tagId', 'animalId', 'issuedAt', 'animal', 'registrant'];
  for (const field of required) {
    if (decoded[field] === undefined || decoded[field] === null) {
      return { valid: false, error: `NFC payload missing required field: ${field}` };
    }
  }
  if (!decoded.animal || typeof decoded.animal !== 'object') {
    return { valid: false, error: 'NFC payload.animal must be an object' };
  }
  if (!decoded.registrant || typeof decoded.registrant !== 'object') {
    return { valid: false, error: 'NFC payload.registrant must be an object' };
  }
  if (typeof decoded.tagId !== 'string' || decoded.tagId.length === 0) {
    return { valid: false, error: 'NFC payload.tagId must be a non-empty string' };
  }
  if (typeof decoded.animalId !== 'string' || decoded.animalId.length === 0) {
    return { valid: false, error: 'NFC payload.animalId must be a non-empty string' };
  }
  return { valid: true };
}

/**
 * Compare decoded payload fields against a registry record.
 * @param {object} decoded - Decoded NFC payload
 * @param {object} record - Registry record
 * @returns {Array<{field: string, expected: any, actual: any}>}
 */
=======
];

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function assertObject(value, message) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
}

// In-memory chainProvider used by the CLI and as a test stub. Real integrations
// supply an object exposing getAnimalRecord(animalId) -> record | null.
function inMemoryChainProvider(records) {
  const map = records instanceof Map ? records : new Map(Object.entries(records || {}));
  return {
    getAnimalRecord(animalId) {
      return map.has(animalId) ? map.get(animalId) : null;
    },
  };
}

function validatePayloadShape(decoded) {
  assertObject(decoded, 'decoded NFC payload must be an object');
  for (const field of REQUIRED_PAYLOAD_FIELDS) {
    if (decoded[field] === undefined) {
      throw new Error(`NFC payload missing required field: ${field}`);
    }
  }
  if (decoded.schema !== 'myzubster.nfc-tag.v1') {
    throw new Error(`Unsupported NFC payload schema: ${decoded.schema}`);
  }
  assertObject(decoded.animal, 'NFC payload.animal must be an object');
  assertObject(decoded.registrant, 'NFC payload.registrant must be an object');
  if (!decoded.tagId || typeof decoded.tagId !== 'string') {
    throw new Error('NFC payload.tagId must be a non-empty string');
  }
  if (!decoded.animalId || typeof decoded.animalId !== 'string') {
    throw new Error('NFC payload.animalId must be a non-empty string');
  }
}

>>>>>>> origin
function compareFields(decoded, record) {
  const mismatches = [];
  for (const [payloadPath, recordField, numeric] of COMPARED_FIELDS) {
    const actual = getPath(decoded, payloadPath);
    const expected = record[recordField];
    const same = numeric
      ? Number(actual) === Number(expected) && Number.isFinite(Number(actual))
      : actual === expected;
    if (!same) {
      mismatches.push({ field: recordField, expected, actual });
    }
  }
  return mismatches;
}

<<<<<<< HEAD
/**
 * Verify a decoded NFC payload against a registry record.
 * @param {object} decoded - Parsed NFC payload data
 * @param {object} chainProvider - Object with getAnimalRecord(animalId) method
 * @returns {object} Verification result
 */
=======
>>>>>>> origin
function verifyNfcTag(decoded, chainProvider) {
  if (!chainProvider || typeof chainProvider.getAnimalRecord !== 'function') {
    throw new TypeError('chainProvider must expose getAnimalRecord(animalId)');
  }
<<<<<<< HEAD

  const shapeCheck = validatePayloadShape(decoded);
  if (!shapeCheck.valid) {
    return scanResult(false, SCAN_STATUS.INVALID_URI, {
      reason: shapeCheck.error,
      mismatches: [],
    });
  }

  const record = chainProvider.getAnimalRecord(decoded.animalId);
  if (!record) {
    return scanResult(false, SCAN_STATUS.UNKNOWN_ANIMAL, {
      reason: `no registry record found for animalId: ${decoded.animalId}`,
      mismatches: [],
    });
  }

  const mismatches = compareFields(decoded, record);
  if (mismatches.length > 0) {
    return scanResult(false, SCAN_STATUS.MISMATCH, {
      reason: `${mismatches.length} field mismatch(es) against registry record`,
      mismatches,
    });
  }

  return scanResult(true, SCAN_STATUS.VERIFIED, {
    reason: 'all compared fields match the registry record',
    mismatches: [],
    animalId: decoded.animalId,
    tagId: decoded.tagId,
  });
}

// ---------------------------------------------------------------------------
// Full scan pipeline: URI -> decode -> verify (BOUNTY #2)
// ---------------------------------------------------------------------------

/**
 * Full scan pipeline: scan a URI, decode it, and verify against chainProvider.
 * Handles both standard (nfc:v1) and secure (nfc-secure:v1) URIs.
 *
 * @param {string} uri - Scanned NFC URI
 * @param {object} chainProvider - Registry lookup provider
 * @param {object} [options] - Verification options
 * @param {string} [options.publicKey] - Required for secure URIs, the issuer's public key
 * @returns {object} Scan result
 */
function scanAndVerify(uri, chainProvider, options = {}) {
  // --- Step 1: Detect schema ---
  const schema = detectSchema(uri);
  if (!schema) {
    return scanResult(false, SCAN_STATUS.INVALID_URI, {
      reason: 'URI does not match any known MyZubster NFC schema',
      uri,
    });
  }

  // --- Step 2: Decode ---
  let decoded;
  try {
    if (schema === 'standard') {
      decoded = decodeNfcTag(uri);
    } else {
      // secure: first verify crypto, then decrypt
      if (!options.publicKey) {
        return scanResult(false, SCAN_STATUS.INVALID_URI, {
          reason: 'publicKey is required to verify secure NFC tags',
        });
      }
      const cryptoCheck = verifySecureNfcTag(uri, { publicKey: options.publicKey });
      if (!cryptoCheck.valid) {
        return scanResult(false, SCAN_STATUS.MISMATCH, {
          reason: `secure NFC tag verification failed: ${cryptoCheck.reason}`,
          mismatches: [],
        });
      }
      // For scan-only, return envelope info; full decryption requires privateKey
      const envelope = decodeSecureNfcTag(uri);
      return scanResult(true, SCAN_STATUS.VERIFIED, {
        reason: 'secure NFC tag cryptographic verification passed',
        mismatches: [],
        animalId: envelope.animalId,
        tagId: envelope.tagId,
        schema: 'secure',
        encrypted: true,
      });
    }
  } catch (error) {
    return scanResult(false, SCAN_STATUS.INVALID_URI, {
      reason: `failed to decode NFC URI: ${error.message}`,
      uri,
    });
  }

  // --- Step 3: Verify against registry ---
  return verifyNfcTag(decoded, chainProvider);
}

/**
 * In-memory chain provider for testing and CLI usage.
 * @param {Map|object} records
 * @returns {{ getAnimalRecord: function }}
 */
function inMemoryChainProvider(records) {
  const map = records instanceof Map ? records : new Map(Object.entries(records || {}));
  return {
    getAnimalRecord(animalId) {
      return map.has(animalId) ? map.get(animalId) : null;
    },
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Constants
  SCAN_STATUS,
  COMPARED_FIELDS,

  // Core API
  detectSchema,
  validatePayloadShape,
  compareFields,
  verifyNfcTag,
  scanAndVerify,

  // Providers
  inMemoryChainProvider,
=======
  try {
    validatePayloadShape(decoded);
  } catch (error) {
    return {
      valid: false,
      status: VERIFICATION_STATUS.INVALID_PAYLOAD,
      reason: error.message,
      mismatches: [],
    };
  }
  const record = chainProvider.getAnimalRecord(decoded.animalId);
  if (!record) {
    return {
      valid: false,
      status: VERIFICATION_STATUS.UNKNOWN_ANIMAL,
      reason: `no registry record for animalId ${decoded.animalId}`,
      mismatches: [],
    };
  }
  const mismatches = compareFields(decoded, record);
  if (mismatches.length > 0) {
    return {
      valid: false,
      status: VERIFICATION_STATUS.MISMATCH,
      reason: `${mismatches.length} field mismatch(es) against registry record`,
      mismatches,
    };
  }
  return {
    valid: true,
    status: VERIFICATION_STATUS.VERIFIED,
    reason: 'all compared fields match the registry record',
    mismatches: [],
  };
}

// One-shot convenience: decode a scanned URI then verify against the registry.
function decodeAndVerify(uri, chainProvider) {
  let decoded;
  try {
    decoded = decodeNfcTag(uri);
  } catch (error) {
    return {
      valid: false,
      status: VERIFICATION_STATUS.INVALID_PAYLOAD,
      reason: error.message,
      mismatches: [],
    };
  }
  return verifyNfcTag(decoded, chainProvider);
}

module.exports = {
  VERIFICATION_STATUS,
  REQUIRED_PAYLOAD_FIELDS,
  COMPARED_FIELDS,
  inMemoryChainProvider,
  validatePayloadShape,
  compareFields,
  verifyNfcTag,
  decodeAndVerify,
>>>>>>> origin
};
