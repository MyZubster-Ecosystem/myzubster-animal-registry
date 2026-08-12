# NFC Tag Verification

<<<<<<< HEAD
This document describes how NFC tags are **scanned, decoded, and verified** in the MyZubster Animal Registry.

## Overview

The verification flow follows three steps:

```
1. SCAN   -> Read NFC URI from physical tag (mobile/NFC reader)
2. DECODE -> Parse the myzubster:nfc:v1: URI into structured payload
3. VERIFY -> Compare decoded data against the on-chain registry record
```

## Verification Statuses

| Status | Meaning |
|--------|---------|
| `verified` | All fields match the registry record |
| `mismatch` | One or more fields differ from the registry record |
| `unknown_animal` | The animalId has no corresponding registry record |
| `invalid_uri` | The URI could not be decoded or parsed |
| `unsupported_schema` | The URI schema is not recognised |

## Programmatic Usage

```javascript
const { scanAndVerify, inMemoryChainProvider } = require('myzubster-animal-registry/src/nfcScanner');
const { registerAnimalWithNfc } = require('myzubster-animal-registry/src/nfcTag');

// Register an animal and get its NFC tag URI
const result = registerAnimalWithNfc({
=======
This guide covers the **scan -> decode -> verify** flow for MyZubster NFC tags. It complements [NFC Tag Generation](./nfc-tags.md), which describes how tags are minted.

The verification logic lives in [`src/nfcScanner.js`](../src/nfcScanner.js). It depends on [`src/nfcTag.js`](../src/nfcTag.js) for decoding and is fully deterministic, pure JavaScript with no network, wallet, or mainnet access. The "blockchain"/registry lookup is delegated to an injectable `chainProvider` so the same code is tested hermetically and wired to a real source in production.

## Module API

```javascript
const {
  VERIFICATION_STATUS,
  inMemoryChainProvider,
  decodeAndVerify,
  verifyNfcTag,
  compareFields,
} = require('./src/nfcScanner');
```

| Export | Description |
|--------|-------------|
| `VERIFICATION_STATUS` | Frozen enum: `verified`, `mismatch`, `unknown_animal`, `invalid_payload`. |
| `inMemoryChainProvider(records)` | Builds a `chainProvider` from a `Map` or `{ [animalId]: record }`. Used by the CLI and tests. |
| `compareFields(decoded, record)` | Returns the list of `{ field, expected, actual }` mismatches between a decoded payload and a registry record. |
| `verifyNfcTag(decoded, chainProvider)` | Validates the payload shape, looks up the registry record, and compares fields. |
| `decodeAndVerify(uri, chainProvider)` | One-shot: decodes a `myzubster:nfc:v1:` URI and then runs `verifyNfcTag`. |

### `chainProvider` contract

A `chainProvider` is any object exposing:

```javascript
{
  getAnimalRecord(animalId): record | null
}
```

`record` is the normalized registry object produced by `registerAnimalWithNfc(...).animal` (see [NFC Tag Generation](./nfc-tags.md)). It must carry `animalId`, `nfcTagId`, `species`, `commonName`, `animalType`, `latitude`, `longitude`, and `xmrAddress`.

## Verification flow

1. **Scan** the NFC tag and read the NDEF text record, which contains a `myzubster:nfc:v1:<base64url>` URI.
2. **Decode** with `decodeNfcTag(uri)` (or use `decodeAndVerify` directly) to recover the `myzubster.nfc-tag.v1` payload.
3. **Verify** against the registry record for `payload.animalId`. A result is returned, never thrown, so each verification produces a stable, machine-readable outcome.

### Outcome shape

```json
{
  "valid": true,
  "status": "verified",
  "reason": "all compared fields match the registry record",
  "mismatches": []
}
```

| `status` | `valid` | Meaning |
|----------|---------|---------|
| `verified` | `true` | Payload decoded and every compared field matches the registry record. |
| `mismatch` | `false` | Animal is known, but one or more fields differ (e.g. the tag was re-bound to another animal). `mismatches` lists each `{ field, expected, actual }`. |
| `unknown_animal` | `false` | `animalId` is not present in the registry source. |
| `invalid_payload` | `false` | The URI is not a MyZubster NFC URI, the base64url payload is malformed, or the decoded JSON is missing required fields. |

### Fields compared

`tagId` (against `record.nfcTagId`), `animalId`, `animal.species`, `animal.commonName`, `animal.animalType`, `animal.latitude`, `animal.longitude`, and `registrant.xmrAddress`. `latitude`/`longitude` are compared by numeric value so a `"41.9028"` string stored in the registry and a `41.9028` number in the payload are treated as equal.

## Programmatic usage

```javascript
const { registerAnimalWithNfc } = require('./src/nfcTag');
const { inMemoryChainProvider, decodeAndVerify, VERIFICATION_STATUS } = require('./src/nfcScanner');

