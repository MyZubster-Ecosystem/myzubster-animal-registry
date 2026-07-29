const crypto = require('crypto');

const DEFAULT_REGISTRY_URL = 'https://registry.myzubster.com/animals';
const NFC_URI_PREFIX = 'myzubster:nfc:v1:';
const REQUIRED_FIELDS = ['species', 'commonName', 'animalType', 'latitude', 'longitude', 'xmrAddress'];
const VALID_ANIMAL_TYPES = new Set(['pet', 'livestock', 'wildlife', 'aquatic', 'insect']);
const XMR_ADDRESS_PATTERN = /^[48][1-9A-HJ-NP-Za-km-z]{94,105}$/;

function toCamelCaseRegistration(input = {}) {
  return {
    animalId: input.animalId || input.animal_id || input.id,
    species: input.species,
    commonName: input.commonName || input.common_name,
    animalType: input.animalType || input.animal_type,
    latitude: input.latitude,
    longitude: input.longitude,
    age: input.age,
    weight: input.weight,
    description: input.description,
    photos: input.photos || [],
    xmrAddress: input.xmrAddress || input.xmr_address,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeNumber(value, fieldName) {
  const parsed = Number(value);
  assert(Number.isFinite(parsed), `${fieldName} must be a valid number`);
  return parsed;
}

function generateAnimalId(registration) {
  const seed = [
    registration.species,
    registration.commonName || registration.common_name,
    registration.animalType || registration.animal_type,
    registration.latitude,
    registration.longitude,
    Date.now(),
    crypto.randomBytes(8).toString('hex'),
  ].join('|');

  return `animal_${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16)}`;
}

function normalizeAnimalRegistration(input) {
  const registration = toCamelCaseRegistration(input);

  for (const field of REQUIRED_FIELDS) {
    assert(registration[field] !== undefined && registration[field] !== '', `${field} is required`);
  }

  const animalType = String(registration.animalType).trim().toLowerCase();
  const latitude = normalizeNumber(registration.latitude, 'latitude');
  const longitude = normalizeNumber(registration.longitude, 'longitude');
  const photos = Array.isArray(registration.photos) ? registration.photos.filter(Boolean) : [];

  assert(latitude >= -90 && latitude <= 90, 'latitude must be between -90 and 90');
  assert(longitude >= -180 && longitude <= 180, 'longitude must be between -180 and 180');
  assert(VALID_ANIMAL_TYPES.has(animalType), `animalType must be one of: ${[...VALID_ANIMAL_TYPES].join(', ')}`);
  assert(XMR_ADDRESS_PATTERN.test(registration.xmrAddress), 'xmrAddress must be a valid Monero address');

  return {
    animalId: registration.animalId || generateAnimalId(registration),
    species: String(registration.species).trim(),
    commonName: String(registration.commonName).trim(),
    animalType,
    latitude,
    longitude,
    age: registration.age === undefined || registration.age === '' ? null : normalizeNumber(registration.age, 'age'),
    weight:
      registration.weight === undefined || registration.weight === ''
        ? null
        : normalizeNumber(registration.weight, 'weight'),
    description: registration.description ? String(registration.description).trim() : '',
    photos,
    xmrAddress: registration.xmrAddress,
  };
}

function generateNfcTagId(registration, options = {}) {
  const normalized = normalizeAnimalRegistration(registration);
  const issuedAt = options.issuedAt || new Date().toISOString();
  const randomPart = options.randomBytes
    ? Buffer.from(options.randomBytes).toString('hex')
    : crypto.randomBytes(10).toString('hex');
  const digest = crypto
    .createHash('sha256')
    .update(`${normalized.animalId}|${issuedAt}|${randomPart}`)
    .digest('hex')
    .slice(0, 24);

  return `mzar_nfc_${digest}`;
}

function createNfcPayload(registration, options = {}) {
  const normalized = normalizeAnimalRegistration(registration);
  const issuedAt = options.issuedAt || new Date().toISOString();
  const tagId = options.tagId || generateNfcTagId(normalized, { issuedAt, randomBytes: options.randomBytes });
  const registryUrl = options.registryUrl || DEFAULT_REGISTRY_URL;

  return {
    schema: 'myzubster.nfc-tag.v1',
    tagId,
    animalId: normalized.animalId,
    registryUrl: `${registryUrl.replace(/\/$/, '')}/${encodeURIComponent(normalized.animalId)}`,
    issuedAt,
    animal: {
      species: normalized.species,
      commonName: normalized.commonName,
      animalType: normalized.animalType,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      age: normalized.age,
      weight: normalized.weight,
      description: normalized.description,
      photos: normalized.photos,
    },
    registrant: {
      xmrAddress: normalized.xmrAddress,
    },
  };
}

function encodeNfcTag(registration, options = {}) {
  const payload = options.payload || createNfcPayload(registration, options);
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

  return {
    tagId: payload.tagId,
    animalId: payload.animalId,
    uri: `${NFC_URI_PREFIX}${encoded}`,
    payload,
  };
}

function decodeNfcTag(uri) {
  assert(typeof uri === 'string' && uri.startsWith(NFC_URI_PREFIX), 'Invalid MyZubster NFC URI');

  const encoded = uri.slice(NFC_URI_PREFIX.length);
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));

  assert(payload.schema === 'myzubster.nfc-tag.v1', 'Unsupported NFC payload schema');
  assert(payload.tagId && payload.animalId, 'NFC payload is missing identifiers');

  return payload;
}

function registerAnimalWithNfc(registration, options = {}) {
  const normalized = normalizeAnimalRegistration(registration);
  const nfcTag = encodeNfcTag(normalized, options);
  const now = options.registeredAt || new Date().toISOString();

  return {
    animal: {
      ...normalized,
      status: 'pending_verification',
      nfcTagId: nfcTag.tagId,
      createdAt: now,
      updatedAt: now,
    },
    nfcTag,
  };
}

module.exports = {
  DEFAULT_REGISTRY_URL,
  NFC_URI_PREFIX,
  VALID_ANIMAL_TYPES,
  createNfcPayload,
  decodeNfcTag,
  encodeNfcTag,
  generateAnimalId,
  generateNfcTagId,
  normalizeAnimalRegistration,
  registerAnimalWithNfc,
};
