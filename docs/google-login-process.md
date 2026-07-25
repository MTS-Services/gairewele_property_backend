# Google Login Process (Firebase)

This project does **not** call Google OAuth directly on the backend.  
Google login works through **Firebase Authentication**:

1. Frontend signs in with Google via Firebase Web SDK  
2. Frontend gets a Firebase `idToken`  
3. Backend verifies that token with Firebase Admin SDK  
4. Backend creates/finds the user and returns its own JWT  

Use this guide to implement the same flow in another project.

---

## Architecture Overview

```text
User clicks "Continue with Google"
        │
        ▼
Frontend (Firebase Web SDK)
  - Google popup / redirect
  - Gets Firebase user
  - Calls user.getIdToken()
        │
        ▼
POST /api/auth/firebase-login
  Body: { idToken, role?, fullName?, image? }
        │
        ▼
Backend (Firebase Admin SDK)
  - verifyIdToken(idToken)
  - Find user by firebaseUid OR email
  - Create user if new
  - Link firebaseUid if existing email account
  - Issue your app JWT
        │
        ▼
Frontend stores JWT and uses it as Bearer token
```

---

## Step 1 — Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project (or open existing)
3. Enable **Authentication**
4. Under **Sign-in method**, enable:
   - **Google**
   - (Optional) Email/Password for testing

5. Add your apps:
   - **Web app** for frontend (gets Firebase web config)
   - Note the **Project ID**

---

## Step 2 — Enable Google Provider in Firebase

In Firebase Console:

1. **Authentication → Sign-in method → Google → Enable**
2. Set a support email
3. Save

Also add authorized domains:

- `localhost`
- your production frontend domain (example: `property-file.com`)

---

## Step 3 — Create Firebase Service Account (Backend)

Backend needs a **service account JSON** to verify ID tokens.

1. Firebase Console → Project Settings → **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file (contains `project_id`, `client_email`, `private_key`)

### Convert JSON to Base64 (recommended for `.env`)

**PowerShell:**

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\serviceAccount.json"))
```

**Linux / macOS:**

```bash
base64 -w 0 serviceAccount.json
```

### Backend `.env`

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT=BASE64_ENCODED_SERVICE_ACCOUNT_JSON
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=30d
```

> Never commit the raw service account JSON or secret key to Git.

---

## Step 4 — Database Fields

Your `User` model needs fields like:

```prisma
enum AuthProvider {
  LOCAL
  FIREBASE
}

model User {
  id          String       @id @default(uuid())
  fullName    String
  email       String       @unique
  password    String?      // null for Google/Firebase users
  image       String?
  role        String       @default("USER")
  provider    AuthProvider @default(LOCAL)
  firebaseUid String?      @unique
  isSuspended Boolean      @default(false)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
```

Why these fields matter:

| Field | Purpose |
|---|---|
| `firebaseUid` | Unique Firebase user ID (`uid`) |
| `provider` | Marks account as `FIREBASE` vs `LOCAL` |
| `password` | Optional; Google users usually have no local password |
| `email` | Required; used to match existing accounts |

---

## Step 5 — Backend Dependencies

```bash
npm install firebase-admin jsonwebtoken
```

---

## Step 6 — Initialize Firebase Admin (Backend)

Create `src/config/firebase.js`:

```js
const admin = require("firebase-admin");

function parseServiceAccount() {
  const rawValue = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawValue) throw new Error("FIREBASE_SERVICE_ACCOUNT is missing");

  const cleanBase64 = rawValue.trim().replace(/^"|"$/g, "");
  const decoded = Buffer.from(cleanBase64, "base64").toString("utf-8").trim();

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(decoded);
  } catch {
    const fixedJson = decoded.replace(/^"|"$/g, "").replace(/\\"/g, '"');
    serviceAccount = JSON.parse(fixedJson);
  }

  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  return serviceAccount;
}

function initFirebase() {
  if (admin.apps.length > 0) return admin;

  const serviceAccount = parseServiceAccount();

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
  });

  return admin;
}

module.exports = {
  admin: initFirebase(),
};
```

---

## Step 7 — Backend Login Logic

### Route

```http
POST /api/auth/firebase-login
```

No auth header required (this endpoint issues your JWT).

### Request body

```json
{
  "idToken": "FIREBASE_ID_TOKEN_FROM_CLIENT",
  "role": "USER",
  "fullName": "Optional Name",
  "image": "https://optional-avatar-url"
}
```

| Field | Required | Notes |
|---|---|---|
| `idToken` | Yes | From Firebase client: `await user.getIdToken()` |
| `role` | No | Used only on **first signup**. Defaults to `USER` |
| `fullName` | No | Fallback if token has no `name` |
| `image` | No | Fallback if token has no `picture` |

### Service logic (same pattern as this project)

