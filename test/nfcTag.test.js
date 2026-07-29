const assert = require('node:assert/strict');
const test = require('node:test');
const {
  NFC_URI_PREFIX,
  SECURE_NFC_URI_PREFIX,
  createSecureNfcTag,
  decodeNfcTag,
  decodeSecureNfcTag,
  decryptSecureNfcTag,
  encodeNfcTag,
  generateNfcSecurityKeyPair,
  generateNfcTagId,
  normalizeAnimalRegistration,
  registerAnimalWithSecureNfc,
  registerAnimalWithNfc,
  verifySecureNfcTag,
} = require('../src/nfcTag');

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
  xmr_address: '48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA',
};
const securityKeys = generateNfcSecurityKeyPair();

function fixedSecurityOptions() {
  return {
    publicKey: securityKeys.publicKey,
    privateKey: securityKeys.privateKey,
    issuedAt: '2026-07-29T08:00:00.000Z',
    randomBytes: Buffer.from('1234567890abcdef1234', 'hex'),
    aesKey: Buffer.alloc(32, 1),
    iv: Buffer.alloc(12, 2),
  };
}

function encodeSecureEnvelope(envelope) {
  return `${SECURE_NFC_URI_PREFIX}${Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url')}`;
}

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

test('encrypts NFC tag data and verifies anti-counterfeit signature', () => {
  const secureTag = createSecureNfcTag(validRegistration, fixedSecurityOptions());
  const envelope = decodeSecureNfcTag(secureTag.uri);
  const verification = verifySecureNfcTag(secureTag.uri, { publicKey: securityKeys.publicKey });
  const decrypted = decryptSecureNfcTag(secureTag.uri, securityKeys);

  assert.ok(secureTag.uri.startsWith(SECURE_NFC_URI_PREFIX));
  assert.equal(secureTag.uri.includes('Dog'), false);
  assert.equal(envelope.schema, 'myzubster.nfc-secure-tag.v1');
  assert.equal(envelope.encryption.keyAlg, 'RSA-OAEP-SHA256');
  assert.equal(envelope.encryption.contentAlg, 'AES-256-GCM');
  assert.equal(envelope.antiCounterfeit.signatureAlg, 'RSA-SHA256');
  assert.equal(verification.valid, true);
  assert.equal(decrypted.tagId, secureTag.tagId);
  assert.equal(decrypted.animal.commonName, 'Dog');
});

test('rejects counterfeit secure NFC tags', () => {
  const secureTag = createSecureNfcTag(validRegistration, fixedSecurityOptions());
  const envelope = decodeSecureNfcTag(secureTag.uri);
  const counterfeitUri = encodeSecureEnvelope({
    ...envelope,
    animalId: 'animal_tampered',
  });
  const verification = verifySecureNfcTag(counterfeitUri, { publicKey: securityKeys.publicKey });

  assert.equal(verification.valid, false);
  assert.match(verification.reason, /fingerprint|signature/);
  assert.throws(() => decryptSecureNfcTag(counterfeitUri, securityKeys), /fingerprint|signature/);
});

test('integrates secure NFC generation with animal registration', () => {
  const result = registerAnimalWithSecureNfc(validRegistration, {
    ...fixedSecurityOptions(),
    registeredAt: '2026-07-29T08:00:00.000Z',
  });
  const verification = verifySecureNfcTag(result.nfcTag.uri, { publicKey: securityKeys.publicKey });

  assert.equal(result.animal.status, 'pending_verification');
  assert.equal(result.animal.nfcSecurity, 'encrypted_signed');
  assert.equal(result.animal.nfcTagId, result.nfcTag.tagId);
  assert.equal(verification.valid, true);
});
