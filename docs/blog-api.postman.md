# Blog API — Postman Testing Guide

Base URL (local): `http://localhost:3000/api`
Base URL (prod): `https://backend.property-file.com/api`

---

## Concepts

**Categories** (replaces old PROPERTY_NEWS etc.):
`BUY` | `RENT` | `INVEST` | `MARKET_NEWS` | `GUIDES` | `DESIGN_LIFESTYLE` | `LEGAL` | `COMMERCIAL`

**Status:**

- `DRAFT` — saved, not visible publicly
- `PUBLISHED` — visible publicly immediately
- `ARCHIVED` — hidden from public, kept in DB

**Auto-publish:** If a blog has `status = DRAFT` and a `publishDate` set in the past/present, it is automatically visible on the public endpoint — no cron job, no manual trigger. The `effectiveStatus` field in the response reflects this.

All `/admin/blogs/*` routes require:

```
Authorization: Bearer {{adminToken}}
```

---

## 0. Login as Admin

**POST** `{{baseUrl}}/auth/login`

```json
{ "email": "admin@example.com", "password": "yourPassword" }
```

Postman _Tests_ tab auto-save:

```js
const j = pm.response.json();
if (j?.data?.token) pm.environment.set("adminToken", j.data.token);
```

---

## 1. Create Blog Post (Admin)

**POST** `{{baseUrl}}/admin/blogs`

### Headers

```
Authorization: Bearer {{adminToken}}
```

_(Do NOT set Content-Type manually — Postman sets multipart automatically)_

### Body — `form-data`

| Key               | Type | Required | Notes                                                                                              |
| ----------------- | ---- | -------- | -------------------------------------------------------------------------------------------------- |
| `title`           | Text | ✅       | Post title                                                                                         |
| `content`         | Text | ✅       | Full article content (HTML/markdown)                                                               |
| `category`        | Text | ✅       | `BUY` / `RENT` / `INVEST` / `MARKET_NEWS` / `GUIDES` / `DESIGN_LIFESTYLE` / `LEGAL` / `COMMERCIAL` |
| `subtitle`        | Text |          | Secondary title / tagline                                                                          |
| `metaDescription` | Text |          | SEO meta, max 160 chars                                                                            |
| `urlSlug`         | Text |          | Auto-generated from title if omitted                                                               |
| `tags`            | Text |          | Comma-separated: `"investment,property,2026"`                                                      |
| `authorName`      | Text |          | Defaults to logged-in admin's name                                                                 |
| `pdfTitle`        | Text |          | Name for the PDF download                                                                          |
| `excerpt`         | Text |          | Short summary shown in previews (max 160 chars)                                                    |
| `publishDate`     | Text |          | `2026-05-10T09:00:00` auto-publishes at this time  2026-05-03T11:18:00+06:00 bangladesh time 11.18 am                                         |
| `status`          | Text |          | `DRAFT` (default) / `PUBLISHED` / `ARCHIVED`                                                       |
| `images`          | File |          | Featured images (up to 10, each ≤ 15 MB)                                                           |
| `pdf`             | File |          | PDF attachment (≤ 15 MB)                                                                           |

### Scenario A — Publish immediately

Set `status = PUBLISHED` (or omit and set `publishDate` to a past date)

### Scenario B — Schedule for later

Set `status = DRAFT` + `publishDate = 2026-06-01T08:00:00`
→ Blog auto-appears publicly when that datetime passes

### Scenario C — Save as draft

Omit `publishDate` and `status` (or set `status = DRAFT`)

### Response (201)

```json
{
  "success": true,
  "message": "Blog created",
  "data": {
    "id": "uuid",
    "title": "...",
    "urlSlug": "my-post-title",
    "category": "BUY",
    "status": "DRAFT",
    "effectiveStatus": "DRAFT",
    "publishDate": "2026-06-01T08:00:00.000Z",
    "views": 0,
    "images": ["https://..."],
    "pdfFileUrl": null
  }
}
```

---

