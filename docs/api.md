# 📡 MyZubster Animal Registry API

**Version:** 1.0
**Base URL:** `https://api.myzubster.com/v1`
**Last Updated:** 2026-07-29

---

## 1. Authentication

All API requests require a valid API key.

### Headers

| Header | Value | Description |
|--------|-------|-------------|
| `X-API-Key` | `your-api-key` | Your API key |
| `Content-Type` | `application/json` | Request format |

---

## 2. Animal Registration

### 2.1 Register a New Animal

**Endpoint:** `POST /api/animals/register`

**Request Body:**
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
Response:
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
2.2 Verify an Animal

Endpoint: POST /api/animals/:id/verify

Request Body:
{
  "success": true,
  "data": {
    "id": "animal_123456",
    "status": "verified",
    "verified_at": "2026-07-29T12:30:00Z",
    "reward": 0.002
  }
}
2.3 Get Animal Details

Endpoint: GET /api/animals/:id

Response:
{
  "success": true,
  "data": {
    "id": "animal_123456",
    "species": "Canis lupus familiaris",
    "common_name": "Dog",
    "animal_type": "pet",
    "latitude": 41.9028,
    "longitude": 12.4964,
    "age": 3,
    "weight": 25,
    "description": "Friendly dog in the park",
    "photos": ["https://imgur.com/photo1.jpg"],
    "status": "verified",
    "registered_by": "4A2M4vB...",
    "verified_by": "4B2M4vC...",
    "created_at": "2026-07-29T12:00:00Z",
    "verified_at": "2026-07-29T12:30:00Z",
    "blockchain_tx": "a1b2c3d4..."
  }
}
2.4 List Animals

Endpoint: GET /api/animals

Query Parameters:
Parameter	Type	Description
latitude	float	Filter by latitude (center)
longitude	float	Filter by longitude (center)
radius	float	Search radius in km
species	string	Filter by species
animal_type	string	pet, livestock, wildlife, aquatic, insect
status	string	pending, verified, rejected
3. Error Codes
Code	Description
400	Bad Request - Invalid parameters
401	Unauthorized - Invalid API key
404	Not Found - Resource not found
409	Conflict - Duplicate entry
429	Rate Limit Exceeded
500	Internal Server Error
Error Response Example:
json

{
  "success": false,
  "error": {
    "code": 400,
    "message": "Invalid XMR address format",
    "details": "Address must start with 4 or 8"
  }
}

4. Webhooks
4.1 Configure Webhook

Endpoint: POST /api/webhooks

Request Body:
json

{
  "url": "https://your-server.com/webhook",
  "events": ["animal.verified", "animal.registered"],
  "secret": "your-webhook-secret"
}

4.2 Webhook Events
Event	Description
animal.registered	New animal registered
animal.verified	Animal verified
animal.updated	Animal details updated
reward.paid	Reward payment sent
conservation.funded	Conservation project funded
text

**Salva con `Ctrl+O`, `Invio`, `Ctrl+X`.**

---

