# Animal Registry API Documentation

## 📋 Overview

L'Animal Registry API permette di registrare e gestire animali sulla blockchain MyZubster.

## 🔗 Base URL

https://myzubster-gateway.vercel.app/api/animals
text


## 🔐 Autenticazione

Tutte le richieste devono includere un token di autenticazione nell'header:

Authorization: Bearer <YOUR_TOKEN>
text


## 📚 Endpoints

### 1. Registra un animale

**POST** `/api/animals/register`

Registra un nuovo animale nel sistema.

#### Request Body

```json
{
  "name": "string",
  "species": "string",
  "breed": "string (opzionale)",
  "age": "number (opzionale)",
  "weight": "number (opzionale)",
  "nfc_tag": "string (opzionale)",
  "owner_id": "string",
  "location": {
    "latitude": "number (opzionale)",
    "longitude": "number (opzionale)"
  }
}

Response
json

{
  "success": true,
  "animal_id": "string",
  "transaction_hash": "string",
  "timestamp": "ISO date string"
}

Esempio
bash

curl -X POST https://myzubster-gateway.vercel.app/api/animals/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fido",
    "species": "Canis lupus familiaris",
    "breed": "Golden Retriever",
    "age": 3,
    "weight": 25.5,
    "nfc_tag": "04:8A:2B:3C:4D:5E",
    "owner_id": "user_123",
    "location": {
      "latitude": 41.9028,
      "longitude": 12.4964
    }
  }'

2. Recupera dettagli animale

GET /api/animals/:id

Recupera i dettagli di un animale specifico.
Response
json

{
  "success": true,
  "animal": {
    "id": "string",
    "name": "string",
    "species": "string",
    "breed": "string",
    "age": "number",
    "weight": "number",
    "nfc_tag": "string",
    "owner_id": "string",
    "location": {
      "latitude": "number",
      "longitude": "number"
    },
    "registered_at": "ISO date string",
    "blockchain_tx": "string"
  }
}

3. Scansione NFC

POST /api/animals/nfc/scan

Registra una scansione NFC per un animale.
Request Body
json

{
  "nfc_tag": "string",
  "location": {
    "latitude": "number",
    "longitude": "number"
  },
  "scanner_id": "string"
}

4. Cerca animali

GET /api/animals/search

Cerca animali per nome, specie o tag NFC.
Query Parameters
Parameter	Type	Description
q	string	Termine di ricerca
species	string	Filtra per specie
owner_id	string	Filtra per proprietario
📊 Modelli Dati
Animal Object
typescript

interface Animal {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  nfc_tag?: string;
  owner_id: string;
  location: {
    latitude: number;
    longitude: number;
  };
  registered_at: string;
  blockchain_tx: string;
  verified: boolean;
}

👽 Pytho documenta ogni animale! 🐾