## 2. List All Blogs (Admin)

**GET** `{{baseUrl}}/admin/blogs`

### Query params (all optional)

| Param      | Example    | Notes                                 |
| ---------- | ---------- | ------------------------------------- |
| `category` | `BUY`      | Filter by category                    |
| `status`   | `DRAFT`    | `DRAFT` / `PUBLISHED` / `ARCHIVED`    |
| `search`   | `property` | Searches title / excerpt / authorName |
| `page`     | `1`        | Default 1                             |
| `pageSize` | `20`       | Default 20                            |

### Examples

- All: `GET /admin/blogs`
- Drafts: `GET /admin/blogs?status=DRAFT`
- BUY category: `GET /admin/blogs?category=BUY`
- Search: `GET /admin/blogs?search=mortgage`

### Response

```json
{
  "success": true,
  "data": {
    "blogs": [
      {
        "id": "...",
        "title": "...",
        "effectiveStatus": "PUBLISHED",
        "views": 8200
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "countsByCategory": { "BUY": 5, "RENT": 3, "MARKET_NEWS": 10, "...": 0 },
    "countsByStatus": { "DRAFT": 4, "PUBLISHED": 35, "ARCHIVED": 3 }
  }
}
```

---

## 3. Get Single Blog (Admin)

**GET** `{{baseUrl}}/admin/blogs/:id`

Returns full blog with `effectiveStatus` and `author`.

---

## 4. Update Blog (Admin)

**PATCH** `{{baseUrl}}/admin/blogs/:id`

Same `form-data` structure as Create. Send only the fields you want to change.

