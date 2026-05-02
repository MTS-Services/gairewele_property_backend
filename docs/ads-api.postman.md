# Advertisement (Ads) API — Postman Testing Guide

Base URL (local): `http://localhost:3000/api`
Base URL (prod): `https://backend.property-file.com/api`

---

## Concepts

- **Placement** controls **where the ad shows** on the site. One of:
  - `HOMEPAGE` — homepage banners
  - `BLOG` — blog pages
  - `PROPERTIES` — property listing pages
  - `REGISTER` — register / signup page
- **Status** controls **priority / styling**. One of:
  - `SPONSOR` (highest priority)
  - `FEATURED`
  - `STANDARD` (default, lowest priority)
- An ad is **live** only when `now` is between `startDate` and `endDate` **and** `isPaused` is `false`. Ads stop automatically when `endDate` passes — no cron job needed.
- **isPaused** — admin can pause an ad at any time without deleting it. Paused ads are hidden from the public endpoints but still visible in admin.
- **impressions / clicks** — incremented by the frontend via the `/track` endpoint. Used to calculate CTR on the dashboard.

Auth: all `/admin/ads/*` endpoints require an admin JWT.

```
Authorization: Bearer {{adminToken}}
```

---

## 0. Login as Admin

**POST** `{{baseUrl}}/auth/login`

```json
{ "email": "admin@example.com", "password": "yourPassword" }
```

Save `data.token` as `{{adminToken}}` (Postman _Tests_ tab):

```js
const j = pm.response.json();
if (j?.data?.token) pm.environment.set("adminToken", j.data.token);
```

---

## 1. Create Ad (Admin)

**POST** `{{baseUrl}}/admin/ads`

### Headers

```
Authorization: Bearer {{adminToken}}
```

_(Do NOT set Content-Type — Postman sets multipart automatically.)_

### Body — `form-data`

| Key           | Type | Value (example)                                |
| ------------- | ---- | ---------------------------------------------- |
| `image`       | File | (select an image: PNG/JPG/GIF/WebP, ≤10 MB)    |
| `title`       | Text | `Premium Property Listing`                     |
| `description` | Text | `Get your property listed and reach buyers...` |
| `liveLink`    | Text | `https://property-file.com/premium`            |
| `placement`   | Text | `HOMEPAGE`                                     |
| `status`      | Text | `SPONSOR`                                      |
| `startDate`   | Text | `2026-05-02`                                   |
| `endDate`     | Text | `2026-08-02`                                   |

### Response (201)

```json
{
  "success": true,
  "message": "Advertisement created",
  "data": {
    "id": "uuid",
    "image": "https://backend.property-file.com/uploads/ad/1714...png",
    "title": "Premium Property Listing",
    "description": "...",
    "liveLink": "https://property-file.com/premium",
    "placement": "HOMEPAGE",
    "status": "SPONSOR",
    "startDate": "2026-05-02T00:00:00.000Z",
    "endDate": "2026-08-02T00:00:00.000Z",
    "createdBy": { "id": "uuid", "fullName": "Admin", "role": "ADMIN" }
  }
}
```

### Errors

| Code | Reason                                                                      |
| ---- | --------------------------------------------------------------------------- |
| 400  | Missing image/title/liveLink/placement, invalid placement/status, bad dates |
| 401  | Missing/invalid token                                                       |
| 403  | Not admin                                                                   |

---

## 2. List All Ads (Admin) — with filters & counts

**GET** `{{baseUrl}}/admin/ads`

### Query params (all optional)

| Param       | Example    | Notes                                              |
| ----------- | ---------- | -------------------------------------------------- |
| `placement` | `HOMEPAGE` | `HOMEPAGE` \| `BLOG` \| `PROPERTIES` \| `REGISTER` |
| `status`    | `SPONSOR`  | `SPONSOR` \| `FEATURED` \| `STANDARD`              |
| `search`    | `summer`   | Matches title / description                        |
| `page`      | `1`        | Default 1                                          |
| `pageSize`  | `20`       | Default 20                                         |

### Examples

- All ads: `GET /admin/ads`
- Only homepage ads: `GET /admin/ads?placement=HOMEPAGE`
- Sponsored on register page: `GET /admin/ads?placement=REGISTER&status=SPONSOR`
- Search: `GET /admin/ads?search=premium`

