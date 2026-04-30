# Property Listing API — Testing Guide

Base URL: `https://backend.property-file.com/api`

---

## Roles & Permissions

| Action                     | USER | AGENT | DEVELOPER | OWNER | ADMIN |
| -------------------------- | ---- | ----- | --------- | ----- | ----- |
| Create property            | ✗    | ✓     | ✓         | ✓     | ✗     |
| View own properties        | ✗    | ✓     | ✓         | ✓     | ✗     |
| Edit own property          | ✗    | ✓     | ✓         | ✓     | ✗     |
| Delete own property        | ✗    | ✓     | ✓         | ✓     | ✓     |
| View public listings       | ✓    | ✓     | ✓         | ✓     | ✓     |
| View single property       | ✓    | ✓     | ✓         | ✓     | ✓     |
| View ALL properties        | ✗    | ✗     | ✗         | ✗     | ✓     |
| Approve / Reject / Feature | ✗    | ✗     | ✗         | ✗     | ✓     |

> Gallery images are uploaded via multipart/form-data. All uploads land in `uploads/gallery/`.

---

## Approval Flow

```
PENDING ──→ PUBLISHED   (admin approves)
PENDING ──→ REJECTED    (admin rejects)
PUBLISHED ──→ FEATURED  (admin features)
PUBLISHED ──→ REJECTED  (admin can reject published)
FEATURED  ──→ PUBLISHED (admin can un-feature)
```

Editing a PUBLISHED or FEATURED property is **not allowed** — contact admin.
Editing a PENDING or REJECTED property re-submits it as PENDING.

---

## Enums Reference

| Field            | Valid Values                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `propertyType`   | APARTMENT, HOUSE, VILLA, PENTHOUSE, STUDIO, TOWNHOUSE, DETACHED, SEMI_DETACHED, TERRACE, FLAT, OFFICE_SPACE, OTHERS |
| `condition`      | NEW, RENOVATED, FAIRLY_USED, UNDER_CONSTRUCTION, OFF_PLAN                                                           |
| `listingType`    | FOR_SALE, FOR_RENT, FOR_LEASE, OTHERS                                                                               |
| `approvalStatus` | PENDING, PUBLISHED, REJECTED, FEATURED                                                                              |

---

## Endpoints

### 1. Create Property

