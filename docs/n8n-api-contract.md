# n8n Webhook API Contracts

This specification documents the contracts between the **Next.js 16 Campaign Dashboard** and the **n8n Orchestration Server**.

---

## Architecture Overview

```text
Next.js (Server Proxy)
   │
   ├─► Authorization: Bearer <N8N_API_KEY>
   ├─► X-Webhook-Signature: <HMAC-SHA256>
   ├─► X-Request-ID: <UUID>
   ▼
n8n Webhooks / Workflows
   ▼
Evolution API / Meta Cloud API (WhatsApp)
```

---

## 1. Templates Webhook

- **Path:** `/webhook/whatsapp-campaign/templates`
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `X-Webhook-Signature: <signature>`
  - `X-Request-ID: <id>`

### Request Body (List / Sync):
```json
{
  "action": "list"
}
```

### Response:
```json
{
  "success": true,
  "templates": [
    {
      "id": "tpl_festive_sale_01",
      "name": "Festive Season Discount Offer",
      "language": "en",
      "category": "MARKETING",
      "status": "Approved",
      "bodyText": "Hello {{customer_name}}, ...",
      "variables": ["customer_name", "discount", "product_link"]
    }
  ]
}
```

---

## 2. Start Campaign Webhook

- **Path:** `/webhook/whatsapp-campaign/start`
- **Method:** `POST`

### Request Body:
```json
{
  "campaignId": "cmp_1728392100",
  "name": "Diwali Mega Sale",
  "templateId": "tpl_festive_sale_01",
  "audience": {
    "type": "segment",
    "segmentId": "seg_vip"
  },
  "variables": {
    "customer_name": "Naveen",
    "discount": "25%",
    "product_link": "https://example.com/diwali-sale?utm_source=whatsapp"
  },
  "throttling": {
    "batchSize": 20,
    "delaySeconds": 5,
    "maxPerMinute": 60
  }
}
```

### Response:
```json
{
  "success": true,
  "campaignId": "cmp_1728392100",
  "status": "queued",
  "audienceCount": 1250
}
```

---

## 3. Campaign Status Webhook (Polling)

- **Path:** `/webhook/whatsapp-campaign/status`
- **Method:** `POST`

### Request Body:
```json
{
  "campaignId": "cmp_1728392100"
}
```

### Response:
```json
{
  "success": true,
  "campaign": {
    "status": "Running",
    "total": 1250,
    "queued": 850,
    "sent": 400,
    "delivered": 380,
    "read": 240,
    "failed": 20,
    "optedOut": 1
  }
}
```

---

## 4. Emergency Kill Switch Webhook

- **Path:** `/webhook/whatsapp-campaign/stop`
- **Method:** `POST`

### Request Body:
```json
{
  "action": "stop",
  "campaignId": "cmp_1728392100",
  "reason": "Emergency kill switch initiated by user",
  "timestamp": 1728392250000
}
```

### Response:
```json
{
  "success": true,
  "campaignId": "cmp_1728392100",
  "status": "halted",
  "cancelledCount": 850
}
```

---

## 5. Customer Import Webhook

- **Path:** `/webhook/whatsapp-campaign/import`
- **Method:** `POST`

### Request Body:
```json
{
  "customers": [
    {
      "name": "Aarav Sharma",
      "phone": "+919876543210",
      "tags": ["vip", "festive"],
      "optedIn": true
    }
  ],
  "totalImported": 1
}
```

---

## Example cURL Commands

```bash
# Test start campaign
curl -X POST "https://n8n.example.com/webhook/whatsapp-campaign/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_N8N_API_KEY" \
  -d '{"campaignId":"cmp_test_101","templateId":"tpl_01","variables":{"discount":"20%"}}'
```
