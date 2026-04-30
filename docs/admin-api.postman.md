# Admin API — Postman Testing Guide

Base URL (local): `http://localhost:3000/api`
Base URL (prod): `https://backend.property-file.com/api`

All admin endpoints require:

```
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json
```

---

## 0. Login as Admin (get token)

**POST** `{{baseUrl}}/auth/login`

Body (raw → JSON):

```json
{
  "email": "admin@example.com",
  "password": "yourPassword"
}
```

Response includes `data.token` — copy it as `{{adminToken}}`.

> **Postman tip:** add to the _Tests_ tab so token is auto-saved:
>
> ```js
> const j = pm.response.json();
> if (j?.data?.token) pm.environment.set("adminToken", j.data.token);
> ```

---

## 1. List All Users (filter + search + pagination)

**GET** `{{baseUrl}}/admin/users`

### Query params (all optional)

| Param      | Example | Notes                                                  |
| ---------- | ------- | ------------------------------------------------------ |
| `role`     | `AGENT` | `USER` \| `ADMIN` \| `AGENT` \| `DEVELOPER` \| `OWNER` |
| `search`   | `john`  | Matches fullName / email / phoneNumber / companyName   |
| `page`     | `1`     | Default 1                                              |
| `pageSize` | `20`    | Default 20                                             |

### Examples

- All users: `GET /admin/users`
- Only agents: `GET /admin/users?role=AGENT`
- Search developers: `GET /admin/users?role=DEVELOPER&search=abc`
- Paginate: `GET /admin/users?page=2&pageSize=10`

### Headers

```
Authorization: Bearer {{adminToken}}
```

### Response

```json
{
  "success": true,
  "message": "Users fetched",
  "data": {
    "users": [
      {
        "id": "uuid",
        "fullName": "John Doe",
        "email": "john@example.com",
        "role": "AGENT",
        "isSuspended": false,
        "createdAt": "..."
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "countsByRole": {
      "USER": 25,
      "ADMIN": 1,
      "AGENT": 10,
      "DEVELOPER": 4,
      "OWNER": 2
    }
  }
}
```

---

## 2. Get Single User

**GET** `{{baseUrl}}/admin/users/:id`

### Headers

```
Authorization: Bearer {{adminToken}}
```

### Response

```json
{
  "success": true,
  "message": "User fetched",
  "data": {
    "id": "uuid",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "AGENT",
    "isSuspended": false,
    "_count": { "properties": 7 }
  }
}
```

---

## 3. Toggle Suspend / Unsuspend User

A single endpoint flips the user's suspension state — suspends if active, unsuspends if already suspended.

**PATCH** `{{baseUrl}}/admin/users/:id/toggle-suspend`

### Headers

```
Authorization: Bearer {{adminToken}}
```

Body: _(none)_

### Response (when user gets suspended)

```json
{
  "success": true,
  "message": "User suspended",
  "data": {
    "user": { "id": "uuid", "isSuspended": true },
    "suspended": true
  }
}
```

### Response (when user gets unsuspended)

```json
{
  "success": true,
  "message": "User unsuspended",
  "data": {
    "user": { "id": "uuid", "isSuspended": false },
    "suspended": false
  }
}
```

### Errors

| Code | Reason                       |
| ---- | ---------------------------- |
| 400  | Cannot suspend self          |
| 403  | Cannot suspend another admin |
| 404  | User not found               |

### Verify suspension blocks login

Login as a suspended user → returns `403`:

```json
{ "success": false, "message": "Account suspended" }
```

Same applies to `POST /auth/firebase-login`. After toggling again, login works normally.

---

## 4. List All Property Listings (admin overview)

**GET** `{{baseUrl}}/admin/listings`

### Query params (all optional)

| Param            | Example   | Notes                                                |
| ---------------- | --------- | ---------------------------------------------------- |
| `ownerRole`      | `AGENT`   | Filter by creator role                               |
| `approvalStatus` | `PENDING` | `PENDING` \| `PUBLISHED` \| `REJECTED` \| `FEATURED` |
| `search`         | `lagos`   | Matches title / location / propertyAddress           |
| `page`           | `1`       | Default 1                                            |
| `pageSize`       | `20`      | Default 20                                           |

### Examples

- All listings: `GET /admin/listings`
- Listings by AGENTs only: `GET /admin/listings?ownerRole=AGENT`
- Pending listings by DEVELOPERs: `GET /admin/listings?ownerRole=DEVELOPER&approvalStatus=PENDING`
- Search: `GET /admin/listings?search=lagos`

### Headers

```
Authorization: Bearer {{adminToken}}
```

### Response

```json
{
  "success": true,
  "message": "Listings fetched",
  "data": {
    "listings": [
      {
        "id": "uuid",
        "title": "...",
        "approvalStatus": "PENDING",
        "owner": {
          "id": "uuid",
          "fullName": "Agent A",
          "role": "AGENT",
          "isSuspended": false
        },
        "images": [{ "id": "uuid", "url": "..." }]
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20,
    "countsByCreatorRole": { "AGENT": 30, "DEVELOPER": 12, "OWNER": 8 },
    "countsByStatus": {
      "PENDING": 5,
      "PUBLISHED": 40,
      "REJECTED": 2,
      "FEATURED": 3
    }
  }
}
```

---

## Postman Environment Setup

Create environment with variables:

- `baseUrl` = `http://localhost:3000/api`
- `adminToken` = (auto-set after login via the Tests script above)

At the **collection level** set:

- Auth Type: `Bearer Token`
- Token: `{{adminToken}}`

All requests inherit it — no need to set headers per request.

---

## Quick End-to-End Test Flow

1. `POST /auth/login` (admin) → token auto-saved
2. `GET /admin/users` → verify list + `countsByRole`
3. `GET /admin/users?role=AGENT&search=john` → filtered
4. `GET /admin/users/:id` → single user detail
5. `PATCH /admin/users/:id/toggle-suspend` → suspend a non-admin user
6. `POST /auth/login` as that user → expect `403 Account suspended`
7. `PATCH /admin/users/:id/toggle-suspend` → unsuspends
8. `POST /auth/login` as that user → succeeds
9. `GET /admin/listings` → all listings + counts
10. `GET /admin/listings?ownerRole=AGENT&approvalStatus=PENDING` → filtered
