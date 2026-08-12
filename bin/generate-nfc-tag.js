#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  generateNfcSecurityKeyPair,
  registerAnimalWithNfc,
  registerAnimalWithSecureNfc,
} = require('../src/nfcTag');

function printUsage() {
  console.error('Usage: myzubster-nfc-tag <registration.json> [--secure --public-key public.pem --private-key private.pem]');
  console.error('       myzubster-nfc-tag --generate-keys');
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

const inputPath = process.argv[2];

if (process.argv.includes('--generate-keys')) {
  process.stdout.write(`${JSON.stringify(generateNfcSecurityKeyPair(), null, 2)}\n`);
  process.exit(0);
}

if (!inputPath || inputPath.startsWith('--')) {
  printUsage();
  process.exit(1);
}

try {
  const absolutePath = path.resolve(process.cwd(), inputPath);
  const registration = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  const secure = process.argv.includes('--secure');
  const publicKeyPath = getArgValue('--public-key');
  const privateKeyPath = getArgValue('--private-key');
  const options = secure
    ? {
        publicKey: fs.readFileSync(path.resolve(process.cwd(), publicKeyPath), 'utf8'),
        privateKey: fs.readFileSync(path.resolve(process.cwd(), privateKeyPath), 'utf8'),
      }
    : {};
  const result = secure ? registerAnimalWithSecureNfc(registration, options) : registerAnimalWithNfc(registration);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  console.error(`Failed to generate NFC tag: ${error.message}`);
  process.exit(1);
}
