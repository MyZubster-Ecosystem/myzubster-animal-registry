# NFC Tag Generation

This module implements the first NFC workflow for MyZubster Animal Registry:

- Generate a unique NFC tag ID for each registered animal.
- Encode the registration payload as a compact `myzubster:nfc:v1:` URI.
- Decode and validate NFC payloads during scanning or verification.
- Attach the generated NFC tag ID to the animal registration record.

## Run Tests

```bash
npm test
```

## Programmatic Usage

```javascript
const { registerAnimalWithNfc } = require('./src/nfcTag');

const result = registerAnimalWithNfc({
  species: 'Canis lupus familiaris',
  common_name: 'Dog',
  animal_type: 'pet',
  latitude: 41.9028,
  longitude: 12.4964,
  xmr_address: '48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA',
});

console.log(result.nfcTag.uri);
```

## CLI Usage

Create `registration.json`:

```json
{
  "species": "Canis lupus familiaris",
  "common_name": "Dog",
  "animal_type": "pet",
  "latitude": 41.9028,
  "longitude": 12.4964,
  "xmr_address": "48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA"
}
```

Generate an NFC payload:

```bash
node bin/generate-nfc-tag.js registration.json
```

The command prints an animal registration record plus the NFC tag data that can be written to an NFC tag as a URI/NDEF record.

## Payload Format

The NFC URI uses this format:

```text
myzubster:nfc:v1:<base64url-json-payload>
```

Decoded payloads use the `myzubster.nfc-tag.v1` schema:

```json
{
  "schema": "myzubster.nfc-tag.v1",
  "tagId": "mzar_nfc_...",
  "animalId": "animal_...",
  "registryUrl": "https://registry.myzubster.com/animals/animal_...",
  "issuedAt": "2026-07-29T08:00:00.000Z",
  "animal": {
    "species": "Canis lupus familiaris",
    "commonName": "Dog",
    "animalType": "pet",
    "latitude": 41.9028,
    "longitude": 12.4964,
    "age": null,
    "weight": null,
    "description": "",
    "photos": []
  },
  "registrant": {
    "xmrAddress": "48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA"
  }
}
```

## Validation Rules

- `species`, `commonName`, `animalType`, `latitude`, `longitude`, and `xmrAddress` are required.
- `animalType` must be one of `pet`, `livestock`, `wildlife`, `aquatic`, or `insect`.
- Coordinates must be valid latitude and longitude values.
- `xmrAddress` must look like a Monero mainnet address.

## Registration Integration

Use `registerAnimalWithNfc(registration)` at the point where an animal registration is accepted. It returns the normalized animal record with `status: "pending_verification"` and `nfcTagId`, plus the encoded NFC tag data for writing to a physical tag.

## JavaScript API Reference

Import the CommonJS module:

```javascript
const nfc = require('../src/nfcTag');
```

The module exports:

| Export | Signature | Purpose |
|---|---|---|
| `DEFAULT_REGISTRY_URL` | `string` | Default animal-record URL prefix |
| `NFC_URI_PREFIX` | `string` | `myzubster:nfc:v1:` URI prefix |
| `VALID_ANIMAL_TYPES` | `Set<string>` | Accepted animal type values |
| `normalizeAnimalRegistration` | `(registration) => object` | Validate and normalize snake_case or camelCase input |
| `generateAnimalId` | `(registration) => string` | Generate an `animal_...` identifier |
| `generateNfcTagId` | `(registration, options?) => string` | Generate an `mzar_nfc_...` identifier |
| `createNfcPayload` | `(registration, options?) => object` | Build the versioned payload object |
| `encodeNfcTag` | `(registration, options?) => object` | Build the payload and encode its URI |
| `decodeNfcTag` | `(uri) => object` | Decode and validate a MyZubster NFC URI |
| `registerAnimalWithNfc` | `(registration, options?) => object` | Normalize a registration and attach NFC data |

### Registration input

The API accepts either API-style snake_case fields or JavaScript-style
camelCase fields:

| Required field | Alias | Notes |
|---|---|---|
| `species` | — | Non-empty string |
| `commonName` | `common_name` | Non-empty string |
| `animalType` | `animal_type` | One of the values in `VALID_ANIMAL_TYPES` |
| `latitude` | — | Number from -90 through 90 |
| `longitude` | — | Number from -180 through 180 |
| `xmrAddress` | `xmr_address` | Monero address beginning with `4` or `8` |

