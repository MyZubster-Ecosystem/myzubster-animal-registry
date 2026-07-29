# NFC Tag Generation

This module implements the first NFC workflow for MyZubster Animal Registry:

- Generate a unique NFC tag ID for each registered animal.
- Encode the registration payload as a compact `myzubster:nfc:v1:` URI.
- Encrypt tag data as `myzubster:nfc-secure:v1:` URIs with public-key cryptography.
- Verify anti-counterfeiting fingerprints and registry signatures before trusting a tag.
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

Generate a registry key pair for encrypted tags:

```bash
node bin/generate-nfc-tag.js --generate-keys
```

Generate a secure NFC payload:

```bash
node bin/generate-nfc-tag.js registration.json --secure --public-key registry-public.pem --private-key registry-private.pem
```

## Payload Format

The NFC URI uses this format:

```text
myzubster:nfc:v1:<base64url-json-payload>
```

Secure NFC URIs use this format:

```text
myzubster:nfc-secure:v1:<base64url-json-envelope>
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

Secure envelopes use the `myzubster.nfc-secure-tag.v1` schema. The plaintext registration payload is encrypted with AES-256-GCM, the AES key is wrapped with RSA-OAEP-SHA256, and the envelope is signed with RSA-SHA256.

```json
{
  "schema": "myzubster.nfc-secure-tag.v1",
  "version": 1,
  "tagId": "mzar_nfc_...",
  "animalId": "animal_...",
  "issuedAt": "2026-07-29T08:00:00.000Z",
  "registryUrl": "https://registry.myzubster.com/animals/animal_...",
  "encryption": {
    "keyAlg": "RSA-OAEP-SHA256",
    "contentAlg": "AES-256-GCM",
    "encryptedKey": "...",
    "iv": "...",
    "authTag": "...",
    "ciphertext": "..."
  },
  "antiCounterfeit": {
    "fingerprint": "...",
    "signatureAlg": "RSA-SHA256",
    "signature": "..."
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

For protected tags, use `registerAnimalWithSecureNfc(registration, { publicKey, privateKey })`. The resulting animal record includes `nfcSecurity: "encrypted_signed"`.

## Security Verification

Use `verifySecureNfcTag(uri, { publicKey })` before accepting a secure NFC scan. It checks that the fingerprint matches the encrypted envelope and that the registry signature is valid.

Use `decryptSecureNfcTag(uri, { publicKey, privateKey })` only in trusted registry services that can access the private key. It verifies the anti-counterfeiting data first, then decrypts and returns the original NFC payload.
