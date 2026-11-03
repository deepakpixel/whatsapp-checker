# WhatsApp Link Status Checker

A lightweight, high-performance serverless micro-service deployed on **Vercel** to validate WhatsApp group invite URLs (`VALID`, `INVALID`, or `UNKNOWN`).

- **Fast & Concurrent**: Checks up to 15 links in parallel using native async fetch.
- **Bare Minimum & Clean**: Zero bloated dependencies. No landing page scraping confusion. Just accepts WhatsApp URLs and returns their statuses.
- **Secure**: Protected by a single environment secret (`CHECKER_SECRET`).

---

## 🚀 Deployment Instructions

### Option 1: Via Vercel Dashboard (Recommended)

1. Open [vercel.com/new](https://vercel.com/new).
2. Select and import the repository: **`deepakpixel/whatsapp-checker`**.
3. Under **Environment Variables**, add:
   - **`CHECKER_SECRET`**: `<your-chosen-secret>` (e.g. `YzKe-05ZaxKb4wxIj-uOaYs4a3-gn_eVA2hHa43WabU`)
4. Click **Deploy**.

### Option 2: Via Vercel CLI

```bash
cd whatsapp-checker
npm i -g vercel  # if not already installed
vercel
vercel env add CHECKER_SECRET
vercel --prod
```

---

## 🔑 Authentication

Send your secret using any of the following methods:
- **Header**: `x-monitor-key: <CHECKER_SECRET>` or `x-checker-secret: <CHECKER_SECRET>`
- **Authorization Header**: `Authorization: Bearer <CHECKER_SECRET>`
- **Query Parameter**: `?key=<CHECKER_SECRET>` or `?secret=<CHECKER_SECRET>`

*(If `CHECKER_SECRET` is not set in Vercel, requests are allowed by default for testing.)*

---

## 📡 API Reference

### 1. Batch Check WhatsApp URLs (`POST /api/check`)

Pass a list of WhatsApp invite URLs:

```bash
curl -X POST "https://<your-vercel-domain>.vercel.app/api/check" \
  -H "Content-Type: application/json" \
  -H "x-monitor-key: <CHECKER_SECRET>" \
  -d '{
    "urls": [
      "https://chat.whatsapp.com/JHdKYcFChmA81NlsFpz89P",
      "https://chat.whatsapp.com/HEwjm2ykp5k2D8Mc4TBFor",
      "https://chat.whatsapp.com/BwzqpuQALQCLsOTQwbJQpO"
    ]
  }'
```

#### Response (`200 OK`):

```json
{
  "ok": true,
  "checkedAt": "2026-11-03T07:45:00.000Z",
  "summary": {
    "total": 3,
    "valid": 2,
    "invalid": 1,
    "unknown": 0
  },
  "results": [
    {
      "url": "https://chat.whatsapp.com/JHdKYcFChmA81NlsFpz89P",
      "canonical": "https://chat.whatsapp.com/JHdKYcFChmA81NlsFpz89P",
      "status": "VALID",
      "groupName": "15 Nov (Sunday) - 11 AM | Social Media Income Mastery...",
      "details": "Active WhatsApp group invite",
      "httpStatus": 200
    },
    {
      "url": "https://chat.whatsapp.com/HEwjm2ykp5k2D8Mc4TBFor",
      "canonical": "https://chat.whatsapp.com/HEwjm2ykp5k2D8Mc4TBFor",
      "status": "VALID",
      "groupName": "5th Nov - 12 PM | Acharaya Pankit Goyal Ji || Masterclass",
      "details": "Active WhatsApp group invite",
      "httpStatus": 200
    },
    {
      "url": "https://chat.whatsapp.com/BwzqpuQALQCLsOTQwbJQpO",
      "canonical": "https://chat.whatsapp.com/BwzqpuQALQCLsOTQwbJQpO",
      "status": "INVALID",
      "groupName": "",
      "details": "Invite page loaded without a group/community name (link revoked or expired)",
      "httpStatus": 200
    }
  ]
}
```

---

### 2. Single URL Check (`GET /api/check`)

```bash
curl -s "https://<your-vercel-domain>.vercel.app/api/check?url=https://chat.whatsapp.com/JHdKYcFChmA81NlsFpz89P" \
  -H "x-monitor-key: <CHECKER_SECRET>"
```

#### Response (`200 OK`):

```json
{
  "ok": true,
  "url": "https://chat.whatsapp.com/JHdKYcFChmA81NlsFpz89P",
  "canonical": "https://chat.whatsapp.com/JHdKYcFChmA81NlsFpz89P",
  "status": "VALID",
  "groupName": "15 Nov (Sunday) - 11 AM | Social Media Income Mastery...",
  "details": "Active WhatsApp group invite",
  "httpStatus": 200
}
```

---

### 3. Legacy Creator Batch Check (`POST /api/check-batch`)

For direct compatibility with existing Carnot Intelligence callers passing `{ creators: [...] }`:

```bash
curl -X POST "https://<your-vercel-domain>.vercel.app/api/check-batch" \
  -H "Content-Type: application/json" \
  -H "x-monitor-key: <CHECKER_SECRET>" \
  -d '{
    "creators": [
      {
        "id": "domain-1",
        "creator": "Domain 1",
        "urls": ["https://chat.whatsapp.com/JHdKYcFChmA81NlsFpz89P"]
      }
    ]
  }'
```

---

### 4. Health Probe (`GET /api/health`)

```bash
curl -s "https://<your-vercel-domain>.vercel.app/api/health"
```

```json
{
  "ok": true,
  "service": "whatsapp-checker",
  "authConfigured": true,
  "timestamp": "2026-11-03T07:45:00.000Z"
}
```

---

## 🧪 Local Testing

```bash
node test.js
```
