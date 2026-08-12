// MyZubster Web NFC Tag Simulator
// Browser-side counterpart to src/nfcTag.js. Runs in any modern browser
// without Node-only globals (no Buffer, no require). It re-implements the
// NFC URI + payload schema from src/nfcTag.js using the Web Crypto API so
// that generated payloads are byte-compatible with the Node CLI.
//
// Exposed surface (when loaded as a classic script, attaches to
// window.MyZubsterSimulator; when loaded via require() with the
// tiny compatibility shim, exports the same names for tests).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MyZubsterSimulator = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEFAULT_REGISTRY_URL = 'https://registry.myzubster.com/animals';
  var NFC_URI_PREFIX = 'myzubster:nfc:v1:';
  var REQUIRED_FIELDS = [
    'species', 'commonName', 'animalType',
    'latitude', 'longitude', 'xmrAddress'
  ];
  var VALID_ANIMAL_TYPES = ['pet', 'livestock', 'wildlife', 'aquatic', 'insect'];
  // Monero mainnet addresses: base58 (4...) or subaddress (8...), 95-106 chars.
  var XMR_ADDRESS_PATTERN = /^[48][1-9A-HJ-NP-Za-km-z]{94,105}$/;

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  function toCamelCaseRegistration(input) {
    input = input || {};
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
      xmrAddress: input.xmrAddress || input.xmr_address
    };
  }

  function normalizeNumber(value, fieldName) {
    var parsed = Number(value);
    assert(Number.isFinite(parsed), fieldName + ' must be a valid number');
    return parsed;
  }

  function bytesToHex(bytes) {
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i];
      hex += (b < 16 ? '0' : '') + b.toString(16);
    }
    return hex;
  }

  function randomHex(byteLen) {
    var arr = new Uint8Array(byteLen);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    } else {
      // Fallback (only used in environments without WebCrypto; tests use Node 20+)
      for (var i = 0; i < byteLen; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return bytesToHex(arr);
  }

  function sha256Hex(text) {
    // Synchronous variant: when the Node test harness provides sync SHA-256
    // via require('crypto'), use it. Otherwise return a Promise<string>.
    var nodeCrypto = null;
    if (typeof require === 'function') {
      try { nodeCrypto = require('crypto'); } catch (e) { nodeCrypto = null; }
    }
    if (nodeCrypto && typeof nodeCrypto.createHash === 'function') {
      return nodeCrypto.createHash('sha256').update(text).digest('hex');
    }
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      var enc = new TextEncoder();
      var buf = enc.encode(text);
      return crypto.subtle.digest('SHA-256', buf).then(function (digest) {
        return bytesToHex(new Uint8Array(digest));
      });
    }
    throw new Error('No SHA-256 implementation available');
  }

  // Pure-JS SHA-256 (FIPS 180-4). Used in browsers where Web Crypto's
  // subtle.digest is async-only and we need a sync digest to keep the
  // generate/scan/verify flow synchronous. Returns a lowercase hex string.
  // Constants and algorithm from FIPS 180-4 (public domain).
  var SHA256_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }

  function sha256Pure(text) {
    var utf8 = unescape(encodeURIComponent(text));
    var bytes = [];
    for (var i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i));
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    // 64-bit big-endian length (high 32 bits zero for our short inputs).
    for (var hi = 0; hi < 4; hi++) bytes.push(0);
    for (var lo = 3; lo >= 0; lo--) bytes.push((bitLen >>> (lo * 8)) & 0xff);

    var H = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);

    var w = new Uint32Array(64);
    for (var block = 0; block < bytes.length; block += 64) {
      for (var t = 0; t < 16; t++) {
        w[t] = (bytes[block + t * 4] << 24) |
               (bytes[block + t * 4 + 1] << 16) |
               (bytes[block + t * 4 + 2] << 8) |
               (bytes[block + t * 4 + 3]);
      }
      for (var t2 = 16; t2 < 64; t2++) {
        var s0 = rotr(7, w[t2 - 15]) ^ rotr(18, w[t2 - 15]) ^ (w[t2 - 15] >>> 3);
        var s1 = rotr(17, w[t2 - 2]) ^ rotr(19, w[t2 - 2]) ^ (w[t2 - 2] >>> 10);
        w[t2] = (w[t2 - 16] + s0 + w[t2 - 7] + s1) | 0;
      }

      var a = H[0], b = H[1], c = H[2], d = H[3];
      var e = H[4], f = H[5], g = H[6], h = H[7];

      for (var t3 = 0; t3 < 64; t3++) {
        var S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
        var ch = (e & f) ^ (~e & g);
        var temp1 = (h + S1 + ch + SHA256_K[t3] + w[t3]) | 0;
        var S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) | 0;
        h = g; g = f; f = e;
        e = (d + temp1) | 0;
        d = c; c = b; b = a;
        a = (temp1 + temp2) | 0;
      }

      H[0] = (H[0] + a) | 0;
      H[1] = (H[1] + b) | 0;
      H[2] = (H[2] + c) | 0;
      H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0;
      H[5] = (H[5] + f) | 0;
      H[6] = (H[6] + g) | 0;
      H[7] = (H[7] + h) | 0;
    }

    var hex = '';
    for (var k = 0; k < 8; k++) {
      var v = H[k];
      for (var j = 0; j < 8; j++) {
        var nib = (v >>> (28 - j * 4)) & 0xf;
        hex += nib < 10 ? String.fromCharCode(48 + nib) : String.fromCharCode(87 + nib);
      }
    }
    return hex;
  }

  function sha256HexSync(text) {
    var nodeCrypto = null;
    if (typeof require === 'function') {
      try { nodeCrypto = require('crypto'); } catch (e) { nodeCrypto = null; }
    }
    if (nodeCrypto && typeof nodeCrypto.createHash === 'function') {
      return nodeCrypto.createHash('sha256').update(text).digest('hex');
    }
    // Browser path: use the pure-JS implementation. (Web Crypto subtle.digest
    // is async-only; we need a sync digest to keep encode/scan/verify sync.)
    return sha256Pure(text);
  }

  function generateAnimalId(registration) {
    var seed = [
      registration.species,
      registration.commonName,
      registration.animalType,
      registration.latitude,
      registration.longitude,
      Date.now(),
      randomHex(8)
    ].join('|');

    var digest = sha256HexSync(seed).slice(0, 16);
    return 'animal_' + digest;
  }

  function normalizeAnimalRegistration(input) {
    var reg = toCamelCaseRegistration(input);
    REQUIRED_FIELDS.forEach(function (field) {
      assert(reg[field] !== undefined && reg[field] !== '', field + ' is required');
    });

    var animalType = String(reg.animalType).trim().toLowerCase();
    var latitude = normalizeNumber(reg.latitude, 'latitude');
    var longitude = normalizeNumber(reg.longitude, 'longitude');
    var photos = Array.isArray(reg.photos) ? reg.photos.filter(Boolean) : [];

    assert(latitude >= -90 && latitude <= 90, 'latitude must be between -90 and 90');
    assert(longitude >= -180 && longitude <= 180, 'longitude must be between -180 and 180');
    assert(VALID_ANIMAL_TYPES.indexOf(animalType) !== -1,
      'animalType must be one of: ' + VALID_ANIMAL_TYPES.join(', '));
    assert(XMR_ADDRESS_PATTERN.test(reg.xmrAddress),
      'xmrAddress must be a valid Monero address');

    return {
      animalId: reg.animalId || generateAnimalId(reg),
      species: String(reg.species).trim(),
      commonName: String(reg.commonName).trim(),
      animalType: animalType,
      latitude: latitude,
      longitude: longitude,
      age: (reg.age === undefined || reg.age === '')
        ? null : normalizeNumber(reg.age, 'age'),
      weight: (reg.weight === undefined || reg.weight === '')
        ? null : normalizeNumber(reg.weight, 'weight'),
      description: reg.description ? String(reg.description).trim() : '',
      photos: photos,
      xmrAddress: reg.xmrAddress
    };
  }

  function generateNfcTagId(registration, options) {
    options = options || {};
    var normalized = normalizeAnimalRegistration(registration);
    var issuedAt = options.issuedAt || new Date().toISOString();
    var randomPart = options.randomBytes
      ? bytesToHex(options.randomBytes)
      : randomHex(10);
    var digest = sha256HexSync(
      normalized.animalId + '|' + issuedAt + '|' + randomPart
    ).slice(0, 24);
    return 'mzar_nfc_' + digest;
  }

  function createNfcPayload(registration, options) {
    options = options || {};
    var normalized = normalizeAnimalRegistration(registration);
    var issuedAt = options.issuedAt || new Date().toISOString();
    var randomPart = options.randomBytes
      ? bytesToHex(options.randomBytes)
      : randomHex(10);
    var tagId = options.tagId || generateNfcTagId(normalized, {
      issuedAt: issuedAt,
      randomBytes: options.randomBytes
    });
    var registryUrl = options.registryUrl || DEFAULT_REGISTRY_URL;

    return {
      schema: 'myzubster.nfc-tag.v1',
      tagId: tagId,
      animalId: normalized.animalId,
      registryUrl: registryUrl.replace(/\/$/, '') + '/' + encodeURIComponent(normalized.animalId),
      issuedAt: issuedAt,
      animal: {
        species: normalized.species,
        commonName: normalized.commonName,
        animalType: normalized.animalType,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        age: normalized.age,
        weight: normalized.weight,
        description: normalized.description,
        photos: normalized.photos
      },
      registrant: { xmrAddress: normalized.xmrAddress }
    };
  }

  function utf8ToBase64Url(str) {
    if (typeof btoa === 'function') {
      // Browser path: TextEncoder -> binary string -> base64 -> base64url.
      var enc = (typeof TextEncoder !== 'undefined')
        ? new TextEncoder()
        : null;
      var bytes = enc ? enc.encode(str) : null;
      var binStr;
      if (bytes) {
        binStr = '';
        for (var i = 0; i < bytes.length; i++) binStr += String.fromCharCode(bytes[i]);
      } else {
        // Legacy: assume string is ASCII.
        binStr = unescape(encodeURIComponent(str));
      }
      var b64 = btoa(binStr);
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }
    // Node path: Buffer is the natural fit.
    var nodeBuf = null;
    if (typeof require === 'function') {
      try { nodeBuf = require('buffer').Buffer; } catch (e) { nodeBuf = null; }
    }
    if (nodeBuf) {
      return nodeBuf.from(str, 'utf8').toString('base64url');
    }
    throw new Error('No base64url encoder available');
  }

  function base64UrlToUtf8(b64url) {
    var b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    if (typeof atob === 'function') {
      var binStr = atob(b64);
      var bytes = new Uint8Array(binStr.length);
      for (var i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder('utf-8').decode(bytes);
      }
      return decodeURIComponent(escape(binStr));
    }
    var nodeBuf = null;
    if (typeof require === 'function') {
      try { nodeBuf = require('buffer').Buffer; } catch (e) { nodeBuf = null; }
    }
    if (nodeBuf) {
      return nodeBuf.from(b64url, 'base64url').toString('utf8');
    }
    throw new Error('No base64url decoder available');
  }

  function encodeNfcTag(registration, options) {
    options = options || {};
    var payload = options.payload || createNfcPayload(registration, options);
    var encoded = utf8ToBase64Url(JSON.stringify(payload));
    return {
      tagId: payload.tagId,
      animalId: payload.animalId,
      uri: NFC_URI_PREFIX + encoded,
      payload: payload
    };
  }

  function decodeNfcTag(uri) {
    assert(typeof uri === 'string' && uri.indexOf(NFC_URI_PREFIX) === 0,
      'Invalid MyZubster NFC URI');
    var encoded = uri.slice(NFC_URI_PREFIX.length);
    var json = base64UrlToUtf8(encoded);
    var payload = JSON.parse(json);
    assert(payload.schema === 'myzubster.nfc-tag.v1', 'Unsupported NFC payload schema');
    assert(payload.tagId && payload.animalId, 'NFC payload is missing identifiers');
    return payload;
  }

  // Simulate scanning: pretend the device just tapped the tag and returned
  // the URI. Verifies round-trip integrity (uri -> decode -> payload matches).
  // Accepts either an encoded tag {tagId, animalId, uri, payload} or a raw
  // registration object that will be encoded first.
  function simulateScan(registrationOrTag, options) {
    options = options || {};
    var tag;
    if (registrationOrTag && registrationOrTag.uri &&
        registrationOrTag.payload && registrationOrTag.tagId) {
      tag = registrationOrTag;
    } else {
      tag = encodeNfcTag(registrationOrTag, options);
    }
    var scan = {
      device: options.device || 'Web NFC Simulator (Chromium 126)',
      timestamp: new Date().toISOString(),
      tagId: tag.tagId,
      animalId: tag.animalId,
      uri: tag.uri,
      payload: tag.payload,
      verification: {
        schemaOk: tag.payload.schema === 'myzubster.nfc-tag.v1',
        roundTripOk: false,
        registryUrl: tag.payload.registryUrl
      }
    };
    try {
      var decoded = decodeNfcTag(tag.uri);
      scan.verification.roundTripOk =
        decoded.tagId === tag.tagId &&
        decoded.animalId === tag.animalId &&
        decoded.schema === tag.payload.schema;
      scan.verification.payloadMatches = JSON.stringify(decoded) === JSON.stringify(tag.payload);
    } catch (err) {
      scan.verification.error = err.message;
    }
    return scan;
  }

  // Simulate verification: combine a scan with an "expected animal" payload
  // (e.g. fetched from the registry URL) and report match/mismatch. Accepts
  // either a registration or an encoded tag.
  function simulateVerification(registrationOrTag, options) {
    options = options || {};
    var scan = simulateScan(registrationOrTag, options);
    var expected = options.expected || scan.payload;
    var matches = expected.animalId === scan.payload.animalId &&
      expected.tagId === scan.payload.tagId;
    return {
      scan: scan,
      matches: matches,
      expectedAnimalId: expected.animalId,
      scannedAnimalId: scan.payload.animalId,
      registryUrl: scan.payload.registryUrl,
      checkedAt: new Date().toISOString()
    };
  }

  return {
    DEFAULT_REGISTRY_URL: DEFAULT_REGISTRY_URL,
    NFC_URI_PREFIX: NFC_URI_PREFIX,
    VALID_ANIMAL_TYPES: VALID_ANIMAL_TYPES,
    XMR_ADDRESS_PATTERN: XMR_ADDRESS_PATTERN,
    REQUIRED_FIELDS: REQUIRED_FIELDS,
    _sha256Pure: sha256Pure,
    createNfcPayload: createNfcPayload,
    decodeNfcTag: decodeNfcTag,
    encodeNfcTag: encodeNfcTag,
    generateAnimalId: generateAnimalId,
    generateNfcTagId: generateNfcTagId,
    normalizeAnimalRegistration: normalizeAnimalRegistration,
    simulateScan: simulateScan,
    simulateVerification: simulateVerification
  };
});
