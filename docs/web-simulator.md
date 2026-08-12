# Web-based NFC Tag Simulator

The web-based NFC Tag Simulator is a browser-only counterpart of the Node
NFC library (`src/nfcTag.js`). It lets maintainers, contributors, and
integrators test the full generate → scan → verify workflow without a
physical tag, an NFC reader, or any Node tooling.

The simulator lives in the `web/` directory and ships as three static files:

| File           | Purpose                                                          |
|----------------|------------------------------------------------------------------|
| `web/index.html` | UI markup for the generate / scan / verify panels.              |
| `web/styles.css` | Minimal styling.                                                |
| `web/simulator.js` | Core simulator (browser-compatible mirror of `src/nfcTag.js`). |
| `web/app.js`     | UI controller that wires the form and buttons to the core.      |

## Running the simulator

```bash
# Serve the repo over any static HTTP server, then open /web/
python3 -m http.server 8000
xdg-open http://localhost:8000/web/

# Or just open web/index.html directly in a browser
xdg-open web/index.html
```

No build step, no bundler, no dependencies. All crypto runs locally via
the Web Crypto API; generated tags are stored only in `sessionStorage`
and never leave the browser tab.

## Workflow

1. **Generate** — Fill the registration form and click *Generate NFC tag*.
   The simulator validates the input (species, animal type, coordinates,
   XMR address shape) and produces a `myzubster:nfc:v1:<base64url>` URI
   plus the decoded JSON payload.
2. **Scan** — Pick a generated tag in *Tag history* and click *Scan*.
   The simulator decodes the URI, validates the schema, and reports
   whether the round-trip succeeded.
3. **Verify** — Click *Run verification* to replay the registry check.
   The simulator compares the scanned tag against the *expected* record
   (defaults to the just-encoded payload). Toggle *Simulate tamper* to
   force a mismatch and observe how the UI surfaces the failure.

## Payload compatibility

`web/simulator.js` re-implements the same schema, validation, and URI
format as `src/nfcTag.js`. The Node test suite (`test/simulator.test.js`)
asserts that a simulator-generated URI decodes successfully through the
Node library, so the web and CLI paths stay byte-compatible.

## Programmatic usage

When loaded via `<script src="simulator.js">` the core attaches to
`window.MyZubsterSimulator`:

```html
<script src="simulator.js"></script>
<script>
  const tag = window.MyZubsterSimulator.encodeNfcTag({
    species: 'Canis lupus familiaris',
    common_name: 'Dog',
    animal_type: 'pet',
    latitude: 41.9028,
    longitude: 12.4964,
    xmr_address: '48dKf2FVJh3Uei2BL6BSRe4weK8T4h5aYXqYzSgoq2KJhbVKo2kSSBZtftWEibKLTe3RQTW3aL9jJLcNfWTwR2cF5rF1QfA',
  });
  console.log(tag.uri);
</script>
```

When loaded via Node `require`, it exports the same names:

```javascript
const Sim = require('./web/simulator');
const tag = Sim.encodeNfcTag({ /* … */ });
const scan = Sim.simulateScan(tag.payload, { device: 'test' });
console.log(scan.verification.roundTripOk); // true
```

## Validation rules

These mirror `src/nfcTag.js`:

- `species`, `commonName`, `animalType`, `latitude`, `longitude`, and
  `xmrAddress` are required.
- `animalType` must be one of `pet`, `livestock`, `wildlife`, `aquatic`,
  or `insect`.
- Coordinates must be valid latitude / longitude values.
- `xmrAddress` must look like a Monero mainnet address (`4…` or `8…`,
  95–106 characters, base58 alphabet).

## Limitations

- This is a simulator: it does not perform over-the-air NFC reads. Real
  phone NFC scanning will use the same payload format; only the transport
  differs.
- The simulator generates payloads with `crypto.getRandomValues`. The
  random component is the only non-deterministic input — supply
  `randomBytes` to produce stable IDs in tests.
