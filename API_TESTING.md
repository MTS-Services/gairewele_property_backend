# Gairewele Backend — API Testing Guide (Postman)

Base URL: `http://localhost:3000`  
API prefix: `http://localhost:3000/api`

All request/response bodies are **JSON**.  
Authenticated endpoints require this header:

```
Authorization: Bearer <JWT_TOKEN>
```

The token is returned by register / login. It expires in **30 days**.

---

## Postman Quick Setup

1. Create a new Postman **Collection** named `Gairewele Backend`.
2. Go to the collection → **Variables** tab, add:

   | Variable  | Initial value           |
   | --------- | ----------------------- |
   | `baseUrl` | `http://localhost:3000` |
   | `token`   | _(leave empty)_         |

3. On every **register** and **login** request, add this to the **Tests** tab to auto-save the token:

   ```js
   const res = pm.response.json();
   if (res?.data?.token) {
     pm.collectionVariables.set("token", res.data.token);
   }
   ```

4. For protected requests, set the **Authorization** tab to:
   - Type: `Bearer Token`
   - Token: `{{token}}`

---

## 1. Server Root

**GET** `{{baseUrl}}/`

Confirms the server is running.

**Response 200**

```json
{
  "success": true,
  "message": "Gairewele Backend API is running",
  "version": "1.0.0",
  "docs": "/api/health"
}
```

---

## 2. Health Check

**GET** `{{baseUrl}}/api/health`

**Response 200**

```json
{ "status": "ok" }
```

---

## 3. Register

**POST** `{{baseUrl}}/api/auth/register`

One endpoint handles all roles. Pass `role` to set the account type.  
If `role` is omitted it defaults to `USER`.

### 3a. Register as User

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "Pa$$w0rd123",
  "image": "https://example.com/avatar.png"
}
```

Required: `fullName`, `email`, `password`  
Optional: `image`

### 3b. Register as Agent

```json
{
  "fullName": "Jane Agent",
  "email": "jane.agent@example.com",
  "password": "Pa$$w0rd123",
  "role": "AGENT",
  "phoneNumber": "+1234567890",
  "image": "https://example.com/avatar.png",
  "whatsappNumber": "+1234567890",
  "companyName": "Doe Realty",
  "website": "https://doerealty.com",
  "companyLogo": "https://example.com/logo.png"
}
```

### 3c. Register as Developer

Same as Agent body but `"role": "DEVELOPER"`.

### 3d. Register as Owner

Same as Agent body but `"role": "OWNER"`.

> **Role rules:**  
> `USER` → required: `fullName`, `email`, `password`  
> `AGENT` / `DEVELOPER` / `OWNER` → also required: `phoneNumber`

**Response 201**

```json
{
  "success": true,
  "message": "USER registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "provider": "LOCAL",
      "image": null,
      "phoneNumber": null,
      "whatsappNumber": null,
      "companyName": null,
      "website": null,
      "companyLogo": null,
      "isActive": true,
      "isSuspended": false,
      "createdAt": "2026-04-28T10:00:00.000Z",
      "updatedAt": "2026-04-28T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors**

- `400` — missing required fields or missing `phoneNumber` for professional role
- `409` — email already in use

---

## 4. Login

**POST** `{{baseUrl}}/api/auth/login`

Works for all roles.

**Body**

```json
{
  "email": "john@example.com",
  "password": "Pa$$w0rd123"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "provider": "LOCAL",
      "isActive": true,
      "isSuspended": false,
      "createdAt": "2026-04-28T10:00:00.000Z",
      "updatedAt": "2026-04-28T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors**

- `400` — missing email or password
- `401` — invalid email or password
- `403` — account suspended

---

## 5. Firebase Login

**POST** `{{baseUrl}}/api/auth/firebase-login`

Use the Firebase Web SDK on the client to sign in and call `user.getIdToken()`,
then send that token here.

**Body**

```json
{
  "idToken": "FIREBASE_ID_TOKEN_FROM_CLIENT",
  "role": "USER",
  "fullName": "Optional Name Override",
  "image": "https://example.com/avatar.png"
}
```

| Field      | Required | Notes                                                                                          |
| ---------- | -------- | ---------------------------------------------------------------------------------------------- |
| `idToken`  | Yes      | Firebase ID token from client SDK                                                              |
| `role`     | No       | Used only on first sign-in. Allowed: `USER`, `AGENT`, `DEVELOPER`, `OWNER`. Defaults to `USER` |
| `fullName` | No       | Fallback if Firebase token has no display name                                                 |
| `image`    | No       | Fallback if Firebase token has no photo URL                                                    |

**Response 200**

```json
{
  "success": true,
  "message": "Firebase login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@gmail.com",
      "provider": "FIREBASE",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors**

- `400` — `idToken` missing or Firebase token has no email
- `401` — invalid Firebase ID token
- `500` — Firebase admin not configured (add `FIREBASE_SERVICE_ACCOUNT` to `.env`)

---

## 6. Get Current User _(Protected)_

**GET** `{{baseUrl}}/api/auth/me`

**Headers**

```
Authorization: Bearer {{token}}
```

No request body.

**Response 200**

```json
{
  "success": true,
  "message": "Current user",
  "data": {
    "user": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "provider": "LOCAL",
      "image": null,
      "phoneNumber": null,
      "whatsappNumber": null,
      "companyName": null,
      "website": null,
      "companyLogo": null,
      "isActive": true,
      "isSuspended": false,
      "createdAt": "2026-04-28T10:00:00.000Z",
      "updatedAt": "2026-04-28T10:00:00.000Z"
    }
  }
}
```

**Errors**

- `401` — token missing, invalid, or expired
- `403` — account suspended

---

## Error Response Format

```json
{
  "success": false,
  "message": "Human readable error description"
}
```

| Code  | Meaning                                     |
| ----- | ------------------------------------------- |
| `400` | Validation error / bad request              |
| `401` | Unauthorized — invalid or missing token     |
| `403` | Forbidden — suspended account or wrong role |
| `404` | Route not found                             |
| `409` | Conflict — email already in use             |
| `500` | Internal server error                       |

---

## All Endpoints Summary

| Method | URL                        | Auth | Description                  |
| ------ | -------------------------- | ---- | ---------------------------- |
| GET    | `/`                        | No   | Server status                |
| GET    | `/api/health`              | No   | Health check                 |
| POST   | `/api/auth/register`       | No   | Register (all roles)         |
| POST   | `/api/auth/login`          | No   | Login with email + password  |
| POST   | `/api/auth/firebase-login` | No   | Login with Firebase ID token |
| GET    | `/api/auth/me`             | Yes  | Get current logged-in user   |

---

## Run the Server

```powershell
npm run dev    # development with auto-reload (nodemon)
npm start      # production
```

Server: `http://localhost:3000`
