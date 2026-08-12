# NFC Tag Physical Design & Branding — implementation artifact

This directory contains the print-ready NFC tag design deliverables for MyZubster Animal Registry.

## Brand direction

- Rounded paw-print silhouette communicates animal identity at a glance.
- MyZubster wordmark uses a deep forest green with a warm golden accent.
- High-contrast black-on-white safe zone keeps the tag scannable after printing.
- The QR area is reserved for the generated registry URL; the NFC payload remains the primary interaction.

## Physical specification

- Recommended finished size: 35 mm × 35 mm rounded square.
- Substrate: PET or PVC NFC inlay, minimum 0.3 mm finished thickness.
- Surface: UV-resistant matte laminate, or outdoor-rated resin encapsulation for collar use.
- Print: CMYK digital/UV print; maintain a 2 mm quiet margin around the NFC inlay and QR code.
- Durability target: outdoor PET/PVC construction with laminate is suitable for approximately 2–3 years of normal weather exposure; resin encapsulation is preferred for continuous immersion or high-abrasion use.
- NFC hardware note: use an NTAG213/215/216 inlay sized for the selected tag and validate read range after lamination.

## Variants

1. Primary: green rounded-square tag with gold paw mark and dark registry URL panel.
2. Monochrome: black paw mark and wordmark on white for low-cost thermal/laser production.

See `assets/nfc-tag-primary.svg`, `assets/nfc-tag-monochrome.svg`, and `assets/nfc-tag-preview.svg`.

## Production checklist

1. Export SVG artwork at 1:1 scale.
2. Place the NFC inlay behind the marked center zone; do not place metal directly behind the antenna.
3. Encode the generated `myzubster:nfc:v1:` URI into the tag.
4. Verify the written tag with at least two NFC-capable phones before final lamination.
5. Confirm the QR/registry URL resolves and remains readable after the finish is applied.
