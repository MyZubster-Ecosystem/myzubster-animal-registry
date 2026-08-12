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

## Secure NFC Tags (Encrypted + Signed)

Secure NFC tags add **encryption** (ECDH P-256 + AES-256-GCM) and **anti-counterfeiting** (ECDSA P-256 signatures) on top of the standard payload.

### Key Generation

```javascript
const { generateSecureKeyPair } = require('../src/nfcTag');
const keys = generateSecureKeyPair();
// keys.publicKey  -> PEM for encryption & signature verification
// keys.privateKey -> PEM for decryption & signing
```

Keep the private key secure. Share the public key so anyone can verify tags you issue.

### Creating a Secure Tag

```javascript
const { createSecureNfcTag } = require('../src/nfcTag');

const secureTag = createSecureNfcTag(registration, {
  publicKey: keys.publicKey,   // Issuer's public key for encryption
  privateKey: keys.privateKey, // Issuer's private key for signing
});

console.log(secureTag.uri);
// myzubster:nfc-secure:v1:<base64url-envelope>
```

The encrypted URI does **not** leak the payload contents (species, location, etc.).

### Verifying a Secure Tag

```javascript
const { verifySecureNfcTag, decryptSecureNfcTag } = require('../src/nfcTag');

// Verify anti-counterfeit signature
const verification = verifySecureNfcTag(secureTag.uri, { publicKey: keys.publicKey });
console.log(verification.valid); // true

// Decrypt the payload (requires private key)
const decrypted = decryptSecureNfcTag(secureTag.uri, keys);
console.log(decrypted.animal.commonName); // 'Dog'
```

### Security Properties

| Property | Mechanism |
|----------|-----------|
| **Confidentiality** | ECDH P-256 key agreement + AES-256-GCM encryption |
| **Integrity** | AES-GCM authentication tag + SHA-256 fingerprint |
| **Authenticity** | ECDSA P-256 signature (R,S) |
| **Anti-counterfeiting** | Signed fingerprint of envelope content |

### Comparison: Standard vs Secure

| Aspect | Standard (`nfc:v1`) | Secure (`nfc-secure:v1`) |
|--------|---------------------|--------------------------|
| Payload visible | ✅ Yes (plaintext) | ❌ No (encrypted) |
| Tamper-evident | Via registry lookup | Via signature + fingerprint |
| Offline verification | ❌ Needs registry | ✅ Self-contained |
| URI size | ~400-500 chars | ~800-1000 chars |

## Validation Rules

- `species`, `commonName`, `animalType`, `latitude`, `longitude`, and `xmrAddress` are required.
- `animalType` must be one of `pet`, `livestock`, `wildlife`, `aquatic`, or `insect`.
- Coordinates must be valid latitude and longitude values.
- `xmrAddress` must look like a Monero mainnet address.

## Registration Integration

Use `registerAnimalWithNfc(registration)` at the point where an animal registration is accepted. It returns the normalized animal record with `status: "pending_verification"` and `nfcTagId`, plus the encoded NFC tag data for writing to a physical tag.
