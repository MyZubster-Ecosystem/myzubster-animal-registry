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
  ['tagId', 'nfcTagId', false],
  ['animalId', 'animalId', false],
  ['animal.species', 'species', false],
  ['animal.commonName', 'commonName', false],
  ['animal.animalType', 'animalType', false],
  ['animal.latitude', 'latitude', true],
  ['animal.longitude', 'longitude', true],
  ['registrant.xmrAddress', 'xmrAddress', false],
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

function verifyNfcTag(decoded, chainProvider) {
  if (!chainProvider || typeof chainProvider.getAnimalRecord !== 'function') {
    throw new TypeError('chainProvider must expose getAnimalRecord(animalId)');
  }
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
};
