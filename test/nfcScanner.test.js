<<<<<<< HEAD
'use strict';

=======
>>>>>>> origin
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  registerAnimalWithNfc,
  encodeNfcTag,
  NFC_URI_PREFIX,
<<<<<<< HEAD
  SECURE_NFC_URI_PREFIX,
} = require('../src/nfcTag');
const {
  SCAN_STATUS,
  detectSchema,
  validatePayloadShape,
  compareFields,
  verifyNfcTag,
  scanAndVerify,
  inMemoryChainProvider,
} = require('../src/nfcScanner');

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

=======
} = require('../src/nfcTag');
const {
  VERIFICATION_STATUS,
  inMemoryChainProvider,
  verifyNfcTag,
  decodeAndVerify,
  compareFields,
} = require('../src/nfcScanner');

>>>>>>> origin
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
<<<<<<< HEAD
  xmr_address:
    '48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA',
=======
  xmr_address: '48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA',
>>>>>>> origin
};

const FIXED = {
  registeredAt: '2026-07-29T08:00:00.000Z',
  issuedAt: '2026-07-29T08:00:00.000Z',
  randomBytes: Buffer.from('1234567890abcdef1234', 'hex'),
};

<<<<<<< HEAD
/** Helper: register an animal and build a chainProvider with it */
=======
>>>>>>> origin
function setup() {
  const result = registerAnimalWithNfc(validRegistration, FIXED);
  const provider = inMemoryChainProvider(new Map([[result.animal.animalId, result.animal]]));
  return { result, provider, uri: result.nfcTag.uri };
}

<<<<<<< HEAD
/** Helper: create a forged URI with a different tagId */
function forgeUri(originalUri, overrides = {}) {
  const decoded = JSON.parse(
    Buffer.from(originalUri.slice(NFC_URI_PREFIX.length), 'base64url').toString('utf8')
  );
  Object.assign(decoded, overrides);
  return NFC_URI_PREFIX + Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
}

// ---------------------------------------------------------------------------
// detectSchema
// ---------------------------------------------------------------------------

test('detectSchema identifies standard NFC URI', () => {
  const { uri } = setup();
  assert.equal(detectSchema(uri), 'standard');
});

test('detectSchema returns null for non-NFC URIs', () => {
  assert.equal(detectSchema('https://example.com'), null);
  assert.equal(detectSchema('myzubster:other:v1:data'), null);
  assert.equal(detectSchema(''), null);
  assert.equal(detectSchema(null), null);
  assert.equal(detectSchema(undefined), null);
  assert.equal(detectSchema(123), null);
});

test('detectSchema identifies secure NFC URI', () => {
  assert.equal(detectSchema(`${SECURE_NFC_URI_PREFIX}abc`), 'secure');
});

// ---------------------------------------------------------------------------
// validatePayloadShape
// ---------------------------------------------------------------------------

test('validatePayloadShape accepts valid decoded payload', () => {
  const { uri } = setup();
  const encoded = uri.slice(NFC_URI_PREFIX.length);
  const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  const result = validatePayloadShape(decoded);
  assert.equal(result.valid, true);
});

test('validatePayloadShape rejects non-object', () => {
  assert.equal(validatePayloadShape(null).valid, false);
  assert.equal(validatePayloadShape('string').valid, false);
  assert.equal(validatePayloadShape([]).valid, false);
});

test('validatePayloadShape rejects unsupported schema', () => {
  assert.equal(validatePayloadShape({ schema: 'myzubster.old.v1' }).valid, false);
});

test('validatePayloadShape rejects missing required fields', () => {
  const result = validatePayloadShape({ schema: 'myzubster.nfc-tag.v1', tagId: 'x' });
  assert.equal(result.valid, false);
  assert.match(result.error, /missing required field: animalId/);
});

// ---------------------------------------------------------------------------
// compareFields
// ---------------------------------------------------------------------------

test('compareFields returns empty for matching fields', () => {
  const { result, uri } = setup();
  const encoded = uri.slice(NFC_URI_PREFIX.length);
  const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  const mismatches = compareFields(decoded, result.animal);
  assert.equal(mismatches.length, 0);
});

test('compareFields detects species mismatch', () => {
  const { result } = setup();
  const decoded = encodeNfcTag(validRegistration, FIXED).payload;
  const mismatches = compareFields(decoded, { ...result.animal, species: 'Felis catus' });
  assert.ok(mismatches.some((m) => m.field === 'species'));
});