**POST** `/api/properties`  
Auth: Required (AGENT / DEVELOPER / OWNER)  
Content-Type: `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Notes |
|------------------|----------|----------|------------------------------------|
| title | string | ✓ | |
| description | string | ✓ | |
| propertyType | string | ✓ | See enum table above |
| condition | string | ✓ | See enum table above |
| size | string | ✓ | e.g. "120 sqm" |
| listingType | string | ✓ | See enum table above |
| location | string | ✓ | City / area |
| propertyAddress | string | ✓ | Full address |
| askingPrice | number | ✓ | e.g. 5000000 |
| gallery | file[] | Optional | Up to 20 images, 10 MB each |
| videoUrl | string | Optional | |
| whatsappNumber | string | Optional | |
| companyName | string | Optional | |
| officeAddress | string | Optional | |
| phoneNumber | string | Optional | |

**cURL Example:**



{
  "title": "Modern 3 Bedroom Apartment in Lagos",
  "description": "A spacious and modern apartment with excellent finishing, located in a secure and peaceful area.",
  "propertyType": "APARTMENT",
  "condition": "NEW",
  "size": "120 sqm",
  "listingType": "FOR_SALE",
  "location": "Lekki, Lagos",
  "propertyAddress": "Plot 24, Admiralty Way, Lekki Phase 1, Lagos",
  "askingPrice": 5000000,
  "videoUrl": "https://www.youtube.com/watch?v=example1",
  "whatsappNumber": "+2348012345678",
  "companyName": "Prime Homes Realty",
  "officeAddress": "12 Admiralty Road, Lekki, Lagos",
  "phoneNumber": "+2348098765432"
}

{
  "title": "Beautiful 4 Bedroom House for Rent",
  "description": "Well-maintained family house with parking space, fitted kitchen, and spacious rooms.",
  "propertyType": "HOUSE",
  "condition": "RENOVATED",
  "size": "250 sqm",
  "listingType": "FOR_RENT",
  "location": "Abuja",
  "propertyAddress": "House 18, Gwarinpa Estate, Abuja",
  "askingPrice": 1200000,
  "videoUrl": "https://www.youtube.com/watch?v=example2",
  "whatsappNumber": "+2348023456789",
  "companyName": "Urban Shelter Properties",
  "officeAddress": "Gwarinpa Main Road, Abuja",
  "phoneNumber": "+2348034567890"
}


{
  "title": "Commercial Office Space Available for Lease",
  "description": "Fully serviced office space suitable for startups, agencies, and corporate businesses.",
  "propertyType": "OFFICE_SPACE",
  "condition": "FAIRLY_USED",
  "size": "180 sqm",
  "listingType": "FOR_LEASE",
  "location": "Ikeja, Lagos",
  "propertyAddress": "3rd Floor, Allen Avenue Business Plaza, Ikeja, Lagos",
  "askingPrice": 3500000,
  "videoUrl": "https://www.youtube.com/watch?v=example4",
  "whatsappNumber": "+2348067890123",
  "companyName": "Corporate Space Nigeria",
  "officeAddress": "Allen Avenue, Ikeja, Lagos",
  "phoneNumber": "+2348078901234"
}

{
  "title": "Affordable Studio Apartment for Rent",
  "description": "Clean and affordable studio apartment suitable for students, singles, or young professionals.",
  "propertyType": "STUDIO",
  "condition": "FAIRLY_USED",
  "size": "45 sqm",
  "listingType": "FOR_RENT",
  "location": "Yaba, Lagos",
  "propertyAddress": "No. 8 Herbert Macaulay Way, Yaba, Lagos",
  "askingPrice": 450000,
  "videoUrl": "",
  "whatsappNumber": "+2348089012345",
  "companyName": "EasyRent Properties",
  "officeAddress": "Yaba Tech Road, Lagos",
  "phoneNumber": "+2348090123456"
}
```bash
curl -X POST https://backend.property-file.com/api/properties \
  -H "Authorization: Bearer <AGENT_TOKEN>" \
  -F "title=Luxury 3-Bedroom Apartment" \
  -F "description=Spacious apartment in the heart of Lagos Island" \
  -F "propertyType=APARTMENT" \
  -F "condition=NEW" \
  -F "size=185 sqm" \
  -F "listingType=FOR_SALE" \
  -F "location=Lagos Island" \
  -F "propertyAddress=12 Victoria Street, Lagos Island" \
  -F "askingPrice=75000000" \
  -F "whatsappNumber=+2348012345678" \
  -F "companyName=Apex Realty" \
  -F "phoneNumber=+2348012345678" \
  -F "gallery=@/path/to/photo1.jpg" \
  -F "gallery=@/path/to/photo2.jpg"
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Property submitted for approval",
  "data": {
    "id": "uuid-here",
    "title": "Luxury 3-Bedroom Apartment",
    "approvalStatus": "PENDING",
    "gallery": [
      "https://backend.property-file.com/uploads/gallery/1714000000000-abc123.jpg",
      "https://backend.property-file.com/uploads/gallery/1714000000001-def456.jpg"
    ],
    "owner": {
      "id": "owner-uuid",
      "fullName": "John Doe",
      "role": "AGENT"
    }
  }
}
```

---

### 2. Get Public Properties (No Auth)

**GET** `/api/properties`

**Query Parameters (all optional):**
| Param | Example |
|----------------|------------------------|
| propertyType | `?propertyType=APARTMENT` |
| listingType | `?listingType=FOR_SALE` |
| condition | `?condition=NEW` |
| location | `?location=Lagos` |
| minPrice | `?minPrice=5000000` |
| maxPrice | `?maxPrice=50000000` |
| page | `?page=2` |

Returns only `PUBLISHED` and `FEATURED` properties. Featured appear first.

**cURL Example:**

```bash
curl "https://backend.property-file.com/api/properties?location=Lagos&listingType=FOR_SALE&page=1"
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Properties fetched",
  "data": {
    "total": 42,
    "page": 1,
    "properties": [
      {
        "id": "uuid",
        "title": "Luxury 3-Bedroom Apartment",
        "approvalStatus": "FEATURED",
        "listingType": "FOR_SALE",
        "propertyType": "APARTMENT",
        "askingPrice": "75000000.00",
        "location": "Lagos Island",
        "gallery": ["..."],
        "owner": { "fullName": "John Doe", "role": "AGENT" }
      }
    ]
  }
}
```

---

### 3. Get Single Property

**GET** `/api/properties/:id`  
Auth: Optional (owners can view their own pending; public sees published/featured only)

**cURL Example:**

```bash
# Without auth (public)
curl https://backend.property-file.com/api/properties/uuid-here

