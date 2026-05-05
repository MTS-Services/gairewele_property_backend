# Property Requests API — Postman Testing Guide

Base URL (local): `http://localhost:3000/api`
Base URL (prod): `https://backend.property-file.com/api`

---

## Roles & Access

| Endpoint                              | Who can call                                   |
| ------------------------------------- | ---------------------------------------------- |
| `POST /property-requests`             | USER only                                      |
| `GET /property-requests/my`           | USER only — own requests + dashboard stats     |
| `GET /property-requests`              | AGENT, DEVELOPER, OWNER                        |
| `GET /property-requests/:id`          | Any authenticated user (USER can only see own) |
| `PATCH /property-requests/:id/status` | AGENT, DEVELOPER, OWNER                        |

---

## 0. Login & Save Token

### Login as USER

**POST** `{{baseUrl}}/auth/login`

```json
{ "email": "user@example.com", "password": "password123" }
```

Postman _Tests_ tab:

```js
const j = pm.response.json();
if (j?.data?.token) pm.environment.set("userToken", j.data.token);
```

### Login as AGENT / DEVELOPER / OWNER

**POST** `{{baseUrl}}/auth/login`

```json
{ "email": "agent@example.com", "password": "password123" }
```

Postman _Tests_ tab:

```js
const j = pm.response.json();
if (j?.data?.token) pm.environment.set("agentToken", j.data.token);
```

---

## 1. Submit Property Request (USER)

**POST** `{{baseUrl}}/property-requests`

### Headers

