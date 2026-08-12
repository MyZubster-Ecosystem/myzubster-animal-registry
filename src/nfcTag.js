const crypto = require('crypto');

const DEFAULT_REGISTRY_URL = 'https://registry.myzubster.com/animals';
const NFC_URI_PREFIX = 'myzubster:nfc:v1:';
const SECURE_NFC_URI_PREFIX = 'myzubster:nfc-secure:v1:';
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

<<<<<<< HEAD
=======
// ---------------------------------------------------------------------------
// Secure NFC: helpers
// ---------------------------------------------------------------------------

>>>>>>> origin
function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url');
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
<<<<<<< HEAD

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }

=======
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
>>>>>>> origin
  return JSON.stringify(value);
}

function sha256Base64Url(value) {
  return crypto.createHash('sha256').update(value).digest('base64url');
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
  const payload = JSON.parse(fromBase64Url(encoded).toString('utf8'));

  assert(payload.schema === 'myzubster.nfc-tag.v1', 'Unsupported NFC payload schema');
  assert(payload.tagId && payload.animalId, 'NFC payload is missing identifiers');

  return payload;
}

<<<<<<< HEAD
function generateNfcSecurityKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
}

function getFingerprintTarget(envelope) {
  return {
    schema: envelope.schema,
    version: envelope.version,
=======
// ---------------------------------------------------------------------------
// Secure NFC: key generation (ECDH P-256 + ECDSA P-256)
// ---------------------------------------------------------------------------

/**
 * Generate a P-256 key pair for both ECDH (encryption) and ECDSA (signing).
 * Returns a single key pair that can be used for both operations.
 * Note: In production, consider separate keys for encryption and signing.
 */
function generateSecureKeyPair() {
  return crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

// ---------------------------------------------------------------------------
// Secure NFC: encryption (ECIES-style: ECDH + AES-256-GCM)
// ---------------------------------------------------------------------------

/**
 * Derive an AES-256-GCM key and IV from an ECDH shared secret using HKDF-SHA256.
 * Returns { aesKey: Buffer, iv: Buffer }.
 */
function deriveEncryptionKey(ecdhSharedSecret, salt, keyLength = 32, ivLength = 12) {
  const derived = crypto.hkdfSync(
    'sha256',
    ecdhSharedSecret,
    Buffer.from(salt, 'utf8'),
    Buffer.from('myzubster-nfc-encrypt', 'utf8'),
    keyLength + ivLength
  );
  return {
    aesKey: derived.slice(0, keyLength),
    iv: derived.slice(keyLength, keyLength + ivLength),
  };
}

/**
 * Encrypt a payload using ECIES: ECDH P-256 key agreement + AES-256-GCM.
 *
 * @param {object} payload - The JSON-serialisable payload to encrypt
 * @param {string} recipientPublicKeyPem - Recipient's P-256 public key (PEM)
 * @param {object} [options]
 * @param {Buffer} [options.ephemeralPrivateKey] - For deterministic tests
 * @returns {object} { ephemeralPublicKey, ciphertext, iv, authTag }
 */
function encryptPayload(payload, recipientPublicKeyPem, options = {}) {
  // Generate ephemeral ECDH key pair
  const ephemeral = options.ephemeralPrivateKey
    ? crypto.createPrivateKey({ key: options.ephemeralPrivateKey, format: 'pem', type: 'pkcs8' })
    : crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey;

  const recipientPublicKey = crypto.createPublicKey(recipientPublicKeyPem);

  // ECDH key agreement
  const sharedSecret = crypto.diffieHellman({
    privateKey: ephemeral,
    publicKey: recipientPublicKey,
  });

  // Derive AES key + IV from shared secret
  const salt = `myzubster-encrypt-v1|${Date.now()}`;
  const { aesKey, iv } = deriveEncryptionKey(sharedSecret, salt);

  // Encrypt
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Export ephemeral public key
  const ephemeralPublicKey = crypto.createPublicKey(ephemeral).export({ type: 'spki', format: 'pem' });

  return {
    ephemeralPublicKey: toBase64Url(ephemeralPublicKey),
    ciphertext: toBase64Url(ciphertext),
    iv: toBase64Url(iv),
    authTag: toBase64Url(authTag),
    salt,
  };
}

/**
 * Decrypt a payload encrypted with encryptPayload.
 *
 * @param {object} encryptedData - Output from encryptPayload
 * @param {string} recipientPrivateKeyPem - Recipient's P-256 private key (PEM)
 * @returns {object} Original decrypted payload
 */
function decryptPayload(encryptedData, recipientPrivateKeyPem) {
  const { ephemeralPublicKey, ciphertext, iv, authTag, salt } = encryptedData;

  const recipientPrivateKey = crypto.createPrivateKey({ key: recipientPrivateKeyPem, format: 'pem', type: 'pkcs8' });
  const ephemPubKey = crypto.createPublicKey(fromBase64Url(ephemeralPublicKey));

  // ECDH key agreement
  const sharedSecret = crypto.diffieHellman({
    privateKey: recipientPrivateKey,
    publicKey: ephemPubKey,
  });

  // Derive same AES key + IV
  const { aesKey, iv: derivedIv } = deriveEncryptionKey(sharedSecret, salt);
  assert(toBase64Url(derivedIv) === iv, 'IV mismatch in decryption');

  // Decrypt
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, fromBase64Url(iv));
  decipher.setAuthTag(fromBase64Url(authTag));
  const plaintext = Buffer.concat([
    decipher.update(fromBase64Url(ciphertext)),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString('utf8'));
}

// ---------------------------------------------------------------------------
// Secure NFC: anti-counterfeiting (ECDSA P-256 signatures)
// ---------------------------------------------------------------------------

function getFingerprintTarget(envelope) {
  return {
    schema: envelope.schema,
>>>>>>> origin
    tagId: envelope.tagId,
    animalId: envelope.animalId,
    issuedAt: envelope.issuedAt,
    registryUrl: envelope.registryUrl,
    encryption: envelope.encryption,
  };
}

function getSignatureTarget(envelope) {
  return {
    ...getFingerprintTarget(envelope),
    antiCounterfeit: {
      fingerprint: envelope.antiCounterfeit.fingerprint,
      signatureAlg: envelope.antiCounterfeit.signatureAlg,
    },
  };
}

<<<<<<< HEAD
function createSecureNfcTag(registration, options = {}) {
  assert(options.publicKey, 'publicKey is required for secure NFC tag encryption');
  assert(options.privateKey, 'privateKey is required for secure NFC tag signing');

  const payload = options.payload || createNfcPayload(registration, options);
  const aesKey = options.aesKey ? Buffer.from(options.aesKey) : crypto.randomBytes(32);
  const iv = options.iv ? Buffer.from(options.iv) : crypto.randomBytes(12);

  assert(aesKey.length === 32, 'aesKey must be 32 bytes for AES-256-GCM');
  assert(iv.length === 12, 'iv must be 12 bytes for AES-256-GCM');

  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const aad = Buffer.from(`${payload.schema}|${payload.tagId}|${payload.animalId}`, 'utf8');
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const encryptedKey = crypto.publicEncrypt(
    {
      key: options.publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    aesKey
  );

  const envelope = {
    schema: 'myzubster.nfc-secure-tag.v1',
    version: 1,
=======
// ---------------------------------------------------------------------------
// Secure NFC: create, decode, verify, decrypt
// ---------------------------------------------------------------------------

/**
 * Create an encrypted + signed (secure) NFC tag.
 *
 * @param {object} registration - Animal registration data
 * @param {object} options
 * @param {string} options.publicKey - Issuer's P-256 public key (PEM) for encryption
 * @param {string} options.privateKey - Issuer's P-256 private key (PEM) for signing
 * @param {Buffer} [options.ephemeralPrivateKey] - For deterministic ECDH
 * @returns {object} { tagId, animalId, uri, envelope }
 */
function createSecureNfcTag(registration, options = {}) {
  assert(options.publicKey, 'publicKey (issuer P-256 public) is required for encryption');
  assert(options.privateKey, 'privateKey (issuer P-256 private) is required for signing');

  const payload = options.payload || createNfcPayload(registration, options);

  // Encrypt the NFC payload
  const encrypted = encryptPayload(payload, options.publicKey, {
    ephemeralPrivateKey: options.ephemeralPrivateKey,
  });

  const envelope = {
    schema: 'myzubster.nfc-secure-tag.v1',
>>>>>>> origin
    tagId: payload.tagId,
    animalId: payload.animalId,
    issuedAt: payload.issuedAt,
    registryUrl: payload.registryUrl,
    encryption: {
<<<<<<< HEAD
      keyAlg: 'RSA-OAEP-SHA256',
      contentAlg: 'AES-256-GCM',
      encryptedKey: toBase64Url(encryptedKey),
      iv: toBase64Url(iv),
      authTag: toBase64Url(authTag),
      ciphertext: toBase64Url(ciphertext),
    },
  };

  const fingerprint = sha256Base64Url(canonicalJson(getFingerprintTarget(envelope)));
  envelope.antiCounterfeit = {
    fingerprint,
    signatureAlg: 'RSA-SHA256',
  };
  envelope.antiCounterfeit.signature = crypto
    .sign('sha256', Buffer.from(canonicalJson(getSignatureTarget(envelope)), 'utf8'), options.privateKey)
    .toString('base64url');
=======
      keyAlg: 'ECDH-P256',
      contentAlg: 'AES-256-GCM',
      ephemeralPublicKey: encrypted.ephemeralPublicKey,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      ciphertext: encrypted.ciphertext,
      salt: encrypted.salt,
    },
  };

  // Anti-counterfeit fingerprint (deterministic hash of envelope core fields)
  const fingerprint = sha256Base64Url(canonicalJson(getFingerprintTarget(envelope)));
  envelope.antiCounterfeit = {
    fingerprint,
    signatureAlg: 'ECDSA-P256-SHA256',
  };

  // Sign the fingerprint + signature metadata
  const signer = crypto.createSign('sha256');
  signer.update(canonicalJson(getSignatureTarget(envelope)));
  envelope.antiCounterfeit.signature = signer.sign(
    { key: options.privateKey, format: 'pem', type: 'pkcs8' },
    'base64url'
  );
>>>>>>> origin

  return {
    tagId: payload.tagId,
    animalId: payload.animalId,
    uri: `${SECURE_NFC_URI_PREFIX}${toBase64Url(JSON.stringify(envelope))}`,
    envelope,
  };
}

<<<<<<< HEAD
=======
/**
 * Decode a secure NFC URI into the envelope structure.
 */
>>>>>>> origin
function decodeSecureNfcTag(uri) {
  assert(typeof uri === 'string' && uri.startsWith(SECURE_NFC_URI_PREFIX), 'Invalid MyZubster secure NFC URI');

  const envelope = JSON.parse(fromBase64Url(uri.slice(SECURE_NFC_URI_PREFIX.length)).toString('utf8'));

  assert(envelope.schema === 'myzubster.nfc-secure-tag.v1', 'Unsupported secure NFC payload schema');
  assert(envelope.tagId && envelope.animalId, 'Secure NFC payload is missing identifiers');
  assert(envelope.encryption && envelope.antiCounterfeit, 'Secure NFC payload is missing security data');

  return envelope;
}

<<<<<<< HEAD
function verifySecureNfcTag(uri, options = {}) {
  try {
    assert(options.publicKey, 'publicKey is required for secure NFC verification');

    const envelope = decodeSecureNfcTag(uri);
    const expectedFingerprint = sha256Base64Url(canonicalJson(getFingerprintTarget(envelope)));
    assert(
      envelope.antiCounterfeit.fingerprint === expectedFingerprint,
      'Secure NFC fingerprint does not match payload'
    );

    const verified = crypto.verify(
      'sha256',
      Buffer.from(canonicalJson(getSignatureTarget(envelope)), 'utf8'),
      options.publicKey,
      fromBase64Url(envelope.antiCounterfeit.signature)
    );
    assert(verified, 'Secure NFC signature is invalid');
=======
/**
 * Verify a secure NFC tag's anti-counterfeit signature.
 *
 * @param {string} uri - Secure NFC URI
 * @param {object} options
 * @param {string} options.publicKey - Issuer's P-256 public key (PEM) for signature verification
 * @returns {object} { valid, tagId, animalId, reason? }
 */
function verifySecureNfcTag(uri, options = {}) {
  try {
    assert(options.publicKey, 'publicKey is required for secure NFC signature verification');

    const envelope = decodeSecureNfcTag(uri);

    // Verify fingerprint
    const expectedFingerprint = sha256Base64Url(canonicalJson(getFingerprintTarget(envelope)));
    assert(
      envelope.antiCounterfeit.fingerprint === expectedFingerprint,
      'NFC anti-counterfeit fingerprint does not match envelope content'
    );

    // Verify ECDSA signature
    const verifier = crypto.createVerify('sha256');
    verifier.update(canonicalJson(getSignatureTarget(envelope)));
    const verified = verifier.verify(
      { key: options.publicKey, format: 'pem', type: 'spki' },
      fromBase64Url(envelope.antiCounterfeit.signature)
    );
    assert(verified, 'NFC anti-counterfeit signature is invalid');
>>>>>>> origin

    return {
      valid: true,
      tagId: envelope.tagId,
      animalId: envelope.animalId,
      fingerprint: envelope.antiCounterfeit.fingerprint,
    };
  } catch (error) {
    return {
      valid: false,
      reason: error.message,
    };
  }
}

<<<<<<< HEAD
function decryptSecureNfcTag(uri, options = {}) {
  assert(options.privateKey, 'privateKey is required for secure NFC decryption');
  assert(options.publicKey, 'publicKey is required for secure NFC verification');

  const verification = verifySecureNfcTag(uri, { publicKey: options.publicKey });
  assert(verification.valid, verification.reason);

  const envelope = decodeSecureNfcTag(uri);
  const aesKey = crypto.privateDecrypt(
    {
      key: options.privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    fromBase64Url(envelope.encryption.encryptedKey)
  );
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    aesKey,
    fromBase64Url(envelope.encryption.iv)
  );
  decipher.setAAD(Buffer.from(`myzubster.nfc-tag.v1|${envelope.tagId}|${envelope.animalId}`, 'utf8'));
  decipher.setAuthTag(fromBase64Url(envelope.encryption.authTag));

  const plaintext = Buffer.concat([
    decipher.update(fromBase64Url(envelope.encryption.ciphertext)),
    decipher.final(),
  ]);
  const payload = JSON.parse(plaintext.toString('utf8'));

=======
/**
 * Decrypt a verified secure NFC tag to recover the original payload.
 *
 * @param {string} uri - Secure NFC URI
 * @param {object} options
 * @param {string} options.privateKey - Recipient's P-256 private key (PEM) for decryption
 * @param {string} options.publicKey - Issuer's P-256 public key (PEM) for signature verification
 * @returns {object} Original payload
 */
function decryptSecureNfcTag(uri, options = {}) {
  assert(options.privateKey, 'privateKey is required for secure NFC tag decryption');
  assert(options.publicKey, 'publicKey is required for secure NFC tag verification');

  // Verify anti-counterfeit first
  const verification = verifySecureNfcTag(uri, { publicKey: options.publicKey });
  assert(verification.valid, `Secure NFC tag verification failed: ${verification.reason}`);

  // Decrypt
  const envelope = decodeSecureNfcTag(uri);
  const payload = decryptPayload(
    {
      ephemeralPublicKey: envelope.encryption.ephemeralPublicKey,
      ciphertext: envelope.encryption.ciphertext,
      iv: envelope.encryption.iv,
      authTag: envelope.encryption.authTag,
      salt: envelope.encryption.salt,
    },
    options.privateKey
  );

  // Cross-check IDs
>>>>>>> origin
  assert(payload.tagId === envelope.tagId, 'Decrypted NFC tag ID mismatch');
  assert(payload.animalId === envelope.animalId, 'Decrypted NFC animal ID mismatch');

  return payload;
}

<<<<<<< HEAD
=======
/**
 * Register an animal AND generate a secure (encrypted + signed) NFC tag.
 */
>>>>>>> origin
function registerAnimalWithSecureNfc(registration, options = {}) {
  const normalized = normalizeAnimalRegistration(registration);
  const nfcTag = createSecureNfcTag(normalized, options);
  const now = options.registeredAt || new Date().toISOString();

  return {
    animal: {
      ...normalized,
      status: 'pending_verification',
      nfcTagId: nfcTag.tagId,
      nfcSecurity: 'encrypted_signed',
      createdAt: now,
      updatedAt: now,
    },
    nfcTag,
  };
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
  SECURE_NFC_URI_PREFIX,
  VALID_ANIMAL_TYPES,
  createNfcPayload,
  createSecureNfcTag,
  decodeNfcTag,
  decodeSecureNfcTag,
  decryptSecureNfcTag,
<<<<<<< HEAD
=======
  encryptPayload,
  decryptPayload,
>>>>>>> origin
  encodeNfcTag,
  generateAnimalId,
  generateNfcSecurityKeyPair,
  generateNfcTagId,
  generateSecureKeyPair,
  normalizeAnimalRegistration,
  registerAnimalWithSecureNfc,
  registerAnimalWithNfc,
  verifySecureNfcTag,
};
