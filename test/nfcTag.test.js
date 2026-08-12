'use strict';

const crypto = require('crypto');
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  NFC_URI_PREFIX,
  SECURE_NFC_URI_PREFIX,
  createSecureNfcTag,
  decodeNfcTag,
  decodeSecureNfcTag,
  decryptPayload,
  decryptSecureNfcTag,
  encodeNfcTag,
  encryptPayload,
  generateNfcTagId,
  generateSecureKeyPair,
  normalizeAnimalRegistration,
  registerAnimalWithNfc,
  registerAnimalWithSecureNfc,
  verifySecureNfcTag,
} = require('../src/nfcTag');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validRegistration = {
  species: 'Canis lupus familiaris',
  common_name: 'Dog',
  animal_type: 'pet',
  latitude: 41.9028,
  longitude: 12.4964,
  age: 3,
  weight: 25,
  description: 'Friendly dog in the park',
  photos: ['https://example.com/photo1.jpg'],
  xmr_address:
    '48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA',
};

// Fixed values for deterministic tests
const FIXED = {
  issuedAt: '2026-07-29T08:00:00.000Z',
  randomBytes: Buffer.from('1234567890abcdef1234', 'hex'),
};

// ECDH/ECDSA key pair for secure tag tests
const keyPair = generateSecureKeyPair();

function fixedSecureOptions() {
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    ...FIXED,
    // Deterministic ephemeral key for reproducible encryption
    ephemeralPrivateKey: generateSecureKeyPair().privateKey,
  };
}

function encodeSecureEnvelope(envelope) {
  return `${SECURE_NFC_URI_PREFIX}${Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url')}`;
}

// ---------------------------------------------------------------------------
// Standard NFC Tag Tests
// ---------------------------------------------------------------------------

test('normalizes registration data from API-style field names', () => {
  const normalized = normalizeAnimalRegistration(validRegistration);

  assert.equal(normalized.species, 'Canis lupus familiaris');
  assert.equal(normalized.commonName, 'Dog');
  assert.equal(normalized.animalType, 'pet');
  assert.equal(normalized.latitude, 41.9028);
  assert.equal(normalized.xmrAddress, validRegistration.xmr_address);
  assert.match(normalized.animalId, /^animal_[a-f0-9]{16}$/);
});

test('generates stable-format NFC tag IDs', () => {
  const tagId = generateNfcTagId(validRegistration, {
    issuedAt: '2026-07-29T08:00:00.000Z',
    randomBytes: Buffer.from('1234567890abcdef1234', 'hex'),
  });

  assert.match(tagId, /^mzar_nfc_[a-f0-9]{24}$/);
});

test('encodes and decodes NFC tag payloads', () => {
  const nfcTag = encodeNfcTag(validRegistration, {
    issuedAt: '2026-07-29T08:00:00.000Z',
    randomBytes: Buffer.from('1234567890abcdef1234', 'hex'),
  });
  const decoded = decodeNfcTag(nfcTag.uri);

  assert.ok(nfcTag.uri.startsWith(NFC_URI_PREFIX));
  assert.equal(decoded.schema, 'myzubster.nfc-tag.v1');
  assert.equal(decoded.tagId, nfcTag.tagId);
  assert.equal(decoded.animal.commonName, 'Dog');
  assert.equal(decoded.registrant.xmrAddress, validRegistration.xmr_address);
});

test('integrates NFC tag generation with animal registration status', () => {
  const result = registerAnimalWithNfc(validRegistration, {
    registeredAt: '2026-07-29T08:00:00.000Z',
    issuedAt: '2026-07-29T08:00:00.000Z',
    randomBytes: Buffer.from('1234567890abcdef1234', 'hex'),
  });

  assert.equal(result.animal.status, 'pending_verification');
  assert.equal(result.animal.nfcTagId, result.nfcTag.tagId);
  assert.equal(result.animal.createdAt, '2026-07-29T08:00:00.000Z');
});

test('rejects invalid registration data', () => {
  assert.throws(
    () => normalizeAnimalRegistration({ ...validRegistration, latitude: 120 }),
    /latitude must be between -90 and 90/
  );
  assert.throws(
    () => normalizeAnimalRegistration({ ...validRegistration, xmr_address: 'not-xmr' }),
    /xmrAddress must be a valid Monero address/
  );
});

// ---------------------------------------------------------------------------
// Secure NFC Tag Tests (BOUNTY #3)
// ---------------------------------------------------------------------------

test('generates ECDH P-256 key pair', () => {
  const keys = generateSecureKeyPair();
  assert.ok(keys.publicKey.includes('BEGIN PUBLIC KEY'));
  assert.ok(keys.privateKey.includes('BEGIN PRIVATE KEY'));

  // Verify the key can be used for ECDH
  const pub = crypto.createPublicKey(keys.publicKey);
  const priv = crypto.createPrivateKey(keys.privateKey);
  assert.equal(pub.type, 'public');
  assert.equal(priv.type, 'private');
});

