#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { registerAnimalWithNfc } = require('../src/nfcTag');

function printUsage() {
  console.error('Usage: myzubster-nfc-tag <registration.json>');
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

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  console.error(`Failed to generate NFC tag: ${error.message}`);
  process.exit(1);
}
