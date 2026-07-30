# NFC Tag Verification

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
  species: 'Canis lupus familiaris',
  common_name: 'Dog',
  animal_type: 'pet',
  latitude: 41.9028,
  longitude: 12.4964,
  xmr_address: '48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA',
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

```bash
npm test
```

The test suite covers:
- Standard NFC URI scanning and verification
- Mismatch detection (species, tagId, coordinates)
- Unknown animal handling
- Invalid/malformed URI rejection
- Chain provider contract validation
- Numeric field comparison (string vs number)
