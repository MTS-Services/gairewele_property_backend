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

   | Variable     | Initial value           |
   | ------------ | ----------------------- |
   | `baseUrl`    | `http://localhost:3000` |
   | `token`      | _(leave empty)_         |
   | `resetToken` | _(leave empty)_         |

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

> **Content-Type:** `multipart/form-data` (use Postman's **Body → form-data** tab)

### 3a. Register as User

| Key        | Type | Required | Notes                                     |
| ---------- | ---- | -------- | ----------------------------------------- |
| `fullName` | Text | Yes      |                                           |
| `email`    | Text | Yes      |                                           |
| `password` | Text | Yes      |                                           |
| `image`    | File | No       | Profile photo (jpg/png/gif/webp, max 5MB) |

### 3b. Register as Agent / Developer / Owner

| Key              | Type | Required | Notes                            |
| ---------------- | ---- | -------- | -------------------------------- |
| `fullName`       | Text | Yes      |                                  |
| `email`          | Text | Yes      |                                  |
| `password`       | Text | Yes      |                                  |
| `role`           | Text | Yes      | `AGENT`, `DEVELOPER`, or `OWNER` |
| `phoneNumber`    | Text | Yes      |                                  |
| `whatsappNumber` | Text | No       | Optional — can be omitted/empty  |
| `companyName`    | Text | No       | Optional                         |
| `website`        | Text | No       | Optional — can be omitted/empty  |
| `image`          | File | No       | Profile photo (max 5MB)          |
| `companyLogo`    | File | No       | Optional company/website logo    |

**Response 201**

```json
{
  "success": true,
  "message": "AGENT registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "fullName": "Jane Agent",
      "email": "jane@example.com",
      "role": "AGENT",
      "image": "https://backend.property-file.com/uploads/1714298400000-abc123.jpg",
      "companyLogo": "https://backend.property-file.com/uploads/1714298400001-def456.png",
      "...": "..."
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

Step 1 — Create a Firebase test user
Go to Firebase Console → Authentication → Users → Add User

Enter any email + password, e.g.:

Email: test@example.com
Password: Test1234!
Step 2 — Get the ID token via Postman
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDSZeI6VCobrbhf6izz8j4_s-f7WTkwoJg

## 5. Firebase Login (Google / Facebook / etc)

**POST** `{{baseUrl}}/api/auth/firebase-login`

Frontend flow:

1. Use Firebase Web SDK to sign in with Google (or any provider)
2. Get the ID token: `const idToken = await user.getIdToken()`
3. Send that token to this backend endpoint

**Backend expects:**

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
| `idToken`  | Yes      | Firebase ID token from client SDK (from `user.getIdToken()`)                                   |
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
      "email": "shanjidahmed66@gmail.com",
      "fullName": "shanjid ahmed",
      "image": "https://lh3.googleusercontent.com/a/ACg8ocJLWjxoAXh6kHu2vKAWT-p4TflBI3uAzIl6IvsuWg6AAmdB8g=s96-c",
      "provider": "FIREBASE",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Testing in Postman:**

1. Frontend signs in with Google → gets `idToken`
2. Copy that token from browser console: `firebase.auth().currentUser.getIdToken().then(t => console.log(t))`
3. In Postman, **POST** to `http://localhost:3000/api/auth/firebase-login`
4. **Body** (raw JSON):

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImVlOTA0NmVhZDJlMDUwMDAxMGVkNTA0M2I0ODNkODRiMGM1MmM3YzQiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoic2hhbmppZCBhaG1lZCIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NKTFdqeG9BWGg2a0h1MnZLQVdULXA0VGZsQkkzdUF6SWw2SXZzdVdnNkFBbWRCOGc9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcHJvcGVydHktcHJvamVjdC0zNTAyZCIsImF1ZCI6InByb3BlcnR5LXByb2plY3QtMzUwMmQiLCJhdXRoX3RpbWUiOjE3ODE5NDU1NDIsInVzZXJfaWQiOiJ5cjJ6U0ZiOXlQZXd3ME1sN1pQOHRJSG8yUmYyIiwic3ViIjoieXIyelNGYjl5UGV3dzBNbDdaUDh0SUhvMlJmMiIsImlhdCI6MTc4MTk0NTU0MiwiZXhwIjoxNzgxOTQ5MTQyLCJlbWFpbCI6InNoYW5qaWRhaG1lZDY2QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTAxMTM2NzMyNjE3MjczODM4NDI1Il0sImVtYWlsIjpbInNoYW5qaWRhaG1lZDY2QGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.pvu87d-9g6D4RM0Kp8ZL1-KPHNpbUUCZFFMZmVGRt-AUiEHEBDpGNdHSl-_3vIznZDZN5Vhg2C8x6xImTch6E8RT8peXGpOFahTBWQyrY7BA4gY5hVISLA8x0mPSGAyVQdUrlqj0mt56t3e1zvR_x095Ijef7AgZTDtTTGwws84zfEaJFykkmdgOiyqFGCYPK4IfF4dUhXlls_4brBTW7goliz1THAtwSOpoGwwDH3qhl5uaAUtUFB7l7d7EvM5Kbn0O1A84iX92OPsbwlxW_mqRWxLXnrUUVHRMAG_smBAFXRXSPrPKe5LTXKf0EruthI_nf6aHNrTXBlmOrq-kbA",
  "role": "USER"
}
```

5. Send → you get back your backend JWT token in `data.token`

**Errors**

- `400` — `idToken` missing or Firebase token has no email
- `401` — invalid Firebase ID token
- `500` — Firebase admin not configured (verify `FIREBASE_SERVICE_ACCOUNT` is in `.env`)

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

## 7. Update Profile _(Protected)_

**PATCH** `{{baseUrl}}/api/auth/profile`

> **Content-Type:** `multipart/form-data` (use Postman's **Body → form-data** tab)

**Headers**

```
Authorization: Bearer {{token}}
```

Send only the fields you want to update. All fields are optional.

| Key              | Type | Notes                                     |
| ---------------- | ---- | ----------------------------------------- |
| `fullName`       | Text |                                           |
| `phoneNumber`    | Text |                                           |
| `whatsappNumber` | Text |                                           |
| `companyName`    | Text |                                           |
| `website`        | Text |                                           |
| `image`          | File | Profile photo (jpg/png/gif/webp, max 5MB) |
| `companyLogo`    | File | Company logo (max 5MB)                    |

**Response 200**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "fullName": "Jane Updated",
      "image": "https://backend.property-file.com/uploads/1714298400000-abc123.jpg",
      "companyLogo": "https://backend.property-file.com/uploads/1714298400001-def456.png",
      "phoneNumber": "+1234567890",
      "...": "..."
    }
  }
}
```