```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

### Body

```json
{
  "propertyType": "APARTMENT",
  "preferredLocation": "Manhattan, New York",
  "bedrooms": 3,
  "bathrooms": 2,
  "budgetMin": 500000,
  "budgetMax": 750000,
  "areaMin": 1200,
  "areaMax": 1500,
  "preferredMoveInDate": "2026-06-01T00:00:00",
  "fullName": "John Anderson",
  "email": "john.anderson@example.com",
  "phoneNumber": "+1 (555) 123-4567",
  "preferences": "Looking for a modern apartment with a balcony and parking. Pet-friendly building preferred."
}
```

### Required fields

| Field               | Type   | Notes                  |
| ------------------- | ------ | ---------------------- |
| `propertyType`      | String | See valid values below |
| `preferredLocation` | String | City, area, or address |
| `bedrooms`          | Number |                        |
| `bathrooms`         | Number |                        |
| `budgetMin`         | Number | In local currency      |
| `budgetMax`         | Number |                        |
| `areaMin`           | Number | In sq ft               |
| `areaMax`           | Number |                        |
| `fullName`          | String | Contact name           |
| `email`             | String | Contact email          |
| `phoneNumber`       | String | Contact phone          |

### Optional fields

| Field                 | Type     | Notes                            |
| --------------------- | -------- | -------------------------------- |
| `preferredMoveInDate` | DateTime | ISO 8601 — `2026-06-01T00:00:00` |
| `preferences`         | String   | Additional requirements / notes  |

### Valid `propertyType` values

`APARTMENT` `HOUSE` `VILLA` `PENTHOUSE` `STUDIO` `TOWNHOUSE` `DETACHED` `SEMI_DETACHED` `TERRACE` `FLAT` `OFFICE_SPACE` `OTHERS`

### Response (201)

```json
{
  "success": true,
  "message": "Property request submitted",
  "data": {
    "id": "uuid",
    "propertyType": "APARTMENT",
    "preferredLocation": "Manhattan, New York",
    "bedrooms": 3,
    "bathrooms": 2,
    "budgetMin": "500000",
    "budgetMax": "750000",
    "areaMin": 1200,
    "areaMax": 1500,
    "preferredMoveInDate": "2026-06-01T00:00:00.000Z",
    "fullName": "John Anderson",
    "email": "john.anderson@example.com",
    "phoneNumber": "+1 (555) 123-4567",
    "preferences": "Looking for a modern apartment...",
    "status": "NEW",
    "userId": "uuid",
    "createdAt": "2026-05-03T10:00:00.000Z",
    "updatedAt": "2026-05-03T10:00:00.000Z"
  }
}
```

Postman _Tests_ tab — save the request ID:

```js
const j = pm.response.json();
if (j?.data?.id) pm.environment.set("requestId", j.data.id);
```

---

## 2. My Request History + Dashboard Stats (USER)

**GET** `{{baseUrl}}/property-requests/my`

### Headers

```
Authorization: Bearer {{userToken}}
```

### Query params (all optional)

| Param      | Example | Notes                              |
| ---------- | ------- | ---------------------------------- |
| `status`   | `NEW`   | `NEW` / `IN_PROCESS` / `COMPLETED` |
| `page`     | `1`     | Default 1                          |
| `pageSize` | `20`    | Default 20                         |

### Examples

- All: `GET /property-requests/my`
- Pending only: `GET /property-requests/my?status=NEW`
- Completed: `GET /property-requests/my?status=COMPLETED`

### Response

```json
{
  "success": true,
  "message": "Requests fetched",
  "data": {
    "stats": {
      "totalRequests": 24,
      "pendingActions": 3,
      "upcomingViewings": 2
    },
    "requests": [
      {
        "id": "uuid",
        "propertyType": "APARTMENT",
        "preferredLocation": "Manhattan, New York",
        "status": "NEW",
        "createdAt": "2026-05-03T10:00:00.000Z"
      }
    ],
    "total": 24,
    "page": 1,
    "pageSize": 20
  }
}
```

| Stats field        | Maps to dashboard                                                          |
| ------------------ | -------------------------------------------------------------------------- |
| `totalRequests`    | TOTAL REQUESTS (24)                                                        |
| `pendingActions`   | PENDING ACTIONS (03)                                                       |
| `upcomingViewings` | UPCOMING VIEWINGS (02) — requests with `preferredMoveInDate` in the future |

---

## 3. All Property Requests (AGENT / DEVELOPER / OWNER)

**GET** `{{baseUrl}}/property-requests`

### Headers

```
Authorization: Bearer {{agentToken}}
```

### Query params (all optional)

| Param      | Example     | Notes                                                     |
| ---------- | ----------- | --------------------------------------------------------- |
| `status`   | `NEW`       | `NEW` / `IN_PROCESS` / `COMPLETED`                        |
| `search`   | `Manhattan` | Searches fullName, email, preferredLocation, propertyType |
| `page`     | `1`         | Default 1                                                 |
| `pageSize` | `20`        | Default 20                                                |

### Examples

- All: `GET /property-requests`
- New only (tab): `GET /property-requests?status=NEW`
- In progress (tab): `GET /property-requests?status=IN_PROCESS`
- Completed (tab): `GET /property-requests?status=COMPLETED`
- Search: `GET /property-requests?search=john`

### Response

```json
{
  "success": true,
  "message": "Requests fetched",
  "data": {
    "requests": [
      {
        "id": "uuid",
        "propertyType": "APARTMENT",
        "preferredLocation": "Manhattan, New York",
        "bedrooms": 3,
        "bathrooms": 2,
        "budgetMin": "500000",
        "budgetMax": "750000",
        "areaMin": 1200,
        "areaMax": 1500,
        "fullName": "John Anderson",
        "email": "john.anderson@example.com",
        "phoneNumber": "+1 (555) 123-4567",
        "status": "NEW",
        "createdAt": "2026-04-15T00:00:00.000Z",
        "user": {
          "id": "uuid",
          "fullName": "John Anderson",
          "email": "john.anderson@example.com",
          "image": null
        }
      }
    ],
    "total": 24,
    "page": 1,
    "pageSize": 20,
    "countsByStatus": {
      "NEW": 8,
      "IN_PROCESS": 12,
      "COMPLETED": 4
    }
  }
}
```

`countsByStatus` drives the tab counts: **All (24)**, **New (8)**, **In Progress (12)**, **Completed (4)**

---

## 4. Get Single Request Details

**GET** `{{baseUrl}}/property-requests/{{requestId}}`

### Headers

```
Authorization: Bearer {{agentToken}}
```

_(or `{{userToken}}` — USER can only access their own)_

### Response

```json
{
  "success": true,
  "message": "Request fetched",
  "data": {
    "id": "uuid",
    "propertyType": "APARTMENT",
    "preferredLocation": "Manhattan, New York",
    "bedrooms": 3,
    "bathrooms": 2,
    "budgetMin": "500000",
    "budgetMax": "750000",
    "areaMin": 1200,
    "areaMax": 1500,
    "preferredMoveInDate": "2026-06-01T00:00:00.000Z",
    "fullName": "John Anderson",
    "email": "john.anderson@example.com",
    "phoneNumber": "+1 (555) 123-4567",
    "preferences": "Looking for a modern apartment with a balcony and parking.",
    "status": "NEW",
    "user": {
      "id": "uuid",
      "fullName": "John Anderson",
      "email": "john.anderson@example.com",
      "image": null
    },
    "createdAt": "2026-04-15T00:00:00.000Z",
    "updatedAt": "2026-04-15T00:00:00.000Z"
  }
}
```

---

## 5. Update Request Status (AGENT / DEVELOPER / OWNER)

**PATCH** `{{baseUrl}}/property-requests/{{requestId}}/status`

### Headers

```
Authorization: Bearer {{agentToken}}
Content-Type: application/json
```

### Body

```json
{ "status": "IN_PROCESS" }
```

### Valid status values

| Value        | Meaning                          |
| ------------ | -------------------------------- |
| `NEW`        | Just submitted, not yet acted on |
| `IN_PROCESS` | Agent is actively working on it  |
| `COMPLETED`  | Request fulfilled                |

### Response

```json
{
  "success": true,
  "message": "Request status updated to IN_PROCESS",
  "data": {
    "id": "uuid",
    "status": "IN_PROCESS",
    "updatedAt": "2026-05-03T11:00:00.000Z"
  }
}
```

---

## Postman Environment Variables

| Variable     | Set by                                     |
| ------------ | ------------------------------------------ |
| `baseUrl`    | Manual — `http://localhost:3000/api`       |
| `userToken`  | Login (USER) Tests script                  |
| `agentToken` | Login (AGENT/DEVELOPER/OWNER) Tests script |
| `requestId`  | Create request Tests script                |

---

## Quick End-to-End Flow

1. Login as USER → `userToken` saved
2. `POST /property-requests` → submit request, `requestId` saved
3. `GET /property-requests/my` → see stats (totalRequests, pendingActions, upcomingViewings)
4. Login as AGENT → `agentToken` saved
5. `GET /property-requests` → see all requests + tab counts (countsByStatus)
6. `GET /property-requests?status=NEW` → filter to New tab
7. `GET /property-requests/{{requestId}}` → view full request details
8. `PATCH /property-requests/{{requestId}}/status` with `{ "status": "IN_PROCESS" }` → move to In Progress
9. `PATCH /property-requests/{{requestId}}/status` with `{ "status": "COMPLETED" }` → complete
10. `GET /property-requests/my` (as USER) → stats updated, status reflects change
