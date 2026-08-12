const assert = require('node:assert/strict');
const test = require('node:test');
const {
  registerAnimalWithNfc,
  encodeNfcTag,
  NFC_URI_PREFIX,
} = require('../src/nfcTag');
const {
  VERIFICATION_STATUS,
  inMemoryChainProvider,
  verifyNfcTag,
  decodeAndVerify,
  compareFields,
} = require('../src/nfcScanner');

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

const FIXED = {
  registeredAt: '2026-07-29T08:00:00.000Z',
  issuedAt: '2026-07-29T08:00:00.000Z',
  randomBytes: Buffer.from('1234567890abcdef1234', 'hex'),
};

function setup() {
  const result = registerAnimalWithNfc(validRegistration, FIXED);
  const provider = inMemoryChainProvider(new Map([[result.animal.animalId, result.animal]]));
  return { result, provider, uri: result.nfcTag.uri };
}

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
  const { result } = setup();
  const decoded = encodeNfcTag(validRegistration, FIXED).payload;
  const record = { ...result.animal, latitude: '41.9028' };
  const mismatches = compareFields(decoded, record);
  assert.ok(!mismatches.some((m) => m.field === 'latitude'), 'string-vs-number latitude should not mismatch');
});
