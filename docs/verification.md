# NFC Tag Verification

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
  species: 'Canis lupus familiaris',
  common_name: 'Dog',
  animal_type: 'pet',
  latitude: 41.9028,
  longitude: 12.4964,
  xmr_address: '48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA',
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

```bash
npm test
```

The suite covers encoding/decoding (in `nfcTag.test.js`) and verification outcomes, tamper detection, unknown-animal handling, malformed URIs, and the numeric-coordinate comparison (in `nfcScanner.test.js`).