**Errors**

- `400` — No valid fields provided to update
- `400` — Only image files are allowed
- `401` — unauthorized

---

## 8. Change Password _(Protected)_

**PATCH** `{{baseUrl}}/api/auth/change-password`

**Headers**

```
Authorization: Bearer {{token}}
```

**Body**

```json
{
  "oldPassword": "OldPa$$w0rd123",
  "newPassword": "NewPa$$w0rd123",
  "confirmPassword": "NewPa$$w0rd123"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {}
}
```

**Errors**

- `400` — oldPassword, newPassword and confirmPassword are required
- `400` — newPassword must be at least 6 characters
- `400` — Passwords do not match
- `400` — Old password is incorrect
- `400` — This account uses social login and has no password to change
- `401` — unauthorized

---

## 9. Forgot Password — Request OTP

**POST** `{{baseUrl}}/api/auth/forgot-password`

Sends a **5-digit OTP** to the provided email. Valid for **10 minutes**.

**Body**

```json
{
  "email": "john@example.com"
}
```

**Response 200** _(always succeeds to avoid email enumeration)_

```json
{
  "success": true,
  "message": "If that email is registered, an OTP has been sent",
  "data": {}
}
```

**Errors**

- `400` — email is required

---

## 10. Resend OTP

**POST** `{{baseUrl}}/api/auth/resend-otp`

Invalidates the previous OTP and sends a fresh one.

**Body**

```json
{
  "email": "john@example.com"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "If that email is registered, a new OTP has been sent",
  "data": {}
}
```

**Errors**

- `400` — email is required

---

## 11. Verify OTP

**POST** `{{baseUrl}}/api/auth/verify-otp`

Checks the OTP and — if valid — returns a short-lived **resetToken** (valid 15 minutes).  
Pass this token to the reset-password step. The OTP is consumed and cannot be reused.

**Body**

```json
{
  "email": "john@example.com",
  "otp": "48291"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OTP verified. Use the resetToken to set your new password.",
  "data": {
    "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> Add this to the **Tests** tab in Postman to auto-save the reset token:
>
> ```js
> const res = pm.response.json();
> if (res?.data?.resetToken) {
>   pm.collectionVariables.set("resetToken", res.data.resetToken);
> }
> ```

**Errors**

- `400` — email and otp are required
- `400` — Invalid OTP
- `400` — OTP has expired

---

## 12. Reset Password

**POST** `{{baseUrl}}/api/auth/reset-password`

Send the `resetToken` as a **Bearer token** in the Authorization header.  
Body only needs `newPassword` and `confirmPassword`.

**Headers**

```
Authorization: Bearer {{resetToken}}
```

**Body**

```json
{
  "newPassword": "NewPa$$w0rd123",
  "confirmPassword": "NewPa$$w0rd123"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {}
}
```

**Errors**

- `400` — newPassword and confirmPassword are required
- `400` — newPassword must be at least 6 characters
- `400` — Passwords do not match
- `400` — Reset token missing (no Authorization header)
- `400` — Reset token is invalid or expired (token older than 15 minutes)

---

## Forgot Password — Full Flow

```
1. POST /api/auth/forgot-password   { email }                                      → OTP sent to email
2. Check email inbox for 5-digit OTP
3. POST /api/auth/verify-otp        { email, otp }                        → returns resetToken
4. POST /api/auth/reset-password    { newPassword, confirmPassword }      → Authorization: Bearer {{resetToken}}
```

> If OTP expired or not received:  
> `POST /api/auth/resend-otp { email }` → new OTP sent, old one invalidated

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

| Method | URL                         | Auth | Description                        |
| ------ | --------------------------- | ---- | ---------------------------------- |
| GET    | `/`                         | No   | Server status                      |
| GET    | `/api/health`               | No   | Health check                       |
| POST   | `/api/auth/register`        | No   | Register (all roles)               |
| POST   | `/api/auth/login`           | No   | Login with email + password        |
| POST   | `/api/auth/firebase-login`  | No   | Login with Firebase ID token       |
| GET    | `/api/auth/me`              | Yes  | Get current logged-in user         |
| PATCH  | `/api/auth/profile`         | Yes  | Update profile                     |
| PATCH  | `/api/auth/change-password` | Yes  | Change password (logged in)        |
| POST   | `/api/auth/forgot-password` | No   | Send OTP to email                  |
| POST   | `/api/auth/resend-otp`      | No   | Resend fresh OTP                   |
| POST   | `/api/auth/verify-otp`      | No   | Verify OTP → get resetToken        |
| POST   | `/api/auth/reset-password`  | No   | Reset password (Bearer resetToken) |

---

## Run the Server

```powershell
npm run dev    # development with auto-reload (nodemon)
npm start      # production
```

Server: `http://localhost:3000`