test('encrypts and decrypts NFC payload with ECDH + AES-256-GCM', () => {
  const payload = { hello: 'world', num: 42 };

  const encrypted = encryptPayload(payload, keyPair.publicKey);
  assert.ok(encrypted.ephemeralPublicKey);
  assert.ok(encrypted.ciphertext);
  assert.ok(encrypted.iv);
  assert.ok(encrypted.authTag);
  assert.ok(encrypted.salt);

  const decrypted = decryptPayload(encrypted, keyPair.privateKey);
  assert.deepEqual(decrypted, payload);
});

test('creates and decodes secure NFC tag with encryption', () => {
  const secureTag = createSecureNfcTag(validRegistration, fixedSecureOptions());
  const envelope = decodeSecureNfcTag(secureTag.uri);

  assert.ok(secureTag.uri.startsWith(SECURE_NFC_URI_PREFIX));
  assert.equal(envelope.schema, 'myzubster.nfc-secure-tag.v1');
  assert.equal(envelope.encryption.keyAlg, 'ECDH-P256');
  assert.equal(envelope.encryption.contentAlg, 'AES-256-GCM');
  assert.equal(envelope.antiCounterfeit.signatureAlg, 'ECDSA-P256-SHA256');
  assert.ok(envelope.antiCounterfeit.fingerprint);
  assert.ok(envelope.antiCounterfeit.signature);

  // Verify ciphertext doesn't leak plaintext
  assert.equal(secureTag.uri.includes('Dog'), false);
});

test('secure NFC tag: verify anti-counterfeit signature succeeds', () => {
  const secureTag = createSecureNfcTag(validRegistration, fixedSecureOptions());
  const verification = verifySecureNfcTag(secureTag.uri, { publicKey: keyPair.publicKey });
  assert.equal(verification.valid, true);
  assert.equal(verification.tagId, secureTag.tagId);
  assert.equal(verification.animalId, secureTag.animalId);
});

test('secure NFC tag: decrypt after verification returns original payload', () => {
  const secureTag = createSecureNfcTag(validRegistration, fixedSecureOptions());
  const decrypted = decryptSecureNfcTag(secureTag.uri, keyPair);

  assert.equal(decrypted.schema, 'myzubster.nfc-tag.v1');
  assert.equal(decrypted.tagId, secureTag.tagId);
  assert.equal(decrypted.animal.commonName, 'Dog');
});

test('secure NFC tag: rejects counterfeit (tampered animalId)', () => {
  const secureTag = createSecureNfcTag(validRegistration, fixedSecureOptions());
  const envelope = decodeSecureNfcTag(secureTag.uri);
  const counterfeitUri = encodeSecureEnvelope({
    ...envelope,
    animalId: 'animal_tampered',
  });
  const verification = verifySecureNfcTag(counterfeitUri, { publicKey: keyPair.publicKey });
  assert.equal(verification.valid, false);
  assert.match(verification.reason, /fingerprint/);

  // Decryption should also fail
  assert.throws(
    () => decryptSecureNfcTag(counterfeitUri, keyPair),
    /fingerprint|signature/
  );
});

test('secure NFC tag: rejects forged signature', () => {
  const secureTag = createSecureNfcTag(validRegistration, fixedSecureOptions());
  const envelope = decodeSecureNfcTag(secureTag.uri);
  const forged = {
    ...envelope,
    antiCounterfeit: {
      ...envelope.antiCounterfeit,
      signature: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  };
  const forgedUri = encodeSecureEnvelope(forged);
  const verification = verifySecureNfcTag(forgedUri, { publicKey: keyPair.publicKey });
  assert.equal(verification.valid, false);
});

test('secure NFC tag: full registration integration', () => {
  const result = registerAnimalWithSecureNfc(validRegistration, {
    ...fixedSecureOptions(),
    registeredAt: '2026-07-29T08:00:00.000Z',
  });
  const verification = verifySecureNfcTag(result.nfcTag.uri, { publicKey: keyPair.publicKey });

  assert.equal(result.animal.status, 'pending_verification');
  assert.equal(result.animal.nfcSecurity, 'encrypted_signed');
  assert.equal(result.animal.nfcTagId, result.nfcTag.tagId);
  assert.equal(verification.valid, true);
});

test('secure NFC tag: throws if publicKey is missing', () => {
  assert.throws(
    () => createSecureNfcTag(validRegistration, { privateKey: keyPair.privateKey }),
    /publicKey/
  );
});

test('secure NFC tag: throws if privateKey is missing', () => {
  assert.throws(
    () => createSecureNfcTag(validRegistration, { publicKey: keyPair.publicKey }),
    /privateKey/
  );
});