### Response

```json
{
  "success": true,
  "message": "Advertisements fetched",
  "data": {
    "ads": [
      {
        "id": "uuid",
        "image": "...",
        "title": "...",
        "placement": "HOMEPAGE",
        "status": "SPONSOR",
        "startDate": "...",
        "endDate": "...",
        "isLive": true,
        "isExpired": false,
        "isScheduled": false,
        "createdBy": { "id": "...", "fullName": "Admin", "role": "ADMIN" }
      }
    ],
    "total": 12,
    "page": 1,
    "pageSize": 20,
    "countsByPlacement": {
      "HOMEPAGE": 5,
      "BLOG": 3,
      "PROPERTIES": 2,
      "REGISTER": 2
    },
    "countsByStatus": {
      "SPONSOR": 3,
      "FEATURED": 4,
      "STANDARD": 5
    }
  }
}
```

---

## 3. Get Single Ad (Admin)

**GET** `{{baseUrl}}/admin/ads/:id`

### Response

```json
{
  "success": true,
  "message": "Advertisement fetched",
  "data": { "id": "uuid", "title": "...", "placement": "HOMEPAGE", ... }
}
```

---

## 4. Update Ad (Admin)

**PATCH** `{{baseUrl}}/admin/ads/:id`

### Headers

```
Authorization: Bearer {{adminToken}}
```

### Body — `form-data` (all fields optional)

Send only the fields you want to change.

| Key           | Type | Notes                                           |
| ------------- | ---- | ----------------------------------------------- |
| `image`       | File | New image — old file gets deleted               |
| `title`       | Text |                                                 |
| `description` | Text |                                                 |
| `liveLink`    | Text |                                                 |
| `placement`   | Text | `HOMEPAGE` / `BLOG` / `PROPERTIES` / `REGISTER` |
| `status`      | Text | `SPONSOR` / `FEATURED` / `STANDARD`             |
| `startDate`   | Text | `YYYY-MM-DD`                                    |
| `endDate`     | Text | `YYYY-MM-DD`                                    |

### Response

```json
{
  "success": true,
  "message": "Advertisement updated",
  "data": { "id": "uuid", "...": "..." }
}
```

---

## 5. Delete Ad (Admin)

**DELETE** `{{baseUrl}}/admin/ads/:id`

### Response

```json
{
  "success": true,
  "message": "Advertisement deleted",
  "data": { "id": "uuid" }
}
```

The image file on disk is also deleted.

---

## 6. Toggle Pause Ad (Admin)

Single endpoint — pauses if active, unpauses if paused. Paused ads are hidden from the public.

**PATCH** `{{baseUrl}}/admin/ads/:id/toggle-pause`

### Headers

```
Authorization: Bearer {{adminToken}}
```

Body: _(none)_

### Response (when paused)

```json
{
  "success": true,
  "message": "Advertisement paused",
  "data": {
    "paused": true,
    "ad": { "id": "uuid", "isPaused": true, "...": "..." }
  }
}
```

### Response (when unpaused)

```json
{
  "success": true,
  "message": "Advertisement unpaused",
  "data": {
    "paused": false,
    "ad": { "id": "uuid", "isPaused": false, "...": "..." }
  }
}
```

---

## 7. Admin Stats — Dashboard Header Numbers

**GET** `{{baseUrl}}/admin/ads/stats`

### Headers

```
Authorization: Bearer {{adminToken}}
```

Body: _(none)_

### Response

```json
{
  "success": true,
  "message": "Ad stats fetched",
  "data": {
    "totalImpressions": 2400000,
    "totalClicks": 84200,
    "totalCampaigns": 124,
    "ctr": 3.51,
    "placementEfficiency": [
      {
        "placement": "HOMEPAGE",
        "impressions": 900000,
        "clicks": 73800,
        "ctr": 82.0
      },
      {
        "placement": "BLOG",
        "impressions": 500000,
        "clicks": 2250,
        "ctr": 0.45
      },
      {
        "placement": "PROPERTIES",
        "impressions": 700000,
        "clicks": 6580,
        "ctr": 0.94
      },
      {
        "placement": "REGISTER",
        "impressions": 300000,
        "clicks": 360,
        "ctr": 0.12
      }
    ]
  }
}
```