const registration = {
>>>>>>> origin
  species: 'Canis lupus familiaris',
  common_name: 'Dog',
  animal_type: 'pet',
  latitude: 41.9028,
  longitude: 12.4964,
  xmr_address: '48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA',
<<<<<<< HEAD
});

// Create an in-memory registry (replace with real chain provider in production)
const provider = inMemoryChainProvider(new Map([[result.animal.animalId, result.animal]]));

// Scan, decode, and verify
const outcome = scanAndVerify(result.nfcTag.uri, provider);
console.log(outcome.status); // 'verified'
```

## Chain Provider Interface

The verifier accepts an injectable `chainProvider` object. In production, implement:

```javascript
const chainProvider = {
  getAnimalRecord(animalId) {
    // Fetch from Monero blockchain / registry database
    // Return the animal record object or null
  },
};
```

## React Native Integration (Mobile Scanning)

To scan NFC tags from a mobile device, use `react-native-nfc-manager`:

```javascript
import NfcManager from 'react-native-nfc-manager';

async function scanNfcTag() {
  await NfcManager.start();
  const tag = await NfcManager.getTag();
  // tag.ndefMessage[0].payload contains the URI
  const uri = decodeURIComponent(
    String.fromCharCode(...tag.ndefMessage[0].payload.slice(3))
  );
  // Send to verifier
  const response = await fetch('https://registry.myzubster.com/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uri }),
  });
  return response.json();
}
```

## Secure NFC Tags

Secure NFC tags (using the `myzubster:nfc-secure:v1:` prefix) are encrypted and signed. When scanned:

1. The URI is decoded to reveal an **envelope** containing encrypted data
2. The anti-counterfeit **fingerprint** is verified against the envelope content
3. The RSA-SHA256 **signature** is verified using the issuer's public key
4. If verification passes, the payload is **trusted** without needing a registry lookup

```javascript
const { scanAndVerify } = require('myzubster-animal-registry/src/nfcScanner');

const publicKey = fs.readFileSync('issuer-public.pem', 'utf8');
const outcome = scanAndVerify(secureUri, provider, { publicKey });
```

## CLI Usage

```bash
# Verify an NFC tag URI
node bin/verify-nfc-tag.js "myzubster:nfc:v1:eyJzY2hlbWEiOi..."

# Verify a secure NFC tag with issuer's public key
node bin/verify-nfc-tag.js "myzubster:nfc-secure:v1:..." --public-key issuer.pem

# Generate a tag then verify it
node bin/generate-nfc-tag.js registration.json > tag.json
node -e "console.log(require('./tag.json').nfcTag.uri)" | xargs node bin/verify-nfc-tag.js
```

## Running Tests
=======
};

const result = registerAnimalWithNfc(registration);
const provider = inMemoryChainProvider(new Map([[result.animal.animalId, result.animal]]));

const outcome = decodeAndVerify(result.nfcTag.uri, provider);
console.log(outcome.valid); // true
console.log(outcome.status); // 'verified'
```

## CLI

Verify a registration file round-trip (the CLI registers the animal, builds its NFC tag, and verifies the tag against the registry record it just produced — useful for smoke-testing the verifier locally):

```bash
node bin/verify-nfc-tag.js registration.json
```

The command prints a JSON verification outcome and exits non-zero on an invalid payload.

## Mobile integration (guidance only)

The verifier itself is platform-agnostic Node.js. On-device NFC reading is the responsibility of the host app. A minimal React Native sketch (documentation only; not built or executed by this repository):

```javascript
import NfcManager, { Ndef } from 'react-native-nfc-manager';
import { decodeAndVerify, inMemoryChainProvider } from './src/nfcScanner'; // bundled for the app

async function verifyScannedTag(provider) {
  const tag = await NfcManager.getTag();
  const uri = Ndef.uri.decodePayload(tag.ndefMessage[0].payload);
  return decodeAndVerify(uri, provider);
}
```

`provider` should be backed by your registry service (e.g. a fetch to `GET /api/animals/:id` returning the `registerAnimalWithNfc(...).animal` shape), not the in-memory stub.

## Run tests
>>>>>>> origin

```bash
npm test
```

<<<<<<< HEAD
The test suite covers:
- Standard NFC URI scanning and verification
- Mismatch detection (species, tagId, coordinates)
- Unknown animal handling
- Invalid/malformed URI rejection
- Chain provider contract validation
- Numeric field comparison (string vs number)
=======
The suite covers encoding/decoding (in `nfcTag.test.js`) and verification outcomes, tamper detection, unknown-animal handling, malformed URIs, and the numeric-coordinate comparison (in `nfcScanner.test.js`).
>>>>>>> origin
