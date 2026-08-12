#!/usr/bin/env node

<<<<<<< HEAD
'use strict';

/**
 * MyZubster NFC Tag Verifier CLI
 *
 * Usage:
 *   node bin/verify-nfc-tag.js <nfc-uri>
 *   node bin/verify-nfc-tag.js <nfc-uri> --public-key <pem-file>
 *
 * Examples:
 *   # Verify a standard NFC tag (uses in-memory mock registry)
 *   node bin/verify-nfc-tag.js "myzubster:nfc:v1:eyJzY2hlbWEiOi..."
 *
 *   # First generate a tag, then verify it end-to-end:
 *   node bin/generate-nfc-tag.js registration.json > tag.json
 *   node bin/verify-nfc-tag.js "$(node -e "console.log(require('./tag.json').nfcTag.uri)")"
 */

const fs = require('fs');
const path = require('path');
const { registerAnimalWithNfc } = require('../src/nfcTag');
const { scanAndVerify, inMemoryChainProvider } = require('../src/nfcScanner');

// ---------------------------------------------------------------------------
// CLI logic
// ---------------------------------------------------------------------------

function printUsage() {
  console.error(`
Usage: myzubster-verify-nfc-tag <nfc-uri> [options]

Options:
  --public-key <file>   PEM file containing the issuer's public key (for secure tags)
  --help                Show this help

Examples:
  myzubster-verify-nfc-tag "myzubster:nfc:v1:eyJzY2hlbWEiOi..."
  myzubster-verify-nfc-tag "myzubster:nfc:v1:..." --public-key issuer.pem
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const uri = args[0];
  const options = {};

  // Parse --public-key flag
  const pkIndex = args.indexOf('--public-key');
  if (pkIndex !== -1 && args[pkIndex + 1]) {
    const pemPath = path.resolve(process.cwd(), args[pkIndex + 1]);
    try {
      options.publicKey = fs.readFileSync(pemPath, 'utf8');
    } catch (error) {
      console.error(`Error: cannot read public key file "${pemPath}": ${error.message}`);
      process.exit(1);
    }
  }

  // Create a demo chain provider with a temp registration
  // In production, the provider would connect to the actual registry
  try {
    const demoRegistration = {
      species: 'Example',
      common_name: 'Demo',
      animal_type: 'pet',
      latitude: 45.0,
      longitude: 9.0,
      xmr_address:
        '48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA',
    };

    const result = registerAnimalWithNfc(demoRegistration);
    const provider = inMemoryChainProvider(new Map([[result.animal.animalId, result.animal]]));

    // If the user's URI is our demo tag, verify it; otherwise try anyway
    const outcome = scanAndVerify(uri, provider, options);

    process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
    process.exit(outcome.valid ? 0 : 1);
  } catch (error) {
    console.error(`Verification error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
=======
// Smoke-tests the NFC scanner/verifier end to end against an in-memory registry
// built from a registration JSON file. No network, no wallet, no mainnet access.
'use strict';

const fs = require('fs');
const path = require('path');
const { registerAnimalWithNfc } = require('../src/nfcTag');
const { inMemoryChainProvider, decodeAndVerify } = require('../src/nfcScanner');

function printUsage() {
  console.error('Usage: myzubster-verify-nfc-tag <registration.json>');
}

const inputPath = process.argv[2];
if (!inputPath) {
  printUsage();
  process.exit(1);
}

try {
  const absolutePath = path.resolve(process.cwd(), inputPath);
  const registration = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  const result = registerAnimalWithNfc(registration);
  const provider = inMemoryChainProvider(new Map([[result.animal.animalId, result.animal]]));
  const outcome = decodeAndVerify(result.nfcTag.uri, provider);
  process.stdout.write(`${JSON.stringify({ nfcTag: result.nfcTag, verification: outcome }, null, 2)}\n`);
  if (!outcome.valid) {
    process.exit(2);
  }
} catch (error) {
  console.error(`Failed to verify NFC tag: ${error.message}`);
  process.exit(1);
>>>>>>> origin
}