# With auth (owner sees own pending)
curl https://backend.property-file.com/api/properties/uuid-here \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 4. Get My Properties

**GET** `/api/properties/my`  
Auth: Required (AGENT / DEVELOPER / OWNER)

**Query Parameters:**
| Param | Example |
|--------|-------------------------------|
| status | `?status=PENDING` |
| page | `?page=1` |

**cURL Example:**

```bash
curl https://backend.property-file.com/api/properties/my?status=PENDING \
  -H "Authorization: Bearer <AGENT_TOKEN>"
```

---

### 5. Update Property

**PATCH** `/api/properties/:id`  
Auth: Required (AGENT / DEVELOPER / OWNER, must be owner)  
Content-Type: `multipart/form-data`

Only properties with status `PENDING` or `REJECTED` can be edited.  
After editing, status is reset to `PENDING` automatically.  
Sending new gallery images **replaces** the old gallery.

**cURL Example:**

```bash
curl -X PATCH https://backend.property-file.com/api/properties/uuid-here \
  -H "Authorization: Bearer <AGENT_TOKEN>" \
  -F "title=Updated Apartment Title" \
  -F "askingPrice=80000000" \
  -F "gallery=@/path/to/new_photo.jpg"
```

---

### 6. Delete Property

**DELETE** `/api/properties/:id`  
Auth: Required (AGENT / DEVELOPER / OWNER — own property; ADMIN — any property)

**cURL Example:**

```bash
curl -X DELETE https://backend.property-file.com/api/properties/uuid-here \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Admin Endpoints

### 7. Get All Properties (Admin)

**GET** `/api/properties/admin/all`  
Auth: Required (ADMIN only)

**Query Parameters:**
| Param | Example |
|--------|-----------------------|
| status | `?status=PENDING` |
| page | `?page=1` |

**cURL Example:**

```bash
# All pending properties
curl "https://backend.property-file.com/api/properties/admin/all?status=PENDING" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# All properties regardless of status
curl "https://backend.property-file.com/api/properties/admin/all" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

### 8. Update Approval Status (Admin)

**PATCH** `/api/properties/admin/:id/status`  
Auth: Required (ADMIN only)  
Content-Type: `application/json`

**Request Body:**

```json
{ "status": "PUBLISHED" }
```

| `status` value | Meaning                  |
| -------------- | ------------------------ |
| `PUBLISHED`    | Approve — visible to all |
| `REJECTED`     | Reject the listing       |
| `FEATURED`     | Feature (top placement)  |
| `PENDING`      | Reset to pending         |

**cURL Examples:**

Approve:

```bash
curl -X PATCH https://backend.property-file.com/api/properties/admin/uuid-here/status \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"PUBLISHED"}'
```

Reject:

```bash
curl -X PATCH https://backend.property-file.com/api/properties/admin/uuid-here/status \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"REJECTED"}'
```

Feature:

```bash
curl -X PATCH https://backend.property-file.com/api/properties/admin/uuid-here/status \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"FEATURED"}'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Property publishedd successfully",
  "data": {
    "id": "uuid",
    "title": "Luxury 3-Bedroom Apartment",
    "approvalStatus": "PUBLISHED",
    "owner": { "id": "...", "fullName": "John Doe", "email": "..." }
  }
}
```

---

## Error Responses

| HTTP Code | Scenario                                           |
| --------- | -------------------------------------------------- |
| 400       | Missing required fields / invalid enum value       |
| 401       | Missing or invalid Bearer token                    |
| 403       | Role not allowed / editing someone else's property |
| 404       | Property not found or not accessible               |

**Example Error:**

```json
{
  "success": false,
  "message": "Only agents, developers and owners can create property listings"
}
```

---

## File Upload Notes

- Gallery images stored at: `uploads/gallery/`
- Served at: `https://backend.property-file.com/uploads/gallery/<filename>`
- Max file size per image: **10 MB**
- Max images per upload: **20**
- Allowed formats: `jpeg`, `jpg`, `png`, `gif`, `webp`, `avif`