test('compareFields treats numeric latitude by value, not type', () => {
=======
test('verifies a freshly encoded NFC tag against the registry record', () => {
  const { provider, uri } = setup();
  const outcome = decodeAndVerify(uri, provider);
  assert.equal(outcome.valid, true);
  assert.equal(outcome.status, VERIFICATION_STATUS.VERIFIED);
  assert.equal(outcome.mismatches.length, 0);
  assert.match(outcome.reason, /match the registry record/);
});

test('reports mismatch when a registry field was edited after issuance', () => {
  const { result, provider } = setup();
  const tampered = { ...result.animal, species: 'Felis catus' };
  provider.getAnimalRecord = (id) => (id === tampered.animalId ? tampered : null);
  const outcome = decodeAndVerify(result.nfcTag.uri, provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, VERIFICATION_STATUS.MISMATCH);
  assert.ok(outcome.mismatches.some((m) => m.field === 'species' && m.expected === 'Felis catus'));
});

test('reports unknown_animal when animalId is not in the registry', () => {
  const { result, uri } = setup();
  const emptyProvider = inMemoryChainProvider(new Map());
  const decoded = JSON.parse(Buffer.from(uri.slice(NFC_URI_PREFIX.length), 'base64url').toString('utf8'));
  decoded.animalId = 'animal_does_not_exist';
  const forgedUri =
    NFC_URI_PREFIX + Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
  const outcome = decodeAndVerify(forgedUri, emptyProvider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, VERIFICATION_STATUS.UNKNOWN_ANIMAL);
  assert.match(outcome.reason, /no registry record/);
});

test('reports mismatch when nfcTagId differs from the registry record', () => {
  const { result, provider, uri } = setup();
  const decoded = JSON.parse(Buffer.from(uri.slice(NFC_URI_PREFIX.length), 'base64url').toString('utf8'));
  decoded.tagId = 'mzar_nfc_aaaaaaaaaaaaaaaaaaaaaa';
  const forgedUri =
    NFC_URI_PREFIX + Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
  const outcome = decodeAndVerify(forgedUri, provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, VERIFICATION_STATUS.MISMATCH);
  assert.ok(outcome.mismatches.some((m) => m.field === 'nfcTagId'));
});

test('rejects URIs that are not myzubster NFC URIs', () => {
  const provider = inMemoryChainProvider(new Map());
  const outcome = decodeAndVerify('https://example.com/not-an-nfc-uri', provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, VERIFICATION_STATUS.INVALID_PAYLOAD);
  assert.match(outcome.reason, /Invalid MyZubster NFC URI/);
});

test('rejects malformed base64url payloads with invalid_payload status', () => {
  const provider = inMemoryChainProvider(new Map());
  const outcome = decodeAndVerify(`${NFC_URI_PREFIX}@@@@not-base64url@@@@`, provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, VERIFICATION_STATUS.INVALID_PAYLOAD);
});

test('validatePayloadShape via verifyNfcTag rejects payloads missing animal block', () => {
  const provider = inMemoryChainProvider(new Map());
  const decoded = { schema: 'myzubster.nfc-tag.v1', tagId: 'mzar_nfc_x', animalId: 'animal_a', issuedAt: '2026-07-29T08:00:00.000Z' };
  const outcome = verifyNfcTag(decoded, provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, VERIFICATION_STATUS.INVALID_PAYLOAD);
  assert.match(outcome.reason, /missing required field/);
});

test('throws when chainProvider is missing getAnimalRecord', () => {
  const decoded = registerAnimalWithNfc(validRegistration, FIXED);
  assert.throws(() => verifyNfcTag({}, {}), /getAnimalRecord/);
});

test('compareFields treats numeric latitude/longitude by value, not identity', () => {
>>>>>>> origin
  const { result } = setup();
  const decoded = encodeNfcTag(validRegistration, FIXED).payload;
  const record = { ...result.animal, latitude: '41.9028' };
  const mismatches = compareFields(decoded, record);
<<<<<<< HEAD
  assert.equal(mismatches.filter((m) => m.field === 'latitude').length, 0);
});

test('compareFields detects xmrAddress mismatch', () => {
  const { result } = setup();
  const decoded = encodeNfcTag(validRegistration, FIXED).payload;
  const mismatches = compareFields(decoded, { ...result.animal, xmrAddress: '4' });
  assert.ok(mismatches.some((m) => m.field === 'xmrAddress'));
});

// ---------------------------------------------------------------------------
// verifyNfcTag
// ---------------------------------------------------------------------------

test('verifyNfcTag returns VERIFIED for fresh tag against own record', () => {
  const { provider, uri } = setup();
  const encoded = uri.slice(NFC_URI_PREFIX.length);
  const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  const outcome = verifyNfcTag(decoded, provider);
  assert.equal(outcome.valid, true);
  assert.equal(outcome.status, SCAN_STATUS.VERIFIED);
  assert.equal(outcome.mismatches.length, 0);
  assert.ok(outcome.animalId);
  assert.ok(outcome.tagId);
});

test('verifyNfcTag throws when chainProvider lacks getAnimalRecord', () => {
  const { uri } = setup();
  const encoded = uri.slice(NFC_URI_PREFIX.length);
  const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  assert.throws(() => verifyNfcTag(decoded, {}), /getAnimalRecord/);
  assert.throws(() => verifyNfcTag(decoded, null), /getAnimalRecord/);
});

test('verifyNfcTag returns INVALID_URI for malformed payload', () => {
  const provider = inMemoryChainProvider(new Map());
  const outcome = verifyNfcTag({ schema: 'myzubster.nfc-tag.v1' }, provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, SCAN_STATUS.INVALID_URI);
});

test('verifyNfcTag returns UNKNOWN_ANIMAL for missing record', () => {
  const provider = inMemoryChainProvider(new Map());
  const { uri } = setup();
  const encoded = uri.slice(NFC_URI_PREFIX.length);
  const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  decoded.animalId = 'animal_nonexistent';
  const outcome = verifyNfcTag(decoded, provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, SCAN_STATUS.UNKNOWN_ANIMAL);
});

test('verifyNfcTag returns MISMATCH for edited record', () => {
  const { result, provider } = setup();
  const decoded = encodeNfcTag(validRegistration, FIXED).payload;
  const tamperedRecord = { ...result.animal, commonName: 'Changed' };
  provider.getAnimalRecord = () => tamperedRecord;
  const outcome = verifyNfcTag(decoded, provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, SCAN_STATUS.MISMATCH);
  assert.ok(outcome.mismatches.length > 0);
});

// ---------------------------------------------------------------------------
// scanAndVerify (full pipeline)
// ---------------------------------------------------------------------------

test('scanAndVerify verifies valid standard URI end-to-end', () => {
  const { provider, uri } = setup();
  const outcome = scanAndVerify(uri, provider);
  assert.equal(outcome.valid, true);
  assert.equal(outcome.status, SCAN_STATUS.VERIFIED);
});

test('scanAndVerify returns INVALID_URI for non-NFC URI', () => {
  const provider = inMemoryChainProvider(new Map());
  const outcome = scanAndVerify('https://evil.com/phish', provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, SCAN_STATUS.INVALID_URI);
});

test('scanAndVerify returns INVALID_URI for malformed base64 payload', () => {
  const provider = inMemoryChainProvider(new Map());
  const outcome = scanAndVerify(`${NFC_URI_PREFIX}!!!not-base64!!!`, provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, SCAN_STATUS.INVALID_URI);
});

test('scanAndVerify detects unknown animal after URI tampering', () => {
  const { provider, uri } = setup();
  const tamperedUri = forgeUri(uri, { animalId: 'animal_nonexistent' });
  const outcome = scanAndVerify(tamperedUri, provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, SCAN_STATUS.UNKNOWN_ANIMAL);
});

test('scanAndVerify detects tagId mismatch', () => {
  const { provider, uri } = setup();
  const tamperedUri = forgeUri(uri, { tagId: 'mzar_nfc_aaaaaaaaaaaaaaaaaaaaaa' });
  const outcome = scanAndVerify(tamperedUri, provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, SCAN_STATUS.MISMATCH);
});

test('scanAndVerify returns INVALID_URI when payload has missing fields', () => {
  const provider = inMemoryChainProvider(new Map());
  // Valid base64 of empty JSON
  const emptyJsonUri = NFC_URI_PREFIX + Buffer.from('{"schema":"myzubster.nfc-tag.v1"}', 'utf8').toString('base64url');
  const outcome = scanAndVerify(emptyJsonUri, provider);
  assert.equal(outcome.valid, false);
  assert.equal(outcome.status, SCAN_STATUS.INVALID_URI);
});

// ---------------------------------------------------------------------------
// inMemoryChainProvider
// ---------------------------------------------------------------------------

test('inMemoryChainProvider returns record by animalId', () => {
  const { result } = setup();
  const provider = inMemoryChainProvider({ [result.animal.animalId]: result.animal });
  assert.deepEqual(provider.getAnimalRecord(result.animal.animalId), result.animal);
  assert.equal(provider.getAnimalRecord('nonexistent'), null);
});

test('inMemoryChainProvider accepts Map directly', () => {
  const { result } = setup();
  const map = new Map([[result.animal.animalId, result.animal]]);
  const provider = inMemoryChainProvider(map);
  assert.deepEqual(provider.getAnimalRecord(result.animal.animalId), result.animal);
=======
  assert.ok(!mismatches.some((m) => m.field === 'latitude'), 'string-vs-number latitude should not mismatch');
>>>>>>> origin
});
