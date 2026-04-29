# Live Chat API — Postman Testing Guide

Base URL: `{{baseUrl}}` → `http://localhost:3000`
All chat endpoints require: `Authorization: Bearer {{token}}`

## Postman Variables

| Variable         | Example                                |
| ---------------- | -------------------------------------- |
| `baseUrl`        | `http://localhost:3000`                |
| `token`          | JWT from `POST /api/auth/login`        |
| `receiverId`     | UUID of the user you want to chat with |
| `conversationId` | Returned from step 1 below             |

---

## Chat Permission Rules

| Sender Role                                | Receiver Role                   | Allowed  |
| ------------------------------------------ | ------------------------------- | -------- |
| `USER`                                     | `AGENT` / `DEVELOPER` / `OWNER` | ✅       |
| `AGENT` / `DEVELOPER` / `OWNER`            | `USER`                          | ✅       |
| `AGENT` ↔ `DEVELOPER` ↔ `OWNER` (any pair) |                                 | ❌ `403` |
| Anyone                                     | Themselves                      | ❌ `400` |

---

## Flow Overview

```
1. POST /api/chat/conversations     ← start or get a conversation (room)
2. POST /api/chat/conversations/:id ← send messages (text or with media)
3. GET  /api/chat/conversations/:id ← read message history
4. GET  /api/chat/conversations     ← inbox list
5. PUT  /api/chat/conversations/:id/read ← mark as read
6. POST /api/chat/upload            ← upload a file and get back a URL
```

---

## 1. Start or Get Conversation

**POST** `{{baseUrl}}/api/chat/conversations`

**Headers**

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body**

```json
{ "receiverId": "{{receiverId}}" }
```

> If no conversation exists between the two users it is created automatically.
> Role rules are validated here — professionals cannot chat with each other.

**Response 201 (new)**

```json
{
  "success": true,
  "message": "Conversation started",
  "data": {
    "isNew": true,
    "conversation": {
      "id": "conv-uuid",
      "createdAt": "2026-04-29T10:00:00.000Z",
      "updatedAt": "2026-04-29T10:00:00.000Z",
      "otherUser": {
        "id": "...",
        "fullName": "Elena Rossi",
        "image": null,
        "role": "AGENT"
      },
      "lastMessage": null,
      "unreadCount": 0
    }
  }
}
```

**Response 200 (existing)**

```json
{
  "success": true,
  "message": "Conversation found",
  "data": {
    "isNew": false,
    "conversation": { "id": "conv-uuid", "...": "..." }
  }
}
```

> Save `data.conversation.id` as `{{conversationId}}` in Postman.

**Errors**

- `400` — chatting with yourself
- `403` — role not allowed (e.g., AGENT → DEVELOPER)
- `404` — receiver not found

---

## 2. Send a Message (Text)

**POST** `{{baseUrl}}/api/chat/conversations/{{conversationId}}`

**Headers**

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body**

```json
{
  "content": "Hi, I'm interested in the Okedan Penthouse."
}
```

---

## 3. Send a Message (Text + Media URL)

Upload the file first (see section 6), then include the URL:

**POST** `{{baseUrl}}/api/chat/conversations/{{conversationId}}`

**Headers**

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body**

```json
{
  "content": "Here is the floor plan.",
  "mediaUrl": "https://backend.property-file.com/uploads/chat/1714298400000-abc123.jpg",
  "mediaType": "image"
}
```

---

## 4. Send a Message (Upload File Directly)

**POST** `{{baseUrl}}/api/chat/conversations/{{conversationId}}`

Use `form-data`:

| Key       | Type | Notes                                |
| --------- | ---- | ------------------------------------ |
| `content` | Text | Optional caption                     |
| `media`   | File | Image / video / document (max 50 MB) |

**Response 201**

```json
{
  "success": true,
  "message": "Message sent",
  "data": {
    "id": "msg-uuid",
    "conversationId": "conv-uuid",
    "senderId": "sender-uuid",
    "receiverId": "receiver-uuid",
    "content": "Here is the floor plan.",
    "mediaUrl": "https://backend.property-file.com/uploads/chat/1714298400000-abc123.jpg",
    "mediaType": "image",
    "isRead": false,
    "createdAt": "2026-04-29T10:50:00.000Z",
    "sender": { "id": "...", "fullName": "John", "image": null, "role": "USER" }
  }
}
```

