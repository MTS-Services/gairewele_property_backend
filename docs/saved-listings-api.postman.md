# Saved Listings API — Postman Testing Guide

Base URL (local): `http://localhost:3000/api`
Base URL (prod): `https://backend.property-file.com/api`

All routes require a valid token (any role).

---

## 0. Login & Save Token

**POST** `{{baseUrl}}/auth/login`

```json
{ "email": "user@example.com", "password": "password123" }
```

Postman _Tests_ tab:

```js
const j = pm.response.json();
if (j?.data?.token) pm.environment.set("userToken", j.data.token);
```

---

## 1. Toggle Save / Unsave (same endpoint)

**POST** `{{baseUrl}}/saved-listings/{{propertyId}}`

### Headers

```
Authorization: Bearer {{userToken}}
```

- First call → **saves** the listing
- Second call on the same property → **unsaves** it

### Response — Saved

```json
{
  "success": true,
  "message": "Listing saved",
  "data": {
    "saved": true,
    "propertyId": "uuid"
  }
}
```

### Response — Unsaved

```json
{
  "success": true,
  "message": "Listing unsaved",
  "data": {
    "saved": false,
    "propertyId": "uuid"
  }
}
```

Postman _Tests_ tab — save the property ID:

```js
const j = pm.response.json();
if (j?.data?.propertyId) pm.environment.set("propertyId", j.data.propertyId);
```

---

## 2. Get All Saved Listings

**GET** `{{baseUrl}}/saved-listings`

### Headers

```
Authorization: Bearer {{userToken}}
```

### Query params (optional)

| Param      | Example | Notes      |
| ---------- | ------- | ---------- |
| `page`     | `1`     | Default 1  |
| `pageSize` | `20`    | Default 20 |

### Response

```json
{
  "success": true,
  "message": "Saved listings fetched",
  "data": {
    "savedListings": [
      {
        "id": "uuid",
        "userId": "uuid",
        "propertyId": "uuid",
        "createdAt": "2026-05-05T10:00:00.000Z",
        "property": {
          "id": "uuid",
          "title": "Luxury Apartment in Manhattan",
          "location": "Manhattan, New York",
          "askingPrice": "750000",
          "propertyType": "APARTMENT",
          "listingType": "FOR_SALE",
          "images": [{ "url": "https://..." }]
        }
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 3. Get Single Saved Listing

**GET** `{{baseUrl}}/saved-listings/{{propertyId}}`

### Headers

```
Authorization: Bearer {{userToken}}
```

Returns full property details with all images. Returns `404` if the property is not in your saved list.

### Response

```json
{
  "success": true,
  "message": "Saved listing fetched",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "propertyId": "uuid",
    "createdAt": "2026-05-05T10:00:00.000Z",
    "property": {
      "id": "uuid",
      "title": "Luxury Apartment in Manhattan",
      "description": "...",
      "propertyType": "APARTMENT",
      "location": "Manhattan, New York",
      "askingPrice": "750000",
      "listingType": "FOR_SALE",
      "images": [{ "id": "uuid", "url": "https://..." }]
    }
  }
}
```

---

## Postman Environment Variables

| Variable     | Set by                                               |
| ------------ | ---------------------------------------------------- |
| `baseUrl`    | Manual — `http://localhost:3000/api`                 |
| `userToken`  | Login Tests script                                   |
| `propertyId` | Any property ID from listings or toggle Tests script |

---

## Quick End-to-End Flow

1. `POST /auth/login` → `userToken` saved
2. Get a `propertyId` from `GET /properties` (public listing)
3. `POST /saved-listings/{{propertyId}}` → `{ "saved": true }` — listing saved
4. `GET /saved-listings` → see all saved listings
5. `GET /saved-listings/{{propertyId}}` → see full property details
6. `POST /saved-listings/{{propertyId}}` again → `{ "saved": false }` — listing unsaved
7. `GET /saved-listings/{{propertyId}}` → returns `404` (no longer saved)
