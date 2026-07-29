# MyZubster API Reference

**Version:** 1.0
**Base URL:** `https://api.myzubster.com/v1`

This page documents the HTTP API examples currently provided by the repository. The NFC library and CLI are documented separately in [nfc-tags.md](nfc-tags.md).

## Authentication

Requests require an API key:

```http
X-API-Key: your-api-key
Content-Type: application/json
```

Never commit a real API key or private wallet material to source control. The `xmr_address` field is a public receive address and is included only where the API example requires it.

## Animals

### Register an animal

`POST /api/animals/register`

Example request:

```json
{
  "species": "Canis lupus familiaris",
  "common_name": "Dog",
  "animal_type": "pet",
  "latitude": 41.9028,
  "longitude": 12.4964,
  "age": 3,
  "weight": 25,
  "description": "Friendly dog in the park",
  "photos": ["https://imgur.com/photo1.jpg"],
  "xmr_address": "4A2M4vB..."
}
```

Example response:

```json
{
  "success": true,
  "data": {
    "id": "animal_123456",
    "species": "Canis lupus familiaris",
    "common_name": "Dog",
    "animal_type": "pet",
    "latitude": 41.9028,
    "longitude": 12.4964,
    "status": "pending_verification",
    "created_at": "2026-07-29T12:00:00Z",
    "blockchain_tx": "a1b2c3d4..."
  }
}
```

### Verify an animal

`POST /api/animals/:id/verify`

Example response:

```json
{
  "success": true,
  "data": {
    "id": "animal_123456",
    "status": "verified",
    "verified_at": "2026-07-29T12:30:00Z",
    "reward": 0.002
  }
}
```

### Get animal details

`GET /api/animals/:id`

The response contains the animal record, verification status, timestamps, the public registrant/verifier addresses, and an optional blockchain transaction reference.

### List animals

`GET /api/animals`

Supported query parameters:

| Parameter | Type | Description |
|---|---|---|
| `latitude` | float | Search center latitude |
| `longitude` | float | Search center longitude |
| `radius` | float | Search radius in km |
| `species` | string | Filter by species |
| `animal_type` | string | `pet`, `livestock`, `wildlife`, `aquatic`, or `insect` |
| `status` | string | `pending`, `verified`, or `rejected` |

## Errors

| HTTP code | Meaning |
|---:|---|
| 400 | Invalid parameters |
| 401 | Invalid or missing API key |
| 404 | Resource not found |
| 409 | Duplicate entry |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

Example error:

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Invalid XMR address format",
    "details": "Address must start with 4 or 8"
  }
}
```

## Webhooks

### Configure a webhook

`POST /api/webhooks`

```json
{
  "url": "https://your-server.example/webhook",
  "events": ["animal.verified", "animal.registered"],
  "secret": "your-webhook-secret"
}
```

The secret is an example placeholder; use a separately managed secret in deployments and do not commit it.

### Events

| Event | Description |
|---|---|
| `animal.registered` | A new animal was registered |
| `animal.verified` | An animal was verified |
| `animal.updated` | Animal details changed |
| `reward.paid` | A reward payment was sent |
| `conservation.funded` | A conservation project was funded |

## NFC

For NFC payload generation, validation, decoding, registration integration, and the command-line workflow, see [nfc-tags.md](nfc-tags.md). No HTTP NFC endpoint is implemented in this repository.