```js
const firebaseLogin = async ({ idToken, role, fullName, image }) => {
  // 1) Verify Firebase token
  const decoded = await admin.auth().verifyIdToken(idToken);
  const { uid, email, name, picture } = decoded;

  if (!email) throw new Error("Firebase token missing email");

  // 2) Find existing user by firebaseUid OR email
  let user = await prisma.user.findFirst({
    where: { OR: [{ firebaseUid: uid }, { email }] },
  });

  // 3) Create if new
  if (!user) {
    user = await prisma.user.create({
      data: {
        fullName: fullName || name || email.split("@")[0],
        email,
        image: image || picture,
        firebaseUid: uid,
        provider: "FIREBASE",
        role: role || "USER",
      },
    });
  }
  // 4) Link Firebase to existing email/password account
  else if (!user.firebaseUid) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { firebaseUid: uid, provider: "FIREBASE" },
    });
  }

  // 5) Block suspended users
  if (user.isSuspended) throw new Error("Account suspended");

  // 6) Issue YOUR app JWT (not Firebase token)
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" },
  );

  return { user, token };
};
```

### Success response

```json
{
  "success": true,
  "message": "Firebase login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@gmail.com",
      "fullName": "User Name",
      "image": "https://lh3.googleusercontent.com/...",
      "provider": "FIREBASE",
      "role": "USER"
    },
    "token": "YOUR_APP_JWT"
  }
}
```

Frontend should store `data.token` and send it as:

```http
Authorization: Bearer YOUR_APP_JWT
```

---

## Step 8 — Frontend Implementation (Web)

### Install Firebase

```bash
npm install firebase
```

### Firebase web config

From Firebase Console → Project Settings → Your apps → Web:

```js
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_WEB_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

### Google login button handler

```js
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import axios from "axios";

async function loginWithGoogle(role = "USER") {
  // 1) Google sign-in via Firebase
  const result = await signInWithPopup(auth, googleProvider);

  // 2) Get Firebase ID token
  const idToken = await result.user.getIdToken();

  // 3) Send token to your backend
  const { data } = await axios.post(
    "https://your-backend.com/api/auth/firebase-login",
    {
      idToken,
      role, // optional, only used on first signup
    },
  );

  // 4) Save YOUR backend JWT
  localStorage.setItem("token", data.data.token);
  return data.data.user;
}
```

---

## Step 9 — Test the Flow

### A) From real frontend

1. Click Google login
2. Complete Google account picker
3. Check Network tab → `POST /api/auth/firebase-login`
4. Confirm response contains backend JWT

### B) Get `idToken` in browser console

```js
firebase.auth().currentUser.getIdToken().then(console.log)
// or with modular SDK:
import { getAuth } from "firebase/auth";
getAuth().currentUser.getIdToken().then(console.log)
```

### C) Test backend in Postman

`POST {{baseUrl}}/api/auth/firebase-login`

```json
{
  "idToken": "PASTE_TOKEN_HERE",
  "role": "USER"
}
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `idToken is required` | Body missing token | Send `idToken` in JSON body |
| `Invalid Firebase ID token` | Wrong project / expired token / bad service account | Match frontend + backend Firebase project; generate fresh token |
| `Firebase token missing email` | Google account has no email / scope issue | Ensure Google provider returns email |
| `Firebase admin not configured` | Missing/invalid `FIREBASE_SERVICE_ACCOUNT` | Re-encode service account JSON to Base64 |
| CORS error | Frontend domain not allowed | Add frontend origin to backend CORS list |
| Token works once then fails | ID token expired (~1 hour) | Always get fresh token with `getIdToken()` before calling backend |

---

## Security Checklist

- [ ] Verify token with Firebase Admin on backend (never trust client claims alone)
- [ ] Keep service account private (env var / secret manager only)
- [ ] Issue your own short-lived JWT for API access
- [ ] Check suspended / banned users after verify
- [ ] Do not allow client to freely escalate roles after first signup
- [ ] Allow only trusted frontend origins in CORS

---

## Copy-Paste Checklist for a New Project

1. Create Firebase project  
2. Enable Google sign-in  
3. Create web app config for frontend  
4. Download service account for backend  
5. Put Base64 service account in `.env`  
6. Add `firebaseUid` + `provider` to User table  
7. Install `firebase-admin`  
8. Add `POST /auth/firebase-login`  
9. Verify token → create/find user → return app JWT  
10. Frontend: Google popup → `getIdToken()` → call backend → store JWT  

---

## Related Files in This Project

| File | Role |
|---|---|
| `src/config/firebase.js` | Firebase Admin init |
| `src/routes/auth.routes.js` | Route: `POST /firebase-login` |
| `src/controllers/auth.controller.js` | Request validation |
| `src/services/auth.service.js` | Token verify + user create/link + JWT |
| `prisma/schema.prisma` | `firebaseUid`, `provider` fields |
| `.env` | `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT` |

---

## Important Note

This is **Google login via Firebase**, not raw Google OAuth (`googleapis` / Passport Google Strategy).

If another project already uses Firebase Auth on the frontend, reuse this exact backend pattern.  
If that project wants pure Google OAuth without Firebase, the flow is different (Google client ID/secret + OAuth code exchange).