The receiver also receives this instantly via Socket.IO event `message:new`.

---

## 5. Get Message History

**GET** `{{baseUrl}}/api/chat/conversations/{{conversationId}}?page=1&limit=50`

**Headers**

```
Authorization: Bearer {{token}}
```

**Query params**

| Param   | Default | Max |
| ------- | ------- | --- |
| `page`  | 1       | —   |
| `limit` | 50      | 100 |

**Response 200**

```json
{
  "success": true,
  "message": "Messages fetched",
  "data": {
    "conversationId": "conv-uuid",
    "page": 1,
    "limit": 50,
    "total": 17,
    "messages": [
      {
        "id": "msg-uuid",
        "content": "Good morning Julian...",
        "mediaUrl": null,
        "mediaType": null,
        "isRead": true,
        "createdAt": "2026-04-29T10:45:00.000Z",
        "sender": { "id": "...", "fullName": "Elena Rossi", "role": "AGENT" }
      }
    ]
  }
}
```

> Calling this endpoint automatically marks all incoming messages as read.

---

## 6. Get Inbox (All Conversations)

**GET** `{{baseUrl}}/api/chat/conversations`

**Headers**

```
Authorization: Bearer {{token}}
```

**Response 200**

```json
{
  "success": true,
  "message": "Conversations fetched",
  "data": [
    {
      "id": "conv-uuid",
      "otherUser": {
        "id": "...",
        "fullName": "Elena Rossi",
        "image": null,
        "role": "AGENT"
      },
      "lastMessage": {
        "content": "Just loaded up the PDF...",
        "mediaUrl": null,
        "senderId": "partner-uuid",
        "isRead": false,
        "createdAt": "2026-04-29T11:22:00.000Z"
      },
      "unreadCount": 2,
      "updatedAt": "2026-04-29T11:22:00.000Z"
    }
  ]
}
```

---

## 7. Mark Conversation as Read

**PUT** `{{baseUrl}}/api/chat/conversations/{{conversationId}}/read`

**Headers**

```
Authorization: Bearer {{token}}
```

**Response 200**

```json
{
  "success": true,
  "message": "Messages marked as read",
  "data": { "markedRead": 3 }
}
```

---

## 8. Upload Media (Separate)

Use this when you want to upload a file first and get the URL before sending the message.

**POST** `{{baseUrl}}/api/chat/upload`

**Headers**

```
Authorization: Bearer {{token}}
```

**Body** → `form-data`

| Key    | Type | Notes                          |
| ------ | ---- | ------------------------------ |
| `file` | File | Image/video/doc, max **50 MB** |

**Supported types:** jpg, png, gif, webp, avif, mp4, webm, mov, pdf, doc, docx, xls, xlsx, ppt, pptx, zip, txt

**Response 201**

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://backend.property-file.com/uploads/chat/1714298400000-abc123.jpg",
    "type": "image",
    "mimeType": "image/jpeg",
    "size": 234123,
    "originalName": "kitchen.jpg"
  }
}
```

Use `data.url` as `mediaUrl` and `data.type` as `mediaType` when calling send message.

---

## 9. Real-Time (Socket.IO)

The server runs Socket.IO on the same port as HTTP.

### Connect

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: { token: "<JWT>" },
});
```

### Events the server emits to you

| Event              | Payload              | When                              |
| ------------------ | -------------------- | --------------------------------- |
| `message:new`      | full message object  | A new message was sent **to** you |
| `message:sent`     | full message object  | Echo of a message **you** sent    |
| `typing`           | `{ from, isTyping }` | The other user is typing          |
| `presence:online`  | `{ userId }`         | A user connected                  |
| `presence:offline` | `{ userId }`         | A user disconnected               |

### Events you can emit

| Event               | Payload                    | Effect                                |
| ------------------- | -------------------------- | ------------------------------------- |
| `typing`            | `{ receiverId, isTyping }` | Forwards typing indicator to receiver |
| `conversation:join` | `{ conversationId }`       | Join a conversation room              |

---

## End-to-End Test Flow