- Sending new `images` files **appends** them to existing images (doesn't replace)
- Sending a new `pdf` file replaces the old PDF and deletes old file from disk

---

## 5. Change Blog Status (Admin)

**PATCH** `{{baseUrl}}/admin/blogs/:id/status`

### Headers

```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

### Body

```json
{ "status": "PUBLISHED" }
```

or

```json
{ "status": "ARCHIVED" }
```

or

```json
{ "status": "DRAFT" }
```

### Response

```json
{
  "success": true,
  "message": "Blog published",
  "data": {
    "id": "uuid",
    "status": "PUBLISHED",
    "effectiveStatus": "PUBLISHED"
  }
}
```

---

## 6. Delete a Single Image from Blog (Admin)

**DELETE** `{{baseUrl}}/admin/blogs/:id/images`

### Headers

```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

### Body

```json
{ "imageUrl": "https://backend.property-file.com/uploads/blog/1714...png" }
```

### Response

```json
{
  "success": true,
  "message": "Image removed",
  "data": { "id": "uuid", "images": ["...remaining"] }
}
```

---

## 7. Delete Blog (Admin)

**DELETE** `{{baseUrl}}/admin/blogs/:id`

Deletes blog + all images and PDF from disk.

```json
{ "success": true, "message": "Blog deleted", "data": { "id": "uuid" } }
```

---

## 8. Blog Stats — Dashboard Header (Admin)

**GET** `{{baseUrl}}/admin/blogs/stats`

### Response

```json
{
  "success": true,
  "data": {
    "totalViews": 73400,
    "totalPosts": 42,
    "seoHealth": 92,
    "bestEngagement": {
      "id": "uuid",
      "title": "The Rise of Brutalism in Modern Architecture",
      "views": 12500,
      "urlSlug": "rise-of-brutalism"
    },
    "byCategory": [
      { "category": "MARKET_NEWS", "posts": 10, "views": 9900 },
      { "category": "BUY", "posts": 5, "views": 8200 }
    ]
  }
}
```

| Field            | Maps to dashboard                                         |
| ---------------- | --------------------------------------------------------- |
| `totalViews`     | TOTAL VIEWS (73.4K)                                       |
| `seoHealth`      | AVG SEO HEALTH (92/100) — % of posts with metaDescription |
| `bestEngagement` | BEST ENGAGEMENT — most viewed post                        |

---

## 9. PUBLIC — List Published Blogs

**GET** `{{baseUrl}}/blogs`

No auth. Returns only PUBLISHED blogs + auto-published (DRAFT with `publishDate <= now`).

### Query params (all optional)

| Param      | Example       | Notes                             |
| ---------- | ------------- | --------------------------------- |
| `category` | `MARKET_NEWS` | Filter by category                |
| `search`   | `mortgage`    | Matches title / excerpt / content |
| `tag`      | `investment`  | Filter by tag                     |
| `page`     | `1`           | Default 1                         |
| `pageSize` | `12`          | Default 12                        |

### Examples

- `GET /blogs`
- `GET /blogs?category=BUY`
- `GET /blogs?search=property&page=2`
- `GET /blogs?tag=investment`

### Response

```json
{
  "success": true,
  "data": {
    "blogs": [
      {
        "id": "uuid",
        "title": "Urban Gardening for High-Rise Apartments",
        "excerpt": "Learn how to create a thriving garden...",
        "images": ["https://..."],
        "category": "GUIDES",
        "tags": ["gardening", "apartment"],
        "urlSlug": "urban-gardening-high-rise",
        "authorName": "Admin User",
        "publishDate": "2026-05-01T00:00:00.000Z",
        "views": 8200
      }
    ],
    "total": 35,
    "page": 1,
    "pageSize": 12
  }
}
```

---

## 10. PUBLIC — Get Blog by Slug (increments views)

**GET** `{{baseUrl}}/blogs/:slug`

### Example

`GET /blogs/urban-gardening-high-rise`

Returns full blog (title, content, images, PDF link, tags, etc.) and **increments the view count** automatically.

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Urban Gardening for High-Rise Apartments",
    "content": "...",
    "images": ["https://..."],
    "pdfFileUrl": "https://...pdf",
    "pdfTitle": "Gardening Guide PDF",
    "category": "GUIDES",
    "tags": ["gardening"],
    "views": 8201,
    "publishDate": "..."
  }
}
```

---

## Auto-Publish Behaviour (no cron needed)

| Scenario            | How to set up                                      | What happens                           |
| ------------------- | -------------------------------------------------- | -------------------------------------- |
| Publish immediately | `status=PUBLISHED`                                 | Visible instantly                      |
| Schedule            | `status=DRAFT` + `publishDate=2026-06-01T08:00:00` | Auto-visible when that datetime passes |
| Keep as draft       | `status=DRAFT`, no `publishDate`                   | Never visible publicly                 |
| Archive             | `status=ARCHIVED`                                  | Hidden from public, stays in DB        |

---

## Postman Setup

Environment variables:

- `baseUrl` = `http://localhost:3000/api`
- `adminToken` = (auto-set by login Tests script)

---

## Quick End-to-End Test Flow

1. `POST /auth/login` → token saved
2. `GET /admin/blogs/stats` → all zeros initially
3. `POST /admin/blogs` with image + category `BUY` + `status=PUBLISHED` → published immediately
4. `POST /admin/blogs` with category `MARKET_NEWS` + `status=DRAFT` + `publishDate=2026-05-01T00:00:00` (past date) → will auto-publish
5. `POST /admin/blogs` with `status=DRAFT` (no publishDate) → stays draft
6. `GET /admin/blogs` → see all 3 posts + `countsByStatus`
7. `GET /admin/blogs?status=DRAFT` → see the 2 drafts
8. `GET /blogs` (public, no auth) → see 2 posts (published + auto-published, draft with no date excluded)
9. `GET /blogs/:slug` → full post, views incremented
10. `GET /admin/blogs/stats` → totalViews updated, bestEngagement shown
11. `PATCH /admin/blogs/:id/status` with `{ "status": "ARCHIVED" }` → post hidden from public
12. `PATCH /admin/blogs/:id` with new image file → image appended
13. `DELETE /admin/blogs/:id/images` with `{ "imageUrl": "..." }` → single image removed
14. `DELETE /admin/blogs/:id` → blog + all files deleted