Optional fields are `animalId`/`animal_id`/`id`, `age`, `weight`,
`description`, and `photos`.

### `normalizeAnimalRegistration(registration)`

Validates input and returns a normalized object. Missing IDs are generated.
Numeric strings are converted to numbers, `animalType` is lowercased, missing
`age` and `weight` become `null`, missing descriptions become an empty string,
and non-array photo values become an empty array.

```javascript
const normalized = nfc.normalizeAnimalRegistration({
  species: 'Canis lupus familiaris',
  common_name: 'Dog',
  animal_type: 'pet',
  latitude: '41.9028',
  longitude: '12.4964',
  xmr_address: process.env.PUBLIC_XMR_ADDRESS,
});
```

### `generateAnimalId(registration)`

Returns an ID in the form `animal_<16 hex characters>`. It combines registration
data, the current time, and random bytes; callers must not expect the same input
to produce the same ID.

### `generateNfcTagId(registration, options)`

Returns an ID in the form `mzar_nfc_<24 hex characters>`.

Supported options:

| Option | Type | Effect |
|---|---|---|
| `issuedAt` | string | Override the ISO issue timestamp |
| `randomBytes` | Buffer-compatible value | Supply randomness, useful for deterministic tests |

### `createNfcPayload(registration, options)`

Returns the unencoded `myzubster.nfc-tag.v1` payload.

Additional options:

| Option | Type | Effect |
|---|---|---|
| `tagId` | string | Use an existing tag ID |
| `registryUrl` | string | Override `DEFAULT_REGISTRY_URL` |

The final `registryUrl` contains the URL-encoded animal ID. A trailing slash in
the configured base URL is removed before the ID is appended.

### `encodeNfcTag(registration, options)`

Returns:

```javascript
{
  tagId,    // mzar_nfc_...
  animalId, // animal_...
  uri,      // myzubster:nfc:v1:<base64url JSON>
  payload   // the unencoded payload object
}
```

Pass `options.payload` to encode a payload that was already built:

```javascript
const payload = nfc.createNfcPayload(registration, {
  registryUrl: 'https://registry.example/animals',
});
const tag = nfc.encodeNfcTag(registration, { payload });
```

### `decodeNfcTag(uri)`

Decodes the base64url JSON and returns the payload. It rejects:

- non-string values and strings without `NFC_URI_PREFIX`;
- invalid JSON/base64url content;
- payloads whose schema is not `myzubster.nfc-tag.v1`;
- payloads without both `tagId` and `animalId`.

```javascript
const decoded = nfc.decodeNfcTag(tag.uri);
console.log(decoded.animal.commonName);
```

### `registerAnimalWithNfc(registration, options)`

Returns both the persisted-form animal record and the writeable NFC tag:

```javascript
const { animal, nfcTag } = nfc.registerAnimalWithNfc(registration, {
  registeredAt: new Date().toISOString(),
});

await animals.insertOne(animal);
await ndefWriter.writeUri(nfcTag.uri);
```

`registeredAt` controls `createdAt` and `updatedAt`. The NFC-specific options
accepted by `createNfcPayload` and `generateNfcTagId` can be supplied in the
same options object.

## Integration Guide

1. Validate the incoming animal record with `normalizeAnimalRegistration`.
2. Call `registerAnimalWithNfc` after the registration has been accepted.
3. Store `result.animal`, including its `nfcTagId`.
4. Write `result.nfcTag.uri` as an NDEF URI record to the physical tag.
5. On scan, pass the URI to `decodeNfcTag`.
6. Use the decoded `animalId` or `registryUrl` to load the current registry
   record; treat the tag payload as a reference, not as the authoritative
   mutable record.

The repository does not currently implement a dedicated HTTP NFC endpoint.
Applications expose NFC behavior by calling this JavaScript module from their
existing registration and scanning flows.

### Deterministic tests

Supply fixed timestamps and random bytes when asserting exact IDs:

```javascript
const tag = nfc.encodeNfcTag(registration, {
  issuedAt: '2026-07-29T08:00:00.000Z',
  randomBytes: Buffer.from('1234567890abcdef1234', 'hex'),
});
```

Production callers should omit `randomBytes` so the module uses cryptographic
randomness.
