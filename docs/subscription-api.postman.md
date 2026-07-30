# Subscription API — Postman Guide

Base URL: `{{baseUrl}}` = `http://localhost:3000` (or `https://backend.property-file.com`)

All amounts are in **NGN (Naira)**. Paystack receives `amount * 100` (kobo) internally.

---

## Plans

| Plan    | Price (NGN) | Listings  | Images / listing | Video | Advanced Analytics | Special Request |
| ------- | ----------- | --------- | ---------------- | ----- | ------------------ | --------------- |
| FREE    | 0           | 3         | 3                | ❌    | ❌                 | ❌              |
| PRO     | 5,000       | 10        | 4                | ✅ 1  | ❌                 | ❌              |
| PREMIUM | 15,000      | 20        | 6                | ✅ 1  | ❌                 | ❌              |
| PURPLE  | 50,000      | Unlimited | 15               | ✅ 1  | ✅                 | ✅              |

> **USER / AGENT / DEVELOPER / OWNER** can have subscriptions. They get a **FREE** plan automatically when first accessing subscription APIs (professionals also get FREE on register). ADMIN has no subscription.

---

## Auth header

All authenticated routes require:

```
Authorization: Bearer {{token}}
```

Get `{{token}}` by logging in: `POST {{baseUrl}}/api/auth/login`.

---

## 1. List all plans (public)

```
GET {{baseUrl}}/api/subscriptions/plans
```

**Response:**

```json
{
  "success": true,
  "message": "Plans fetched",
  "data": {
    "plans": [
      { "key": "FREE", "name": "Free", "price": 0, "currency": "NGN", "features": { ... } },
      { "key": "PRO", "name": "Pro", "price": 5000, "currency": "NGN", "features": { ... } },
      ...
    ]
  }
}
```

---

## 2. Get my current subscription

```
GET {{baseUrl}}/api/subscriptions/me
Authorization: Bearer {{token}}     ← USER / AGENT / DEVELOPER / OWNER
```

**Response:**

```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "...",
      "plan": "FREE",
      "isActive": true,
      "startDate": "...",
      "endDate": null
    },
    "plan": {
      "key": "FREE",
      "name": "Free",
      "features": { "maxListings": 3, "maxImagesPerListing": 3, "videoPerListing": 0, ... }
    }
  }
}
```

---

## 3. Initiate a paid subscription (upgrade)

```
POST {{baseUrl}}/api/subscriptions/initiate
Authorization: Bearer {{token}}     ← USER / AGENT / DEVELOPER / OWNER
Content-Type: application/json
```

**Body:**

```json
{ "planKey": "PRO" }
```

_(use `PRO`, `PREMIUM`, or `PURPLE`)_

**Response:**

```json
{
  "success": true,
  "message": "Payment initialized. Open authorizationUrl to pay.",
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/xxxxxx",
    "accessCode": "xxxxxx",
    "reference": "sub_abc12345_1714xxxxxxx_ab12cd",
    "plan": { "key": "PRO", "name": "Pro", "price": 5000, "currency": "NGN" }
  }
}
```

> **Open `authorizationUrl` in a browser** to complete the payment using the Paystack test card:
>
> - Card: `4084 0840 8408 4081`
> - CVV: `408`
> - Expiry: `12/30` (any future date)
> - PIN: `0000`
> - OTP: `123456`

Save the `reference` — you'll need it to verify.

---

## 4. Verify payment (after Paystack redirect)

```
GET {{baseUrl}}/api/subscriptions/verify/{{reference}}
Authorization: Bearer {{token}}
```

**Response (success):**

```json
{
  "success": true,
  "message": "Subscription activated",
  "data": {
    "subscription": {
      "plan": "PRO",
      "isActive": true,
      "startDate": "...",
      "endDate": "...30 days later..."
    },
    "payment": {
      "status": "SUCCESS",
      "amount": "5000",
      "channel": "card",
      "paidAt": "..."
    },
    "alreadyVerified": false
  }
}
```

---

## 5. Cancel subscription (downgrade to FREE)

```
POST {{baseUrl}}/api/subscriptions/cancel
Authorization: Bearer {{token}}
```

**Response:**

```json
{
  "success": true,
  "message": "Subscription cancelled. Downgraded to FREE.",
  "data": {
    "subscription": { "plan": "FREE", "endDate": null, ... },
    "plan": { "key": "FREE", "features": { ... } }
  }
}
```

---

## 6. Payment history

```
GET {{baseUrl}}/api/subscriptions/payments
Authorization: Bearer {{token}}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "...",
        "plan": "PRO",
        "amount": "5000",
        "currency": "NGN",
        "reference": "sub_xxx_xxx",
        "status": "SUCCESS",
        "channel": "card",
        "paidAt": "...",
        "createdAt": "..."
      },
      ...
    ]
  }
}
```

---

## 7. Plan limits enforcement

When creating a property (`POST {{baseUrl}}/api/properties`), the backend automatically enforces:

- **Listing count** — if you already have `maxListings` properties, request fails with **403**:
  ```json
  {
    "success": false,
    "message": "Your Free plan allows only 3 listings. Upgrade to add more."
  }
  ```
- **Images per listing** — if you upload more than `maxImagesPerListing`, **403**:
  ```json
  {
    "success": false,
    "message": "Your Free plan allows only 3 images per listing."
  }
  ```
- **Video upload** — if you set `videoUrl` while on FREE, **403**:
  ```json
  {
    "success": false,
    "message": "Your Free plan does not allow video uploads. Upgrade to add a video."
  }
  ```

---

## End-to-end test flow

1. **Register** an AGENT:

   ```
   POST {{baseUrl}}/api/auth/register
   { "fullName":"Test Agent", "email":"agent1@test.com", "password":"123456", "role":"AGENT", "phoneNumber":"08012345678" }
   ```

   → user is created with **FREE** subscription automatically.

2. **Login** → save token.

3. `GET /api/subscriptions/me` → confirm FREE plan.

4. **Try to create 4th property** → blocked with 403.

5. `POST /api/subscriptions/initiate` with `{ "planKey": "PRO" }` → open `authorizationUrl` in browser → pay with test card.

6. `GET /api/subscriptions/verify/{{reference}}` → plan upgraded to **PRO**, endDate = +30 days.

7. `GET /api/subscriptions/payments` → see SUCCESS row.

8. **Try to create 4th property** → now succeeds (limit is 10 on PRO).

9. `POST /api/subscriptions/cancel` → back to FREE.

---

## Paystack test credentials (already in `.env`)

```
PAYSTACK_SECRET_KEY=sk_test_0fd7b73193dc04482b1b529830b8ac317ed3a21b
PAYSTACK_PUBLIC_KEY=pk_test_496fa7c86fbb3d4da5bf338ae7e5061a7279cd53
PAYSTACK_PLAN_PRO=PLN_5kog172jw1a8hbb
PAYSTACK_PLAN_PREMIUM=PLN_hcqi90xy47p5nqw
PAYSTACK_PLAN_PURPLE=PLN_25qzgwoiu5lsxkq
```

> If you change the price of a plan in `src/config/plans.js`, make sure it matches the price configured in your Paystack dashboard for that plan code, otherwise verification will still succeed but the amounts will mismatch.
