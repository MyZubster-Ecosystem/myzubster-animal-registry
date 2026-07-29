#!/usr/bin/env node

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
}