### **10. Crea docs/verification.md**
```bash
nano docs/verification.md

Contenuto:
markdown

# 🔍 MyZubster Animal Verification Process

**Last Updated:** 2026-07-29

---

## 1. What is Verification?

Verification is the process of confirming that a registered animal actually exists and matches the provided information.

---

## 2. Verification Process

### 2.1 How It Works

1. **User registers an animal** with GPS coordinates, photos, and description
2. **Animal enters "pending_verification" status**
3. **Verifiers** (other users) can check the animal's existence
4. **Animal is marked as "verified"** when enough verifiers confirm it
5. **Rewards** are distributed to both registrar and verifiers

### 2.2 Verification Requirements

| Requirement | Description |
|-------------|-------------|
| **Photos** | At least 3 clear photos of the animal |
| **GPS** | Accurate GPS coordinates (within 10 meters) |
| **Species** | Correct identification (scientific name preferred) |
| **Location** | Publicly accessible or private with permission |
| **Date** | Must be recent (within 30 days) |

---

## 3. How to Verify an Animal

### 3.1 Steps for Verifiers

1. **Browse pending animals** on the map
2. **Select an animal** to verify
3. **Review the information** provided
4. **Visit the location** (if possible) or use satellite imagery
5. **Confirm the animal exists** and matches the description
6. **Submit your verification** with comments and evidence
7. **Earn 0.002 XMR** for each successful verification

### 3.2 Verification Criteria

| Criteria | Must Match |
|----------|------------|
| Species | The animal must be the same species as claimed |
| Location | The animal must be within 10m of the provided GPS |
| Photos | The photos must show the actual animal |
| Health | The animal should be alive and healthy |
| Access | The animal must be accessible |

---

## 4. Rewards for Verification

### 4.1 Verification Rewards

| Action | Reward (XMR) | Conditions |
|--------|--------------|------------|
| First Verification | 0.002 XMR | + 10% bonus |
| Additional Verifications | 0.002 XMR | Up to 5 per animal |
| Quality Bonus | Up to +0.001 XMR | High-quality verification |
| Fast Verification (first 48h) | +50% bonus | - |

### 4.2 Example Reward Calculation

**Scenario:** User verifies an animal within 24 hours with high-quality photos

| Component | Amount | Description |
|-----------|--------|-------------|
| Base Reward | 0.002 XMR | Standard verification |
| Fast Bonus (50%) | 0.001 XMR | Within 24 hours |
| Quality Bonus | 0.001 XMR | High-quality photos |
| **Total** | **0.004 XMR** | **≈ €0.80** |

---

## 5. Verification Best Practices

### 5.1 Tips for Verifiers

1. **Take multiple photos** - Show the animal from different angles
2. **Include a reference object** - Show scale
3. **Use GPS** - Confirm the location with a GPS app
4. **Check species** - Use animal identification apps
5. **Be objective** - Don't let emotions influence your verification

### 5.2 Tips for Registrars

1. **Provide clear photos** - Good lighting, multiple angles
2. **Verify GPS** - Double-check the location
3. **Use scientific names** - Avoid common name confusion
4. **Add context** - Describe the animal's environment
5. **Be patient** - Verification takes 7-14 days

---

## 6. Verification Tools

### 6.1 Recommended Apps

| Tool | Purpose |
|------|---------|
| **Google Maps** | GPS and satellite imagery |
| **iNaturalist** | Animal identification |
| **Seek** | Animal identification |
| **GeoSpy** | Location verification |
| **OpenStreetMap** | Map verification |

### 6.2 Verification Checklist

- [ ] GPS coordinates match the location
- [ ] Animal species is correctly identified
- [ ] Photos show the actual animal
- [ ] Animal is alive and healthy
- [ ] Location is accessible (or verified private)
- [ ] Age estimate is reasonable
- [ ] Weight estimate matches the photos

---

## 7. Dispute Resolution

### 7.1 How to Dispute a Verification

1. **Open a GitHub issue** with label `🔍 verification-dispute`
2. **Provide evidence** - Photos, GPS, descriptions
3. **Explain the dispute** - Why the verification is incorrect
4. **Wait for review** - Community moderators will investigate
5. **Get resolution** - Animal will be re-evaluated

### 7.2 Penalties for False Verification

| Offense | Penalty |
|---------|---------|
| First false verification | Warning |
| Second false verification | Loss of 0.01 XMR |
| Third false verification | Ban from verification |
| Systematic false verification | Permanent ban |

---

## 8. Frequently Asked Questions

**Q: How many verifications do I need to perform?**
A: You can perform as many as you want! Each verified animal earns you 0.002 XMR.

**Q: Can I verify my own animals?**
A: No, this is a conflict of interest.

**Q: How long does verification take?**
A: Usually 7-14 days.

**Q: Can I verify animals from satellite imagery?**
A: Yes, but only if you can clearly see the animal and confirm its species.

---

## 9. Contact for Verification Issues

- **GitHub:** https://github.com/DanielIoni-creator/myzubster-animal-registry/issues
- **Email:** verification@myzubster.com

---

**Thank you for helping maintain the integrity of the MyZubster animal registry! 🐾**

