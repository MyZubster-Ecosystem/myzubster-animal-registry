const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const Sim = require(path.resolve(__dirname, '..', 'web', 'simulator.js'));
const NodeNfc = require(path.resolve(__dirname, '..', 'src', 'nfcTag.js'));

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

test('simulator: normalizes registration from snake_case form', () => {
  const norm = Sim.normalizeAnimalRegistration(validRegistration);
  assert.equal(norm.species, 'Canis lupus familiaris');
  assert.equal(norm.commonName, 'Dog');
  assert.equal(norm.animalType, 'pet');
  assert.match(norm.animalId, /^animal_[a-f0-9]{16}$/);
});

test('simulator: generates mzar_nfc_ tag IDs with the same shape as src/nfcTag.js', () => {
  const tagId = Sim.generateNfcTagId(validRegistration, {
    issuedAt: '2026-07-29T08:00:00.000Z',
    randomBytes: Buffer.from('1234567890abcdef1234', 'hex'),
  });
  assert.match(tagId, /^mzar_nfc_[a-f0-9]{24}$/);
});

test('simulator: produces URI compatible with src/nfcTag.js decoder', () => {
  const sim = Sim.encodeNfcTag(validRegistration, {
    issuedAt: '2026-07-29T08:00:00.000Z',
    randomBytes: Buffer.from('1234567890abcdef1234', 'hex'),
  });
  // The Node library should be able to decode a simulator-generated URI
  // and return the same payload object (modulo tagId/animalId if randomized).
  const decoded = NodeNfc.decodeNfcTag(sim.uri);
  assert.equal(decoded.schema, 'myzubster.nfc-tag.v1');
  assert.equal(decoded.tagId, sim.tagId);
  assert.equal(decoded.animalId, sim.animalId);
  assert.equal(decoded.animal.commonName, 'Dog');
});

test('simulator: decodes its own URI round-trip', () => {
  const sim = Sim.encodeNfcTag(validRegistration);
  const decoded = Sim.decodeNfcTag(sim.uri);
  assert.equal(decoded.schema, 'myzubster.nfc-tag.v1');
  assert.equal(decoded.tagId, sim.tagId);
  assert.equal(decoded.animal.species, 'Canis lupus familiaris');
  assert.equal(decoded.registrant.xmrAddress, validRegistration.xmr_address);
});

test('simulator: simulateScan returns verification metadata', () => {
  const scan = Sim.simulateScan(validRegistration, {
    device: 'Test device',
    issuedAt: '2026-07-29T08:00:00.000Z',
    randomBytes: Buffer.from('abcdefabcdefabcdefabcd', 'hex'),
  });
  assert.equal(scan.device, 'Test device');
  assert.ok(scan.uri.startsWith(Sim.NFC_URI_PREFIX));
  assert.equal(scan.verification.schemaOk, true);
  assert.equal(scan.verification.roundTripOk, true);
  assert.equal(scan.verification.payloadMatches, true);
});

test('simulator: simulateVerification reports matches=true with matching expected', () => {
  const result = Sim.simulateVerification(validRegistration);
  assert.equal(result.matches, true);
  assert.equal(result.scannedAnimalId, result.expectedAnimalId);
});

test('simulator: simulateVerification reports matches=false with tampered expected', () => {
  const result = Sim.simulateVerification(validRegistration, {
    expected: {
      tagId: 'mzar_nfc_aaaaaaaaaaaaaaaaaaaaaaaa',
      animalId: 'animal_bbbbbbbbbbbbbbbb',
      schema: 'myzubster.nfc-tag.v1',
    },
  });
  assert.equal(result.matches, false);
});

test('simulator: rejects invalid latitude', () => {
  assert.throws(
    () => Sim.normalizeAnimalRegistration({ ...validRegistration, latitude: 120 }),
    /latitude must be between -90 and 90/
  );
});

test('simulator: rejects invalid animalType', () => {
  assert.throws(
    () =>
      Sim.normalizeAnimalRegistration({ ...validRegistration, animal_type: 'alien' }),
    /animalType must be one of/
  );
});

test('simulator: rejects missing required field', () => {
  const bad = { ...validRegistration };
  delete bad.species;
  assert.throws(
    () => Sim.normalizeAnimalRegistration(bad),
    /species is required/
  );
});

test('simulator: rejects malformed XMR address', () => {
  assert.throws(
    () =>
      Sim.normalizeAnimalRegistration({ ...validRegistration, xmr_address: 'not-xmr' }),
    /xmrAddress must be a valid Monero address/
  );
});

test('simulator: accept subaddress starting with 8', () => {
  const sub = {
    ...validRegistration,
    xmr_address:
      '8k7tnUcfZA6QTAWoSv8XpdhnMDR7XZX8Xr16wnQnTUXt16aSHdZ887GuehMj1Gd5VinVEAWhHyy3YYXaGFsDzCps1TDmMsp',
  };
  const norm = Sim.normalizeAnimalRegistration(sub);
  assert.match(norm.xmrAddress, /^8/);
});

test('simulator: sha256 of empty string matches FIPS 180-4 vector', () => {
  // FIPS 180-4 B.1: SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  // The simulator exposes its internal sha256Pure for testing.
  assert.equal(Sim._sha256Pure(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('simulator: sha256 of "abc" matches FIPS 180-4 vector', () => {
  // FIPS 180-4 B.2: SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
  assert.equal(Sim._sha256Pure('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('simulator: pure-JS SHA-256 matches Node crypto for realistic input', () => {
  // Cross-check the pure-JS implementation against Node's built-in crypto.
  const crypto = require('node:crypto');
  const inputs = [
    'animal_aabbccddeeff0011|2026-07-29T08:00:00.000Z|1234567890abcdef1234',
    'myzubster:nfc:v1:test',
    JSON.stringify({ schema: 'myzubster.nfc-tag.v1', tagId: 'x', animalId: 'y' }),
  ];
  for (const inp of inputs) {
    const expected = crypto.createHash('sha256').update(inp).digest('hex');
    const actual = Sim._sha256Pure(inp);
    assert.equal(actual, expected, 'SHA-256 mismatch for ' + JSON.stringify(inp.slice(0, 40)));
  }
});
