# Animal Registry API Documentation

## 📋 Overview
L'Animal Registry API permette di registrare e gestire animali sulla blockchain MyZubster.

## 🔗 Base URL
https://myzubster-gateway.vercel.app/api/animals

## 📚 Endpoints

### 1. Registra un animale
**POST** `/api/animals/register`

Request Body:
```json
{
  "name": "string",
  "species": "string",
  "owner_id": "string"
}
2. Recupera dettagli animale

GET /api/animals/:id
3. Scansione NFC

POST /api/animals/nfc/scan
4. Cerca animali

GET /api/animals/search?q=term

👽 Pytho documenta ogni animale! 🐾
