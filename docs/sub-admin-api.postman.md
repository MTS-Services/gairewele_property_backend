# Sub-Admin API — Postman Testing Guide

## Setup

### Environment Variables

Create a Postman Environment with these variables:

| Variable        | Example Value                         |
| --------------- | ------------------------------------- |
| `baseUrl`       | `http://localhost:3000`               |
| `adminToken`    | _(paste token after login)_           |
| `subAdminToken` | _(paste token after sub-admin login)_ |
| `subAdminId`    | _(paste id after creating sub-admin)_ |

---

## 1. Login as Super Admin (get `adminToken`)

**POST** `{{baseUrl}}/api/auth/login`

**Body (raw JSON):**

```json
{
  "email": "superadmin@example.com",
  "password": "yourpassword"
}
```

**After success:** Copy the `token` from the response → paste into `adminToken` environment variable.

---

## 2. Create a Sub-Admin

**POST** `{{baseUrl}}/api/admin/sub-admins`

**Authorization:** Bearer `{{adminToken}}`

**Body (raw JSON):**

```json
{
  "fullName": "Jane Listing",
  "email": "jane.listing@example.com",
  "password": "Password123",
  "role": "SUB_ADMIN_LISTING"
}
```

**Valid roles:**
| Role | Access |
|---|---|
| `SUB_ADMIN_LISTING` | Can view and manage property listings |
| `SUB_ADMIN_BLOG` | Can create, edit, delete blogs |
| `SUB_ADMIN_ADVERTS` | Can create, edit, delete advertisements |

**Expected response `201`:**

```json
{
  "success": true,
  "message": "Sub-admin created",
  "data": {
    "user": {
      "id": "abc-123",
      "fullName": "Jane Listing",
      "email": "jane.listing@example.com",
      "role": "SUB_ADMIN_LISTING",
      ...
    }
  }
}
```

> Copy the `id` from the response → paste into `subAdminId` environment variable.

---

## 3. View Sub-Admins via Users List (role filter)

Sub-admins appear in the main users list. Use the `role` query param to filter.

### List ALL users including sub-admins (no filter)

**GET** `{{baseUrl}}/api/admin/users`

**Authorization:** Bearer `{{adminToken}}`

The response `countsByRole` will include counts for all roles:
`USER`, `AGENT`, `DEVELOPER`, `OWNER`, `SUB_ADMIN_LISTING`, `SUB_ADMIN_BLOG`, `SUB_ADMIN_ADVERTS`

---

### Filter by sub-admin role

**GET** `{{baseUrl}}/api/admin/users?role=SUB_ADMIN_LISTING`

**GET** `{{baseUrl}}/api/admin/users?role=SUB_ADMIN_BLOG`

**GET** `{{baseUrl}}/api/admin/users?role=SUB_ADMIN_ADVERTS`

**Authorization:** Bearer `{{adminToken}}`

**Params tab:**
| Key | Value |
|---|---|
| `role` | `SUB_ADMIN_LISTING` |

**Expected response `200`:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "abc-123",
        "fullName": "Jane Listing",
        "email": "jane.listing@example.com",
        "role": "SUB_ADMIN_LISTING",
        "isSuspended": false,
        "createdAt": "2026-05-20T10:00:00.000Z"
      }
    ],
    "total": 1,
    "countsByRole": {
      "USER": 12,
      "AGENT": 5,
      "DEVELOPER": 3,
      "OWNER": 2,
      "SUB_ADMIN_LISTING": 1,
      "SUB_ADMIN_BLOG": 0,
      "SUB_ADMIN_ADVERTS": 0
    }
  }
}
```

> You can also combine with `search`: `?role=SUB_ADMIN_BLOG&search=jane`

---

## 4. Suspend a Sub-Admin (toggle)

**PATCH** `{{baseUrl}}/api/admin/users/{{subAdminId}}/toggle-suspend`

**Authorization:** Bearer `{{adminToken}}`

**No body required.**

**Expected response `200`:**

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "suspended": true
  }
}
```

> Call it again to **unsuspend**. A suspended sub-admin gets `403 Account suspended` on next request.

---

## 5. Delete / Revoke a Sub-Admin

**DELETE** `{{baseUrl}}/api/admin/sub-admins/{{subAdminId}}`

**Authorization:** Bearer `{{adminToken}}`

**Expected response `200`:**

```json
{
  "success": true,
  "message": "Sub-admin removed"
}
```

---

## 6. Login as Sub-Admin (get `subAdminToken`)

**POST** `{{baseUrl}}/api/auth/login`

**Body (raw JSON):**

```json
{
  "email": "jane.listing@example.com",
  "password": "Password123"
}
```

**After success:** Copy `token` → paste into `subAdminToken`.

---

## 7. Test Sub-Admin Permissions

### 7a. SUB_ADMIN_LISTING — view listings ✅

**GET** `{{baseUrl}}/api/admin/listings`

**Authorization:** Bearer `{{subAdminToken}}`

Expected: `200 OK`

---

### 7b. SUB_ADMIN_LISTING — try to access blogs ❌ (should be blocked)

**GET** `{{baseUrl}}/api/admin/blogs`

**Authorization:** Bearer `{{subAdminToken}}`

Expected: `403 Forbidden: insufficient role`

---

### 7c. SUB_ADMIN_BLOG — create a blog ✅

**POST** `{{baseUrl}}/api/admin/blogs`

**Authorization:** Bearer `{{subAdminToken}}` _(token for a SUB_ADMIN_BLOG user)_

**Body (form-data):**
| Key | Value |
|---|---|
| `title` | `Test Blog Post` |
| `content` | `Blog content here` |
| `category` | `GUIDES` |
| `urlSlug` | `test-blog-post` |
| `status` | `DRAFT` |

Expected: `201 Created`

---

### 7d. SUB_ADMIN_ADVERTS — create an ad ✅

**POST** `{{baseUrl}}/api/ads`

**Authorization:** Bearer `{{subAdminToken}}` _(token for a SUB_ADMIN_ADVERTS user)_

**Body (form-data):**
| Key | Value |
|---|---|
| `title` | `Test Ad` |
| `liveLink` | `https://example.com` |
| `placement` | `HOMEPAGE` |
| `status` | `STANDARD` |
| `startDate` | `2026-06-01T00:00:00.000Z` |
| `endDate` | `2026-07-01T00:00:00.000Z` |
| `image` | _(file upload)_ |

Expected: `201 Created`

---

### 7e. SUB_ADMIN_ADVERTS — try to access finance ❌ (should be blocked)

**GET** `{{baseUrl}}/api/admin/payments/export`

**Authorization:** Bearer `{{subAdminToken}}`

Expected: `403 Forbidden: insufficient role`

---

## 8. Error Cases to Verify

| Scenario                                                    | Expected                             |
| ----------------------------------------------------------- | ------------------------------------ |
| Create sub-admin with invalid role (e.g. `"role": "AGENT"`) | `400 Invalid sub-admin role`         |
| Create sub-admin with duplicate email                       | `409 Email already registered`       |
| Delete your own account as admin                            | `400 Cannot delete your own account` |
| Delete an ID that belongs to a regular user                 | `400 User is not a sub-admin`        |
| Any request with no token                                   | `401 Unauthorized: token missing`    |
| Suspended sub-admin makes a request                         | `403 Account suspended`              |