1. Register **User A** (role `USER`) and **Agent B** (role `AGENT`)
2. Login as User A → save `token`; copy Agent B's `id` → save as `receiverId`
3. `POST /api/chat/conversations` → save `data.conversation.id` as `conversationId`
4. `POST /api/chat/conversations/{{conversationId}}` with `{ "content": "Hello!" }`
5. Login as Agent B → `GET /api/chat/conversations` → see the conversation with User A
6. `GET /api/chat/conversations/{{conversationId}}` → see message history
7. `POST /api/chat/upload` with an image → copy `data.url`
8. `POST /api/chat/conversations/{{conversationId}}` with `mediaUrl` + `mediaType`
9. **Negative test:** Create Agent C, then as Agent B call `POST /api/chat/conversations` with Agent C's id → should return `403`

Base URL: `{{baseUrl}}` → `http://localhost:3000`
All chat endpoints require: `Authorization: Bearer {{token}}`

## Postman Variables

| Variable         | Example                                  |
| ---------------- | ---------------------------------------- |
| `baseUrl`        | `http://localhost:3000`                  |
| `token`          | JWT from `POST /api/auth/login`          |
| `receiverId`     | UUID of the user to chat with            |
| `conversationId` | Returned in messages / conversation list |

---

## Chat Permission Rules

| Sender Role                                | Receiver Role                   | Allowed  |
| ------------------------------------------ | ------------------------------- | -------- |
| `USER`                                     | `AGENT` / `DEVELOPER` / `OWNER` | ✅       |
| `AGENT` / `DEVELOPER` / `OWNER`            | `USER`                          | ✅       |
| `AGENT` ↔ `DEVELOPER` ↔ `OWNER` (any pair) |                                 | ❌ `403` |
| Anyone                                     | Themselves                      | ❌ `400` |

---

## 1. Upload Attachment (Image / Video / File)

**POST** `{{baseUrl}}/api/chat/upload`

**Headers**

```
Authorization: Bearer {{token}}
```

**Body** → `form-data`

| Key    | Type | Notes                                                                                                                     |
| ------ | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| `file` | File | image (jpg/png/gif/webp/avif), video (mp4/webm/mov), or document (pdf/doc/docx/xls/xlsx/ppt/pptx/zip/txt). Max **50 MB**. |

**Response 201**

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://backend.property-file.com/uploads/chat/1714298400000-abc123.jpg",
    "type": "image",
    "mimeType": "image/jpeg",
    "size": 234123,
    "originalName": "kitchen.jpg"
  }
}
```

`type` is one of `image`, `video`, or `file`. Use `url` (and optionally `type`) when sending a message.

**Errors**

- `400` — No file uploaded / Unsupported file type
- `401` — Missing/invalid token

---

## 2. Send Message

**POST** `{{baseUrl}}/api/chat/messages`

**Headers**

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body** — text only

```json
{
  "receiverId": "{{receiverId}}",
  "content": "Hi, I'm interested in the Okedan Penthouse."
}
```

**Body** — text + attachment

```json
{
  "receiverId": "{{receiverId}}",
  "content": "Here is the floor plan.",
  "attachmentUrl": "https://backend.property-file.com/uploads/chat/1714298400000-abc123.jpg",
  "attachmentType": "image"
}
```

**Body** — attachment only (no text)

```json
{
  "receiverId": "{{receiverId}}",
  "attachmentUrl": "https://backend.property-file.com/uploads/chat/1714298400000-vid.mp4",
  "attachmentType": "video"
}
```

> At least one of `content` or `attachmentUrl` is required.

**Response 201**

```json
{
  "success": true,
  "message": "Message sent",
  "data": {
    "id": "msg-uuid",
    "conversationId": "conv-uuid",
    "senderId": "sender-uuid",
    "receiverId": "receiver-uuid",
    "content": "Here is the floor plan.",
    "attachmentUrl": "https://.../uploads/chat/...jpg",
    "attachmentType": "image",
    "isRead": false,
    "createdAt": "2026-04-29T10:50:00.000Z",
    "sender": {
      "id": "...",
      "fullName": "John",
      "image": null,
      "role": "USER"
    },
    "receiver": {
      "id": "...",
      "fullName": "Jane",
      "image": null,
      "role": "AGENT"
    }
  }
}
```

The receiver also receives this in real-time over Socket.IO via the `message:new` event.

**Errors**

- `400` — `receiverId` missing, or no content + no attachment, or chatting with self
- `403` — Not allowed (e.g., AGENT ↔ DEVELOPER)
- `404` — Receiver not found

---

## 3. List My Conversations

**GET** `{{baseUrl}}/api/chat/conversations`

**Headers**

```
Authorization: Bearer {{token}}
```

**Response 200**

```json
{
  "success": true,
  "message": "Conversations fetched",
  "data": [
    {
      "id": "conv-uuid",
      "partner": {
        "id": "partner-uuid",
        "fullName": "Elena Rossi",
        "image": "https://.../uploads/image/...jpg",
        "role": "AGENT"
      },
      "lastMessage": {
        "id": "msg-uuid",
        "content": "Just loaded up the PDF...",
        "attachmentUrl": null,
        "senderId": "partner-uuid",
        "isRead": false,
        "createdAt": "2026-04-29T11:22:00.000Z"
      },
      "updatedAt": "2026-04-29T11:22:00.000Z"
    }
  ]
}
```

---

## 4. Get Messages of a Conversation

**GET** `{{baseUrl}}/api/chat/conversations/:conversationId/messages?page=1&limit=50`

**Headers**

```
Authorization: Bearer {{token}}
```

**Query**
| Param | Default | Max |
|-------|---------|-----|
| `page` | 1 | — |
| `limit` | 50 | 100 |

**Response 200**

```json
{
  "success": true,
  "message": "Messages fetched",
  "data": {
    "conversationId": "conv-uuid",
    "page": 1,
    "limit": 50,
    "total": 17,
    "messages": [
      {
        "id": "msg-uuid",
        "conversationId": "conv-uuid",
        "senderId": "...",
        "receiverId": "...",
        "content": "Good morning Julian...",
        "attachmentUrl": null,
        "isRead": true,
        "createdAt": "2026-04-29T10:45:00.000Z"
      }
    ]
  }
}
```

> Calling this endpoint automatically marks all incoming messages in the conversation as read.

**Errors**

- `403` — You are not part of this conversation
- `404` — Conversation not found

---

## 5. Mark Conversation as Read

**PATCH** `{{baseUrl}}/api/chat/conversations/:conversationId/read`

**Headers**

```
Authorization: Bearer {{token}}
```

**Response 200**

```json
{
  "success": true,
  "message": "Messages marked as read",
  "data": { "updated": 3 }
}
```

---

## 6. Real-Time (Socket.IO)

The server runs Socket.IO on the same port as HTTP (`ws://localhost:3000`).