| Field                       | Maps to dashboard          |
| --------------------------- | -------------------------- |
| `totalImpressions`          | TOTAL IMPRESSIONS (2.4M)   |
| `totalClicks`               | AVERAGE CLICKS (84.2K)     |
| `totalCampaigns`            | CAMPAIGN DATA (124)        |
| `ctr`                       | CLICK-THROUGH RATE (3.51%) |
| `placementEfficiency[].ctr` | Placement Efficiency bars  |

---

## 8. PUBLIC — Get Ads by Placement (frontend renders)

**GET** `{{baseUrl}}/ads/:placement`
No auth required. Returns only **live** (non-paused, within date range) ads for that placement.
| `:placement` value | Where to render |
| ------------------ | ---------------------------- |
| `HOMEPAGE` | Homepage banners / hero slot |
| `BLOG` | Blog list / article pages |
| `PROPERTIES` | Property listing pages |
| `REGISTER` | Register / signup page |

### Query params

| Param   | Example | Notes                          |
| ------- | ------- | ------------------------------ |
| `limit` | `5`     | Max ads to return (default 10) |

### Examples

- `GET /ads/HOMEPAGE`
- `GET /ads/BLOG?limit=3`
- `GET /ads/PROPERTIES`
- `GET /ads/REGISTER`

### Response

Returns only live, non-paused ads (ordered `SPONSOR → FEATURED → STANDARD`, then newest first):

```json
{
  "success": true,
  "message": "Ads fetched",
  "data": [
    {
      "id": "uuid",
      "image": "https://backend.property-file.com/uploads/ad/1714...png",
      "title": "Premium Property Listing",
      "description": "...",
      "liveLink": "https://property-file.com/premium",
      "placement": "HOMEPAGE",
      "status": "SPONSOR",
      "impressions": 12000,
      "clicks": 420,
      "startDate": "...",
      "endDate": "..."
    }
  ]
}
```

---

## 9. PUBLIC — Track Impression or Click (frontend calls this)

**POST** `{{baseUrl}}/ads/:id/track`

No auth required. Call this from the frontend:

- When an ad is **rendered** → send `type: "impression"`
- When the user **clicks** the ad link → send `type: "click"` before redirecting

### Body (raw → JSON)

```json
{ "type": "impression" }
```

or

```json
{ "type": "click" }
```

### Response

```json
{
  "success": true,
  "message": "Ad impression tracked",
  "data": {
    "id": "uuid",
    "impressions": 12001,
    "clicks": 420
  }
}
```

### Errors

| Code | Reason                                |
| ---- | ------------------------------------- |
| 400  | `type` is not `impression` or `click` |
| 404  | Ad not found                          |

---

## Postman Setup

Environment:

- `baseUrl` = `http://localhost:3000/api`
- `adminToken` = (auto-set by login Tests script)

Collection-level Auth:

- Type: `Bearer Token`
- Token: `{{adminToken}}`

---

## Quick End-to-End Test Flow

1. `POST /auth/login` (admin) → token saved
2. `GET /admin/ads/stats` → all zeros initially
3. `POST /admin/ads` with image + `placement=HOMEPAGE` + `status=SPONSOR` + valid dates → ad created, save `:id`
4. `POST /admin/ads` again with `placement=BLOG` + `status=STANDARD`
5. `GET /admin/ads` → both ads + `countsByPlacement` + `countsByStatus`
6. `GET /admin/ads?placement=HOMEPAGE` → filtered
7. `GET /ads/HOMEPAGE` (no auth) → live ad returned
8. `POST /ads/:id/track` with `{ "type": "impression" }` → impressions +1
9. `POST /ads/:id/track` with `{ "type": "click" }` → clicks +1
10. `GET /admin/ads/stats` → see updated impressions, clicks, CTR
11. `PATCH /admin/ads/:id/toggle-pause` → ad paused
12. `GET /ads/HOMEPAGE` → ad no longer returned (paused)
13. `PATCH /admin/ads/:id/toggle-pause` → unpaused, ad returns
14. `PATCH /admin/ads/:id` with new `status=FEATURED` → updated
15. `DELETE /admin/ads/:id` → deleted, image removed from disk