### Connect (browser / client)

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: { token: "<JWT>" }, // same token used for REST
});

socket.on("connect", () => console.log("connected:", socket.id));
socket.on("connect_error", (e) => console.error(e.message));
```

### Events the server emits

| Event              | Payload              | When                                               |
| ------------------ | -------------------- | -------------------------------------------------- |
| `message:new`      | full message object  | A new message is sent **to** you                   |
| `message:sent`     | full message object  | Echo of a message **you** sent (multi-device sync) |
| `typing`           | `{ from, isTyping }` | The other user is typing                           |
| `presence:online`  | `{ userId }`         | A user just connected                              |
| `presence:offline` | `{ userId }`         | A user disconnected                                |

### Events the client can emit

| Event               | Payload                    | Effect                               |
| ------------------- | -------------------------- | ------------------------------------ |
| `typing`            | `{ receiverId, isTyping }` | Forwards to the receiver as `typing` |
| `conversation:join` | `{ conversationId }`       | Joins a conversation room (optional) |

### Example — listening for incoming messages

```js
socket.on("message:new", (msg) => {
  console.log("New message from", msg.sender.fullName, ":", msg.content);
});
```

### Postman tip

Postman supports Socket.IO via a **WebSocket Request** (New → WebSocket).

- URL: `ws://localhost:3000/socket.io/?EIO=4&transport=websocket`
- For a friendlier experience use the official `socket.io-client` in a small Node script — Postman's plain WS client requires manual Socket.IO framing.

---

## End-to-end Test Flow

1. Register two users:
   - User A → role `USER`
   - User B → role `AGENT`
2. Login as A → save `token` and copy B's `id` into `receiverId`.
3. `POST /api/chat/upload` with an image → copy `url` from response.
4. `POST /api/chat/messages` with `receiverId` + `content` + `attachmentUrl`.
5. Login as B in another tab → `GET /api/chat/conversations` should show the conversation.
6. `GET /api/chat/conversations/:id/messages` to see the full history.
7. (Optional) Connect as B over Socket.IO and send a message from A — B receives `message:new` instantly.
8. Negative test: register a second AGENT and try to message the first AGENT → should fail with `403`.
