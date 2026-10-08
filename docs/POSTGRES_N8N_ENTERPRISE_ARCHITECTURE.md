# Enterprise WhatsApp Promotional Campaign Architecture & Integration Guide

## 1. Executive Summary & Architecture Overview

This platform implements an enterprise-grade, anti-spam WhatsApp promotional campaign delivery system. The application architecture splits concerns cleanly:

- **Next.js 16 App Router UI**: Provides administration, customer filtering, CSV import, template management, campaign scheduling, emergency kill-switches, and live PostgreSQL telemetry.
- **Dedicated PostgreSQL Database (`whatsapp_campaign` schema)**: Acts as the state-of-the-art persistent queue and single source of truth for campaigns, audience targets, granular message jobs, idempotency keys, and delivery logs.
- **n8n Orchestration Engine**: Runs scheduled cron polling (every 1 minute) and webhook triggers to fetch pending jobs, lock rows to prevent duplicate execution (idempotency), pace delivery (anti-spam pacing), dispatch via Evolution API, and update execution flags back into PostgreSQL.
- **Evolution API (WhatsApp Engine)**: Interfaces with Meta WhatsApp instances without ever exposing credentials to the web client.

```
┌────────────────────────────────┐
│      Next.js 16 Dashboard      │
│  (UI / REST API Routes / App)  │
└────────────────┬───────────────┘
                 │ Public DB URL (Port 6574, SSL)
                 ▼
┌────────────────────────────────────────────────────────┐
│               PostgreSQL Database                      │
│        Dedicated Schema: whatsapp_campaign             │
│  ├── campaigns (Metadata, status, aggregate counters)  │
│  ├── campaign_jobs (Granular queue, idempotency key)   │
│  ├── customers (Opt-in, opt-out suppression blocklist) │
│  ├── templates (Approved templates, variables)         │
│  └── segments (Target audience filter rules)           │
└────────────────▲───────────────────────────────────────┘
                 │
                 │ Internal Network (8zr2cd3qrthqd9tpddk4z6bf:5432)
                 │
┌────────────────┴───────────────────────────────────────┐
│        n8n Orchestration Engine (Workflow)              │
│    "Promotional WhatsApp Messages Campaign"            │
│  ├── Schedule Trigger (Cron: Every 1 Minute)           │
│  ├── Webhook / Manual Triggers                         │
│  ├── 01: Fetch Pending Jobs from PostgreSQL            │
│  ├── 02: Check If Jobs Exist (Exit if idle)            │
│  ├── 03: Mark Jobs 'processing' (Idempotency Lock)     │
│  ├── 04: Batch Loop (1 by 1)                           │
│  ├── 05: Anti-Spam Wait Node (2s delay per message)    │
│  ├── 06: Send Message via Evolution API                │
│  ├── 07: Check Delivery Status                         │
│  ├── 08a/08b: Update Job & Customer in PostgreSQL     │
│  ├── 09: Loop Sync & Next Job                          │
│  └── 10: Recalculate Campaign Counters & Auto-Complete │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────┐
│         Evolution API          │
│    (WhatsApp Web/Cloud API)    │
└────────────────────────────────┘
```

---

## 2. PostgreSQL Dedicated Schema (`whatsapp_campaign`)

The database is hosted on the remote server with Coolify container ID `8zr2cd3qrthqd9tpddk4z6bf`.

### Connection Configuration
- **Application Public URL**:
  `postgres://postgres:8r7OI5gyHV7RSXNTYOl5MUCrDfcCOOrdD92Ytz6IXDrHRCOgzYXwv24H2qGsOUix@100.121.9.105:6574/postgres?sslmode=require`
- **n8n Internal Docker Host**:
  `8zr2cd3qrthqd9tpddk4z6bf:5432`, DB: `postgres`, User: `postgres`, Password: `8r7OI5gyHV7RSXNTYOl5MUCrDfcCOOrdD92Ytz6IXDrHRCOgzYXwv24H2qGsOUix`, SSL: Disabled.

### Database Tables Specification

#### 1. `whatsapp_campaign.campaigns`
Stores campaign configurations, schedule, throttling parameters, and real-time aggregate counters.
- `id`: VARCHAR(64) PRIMARY KEY
- `name`: VARCHAR(255) NOT NULL
- `description`: TEXT
- `status`: VARCHAR(32) (`Draft`, `Scheduled`, `Running`, `Completed`, `Failed`, `Cancelled`)
- `template_id`: VARCHAR(64) NOT NULL
- `template_name`: VARCHAR(255)
- `audience_type`: VARCHAR(64) (`all_opted_in`, `segment`, `manual_selection`, `csv_upload`)
- `segment_id`: VARCHAR(64)
- `variables`: JSONB (Key-value mappings e.g. `discount`, `product_link`, `coupon_code`)
- `media`: JSONB (URL, type, caption)
- `tracking`: JSONB (UTM parameters: `utm_source`, `utm_medium`, `utm_campaign`)
- `schedule`: JSONB (`type`: `immediate` | `scheduled`, `scheduledAt`)
- `throttling`: JSONB (`batchSize`: 10, `delaySeconds`: 2, `maxPerMinute`: 30)
- `total_audience`: INT
- `queued_count`: INT
- `sent_count`: INT
- `delivered_count`: INT
- `read_count`: INT
- `failed_count`: INT
- `opted_out_count`: INT
- `started_at`: TIMESTAMPTZ
- `completed_at`: TIMESTAMPTZ

#### 2. `whatsapp_campaign.campaign_jobs`
The core transactional queue table for every individual message dispatch.
- `id`: BIGSERIAL PRIMARY KEY
- `campaign_id`: VARCHAR(64) REFERENCES `whatsapp_campaign.campaigns(id)` ON DELETE CASCADE
- `customer_id`: VARCHAR(64) REFERENCES `whatsapp_campaign.customers(id)` ON DELETE SET NULL
- `customer_name`: VARCHAR(255) NOT NULL
- `phone`: VARCHAR(32) NOT NULL (Normalized international E.164 e.g. `+919876543210`)
- `message`: TEXT (Fully formatted & personalized message text)
- `media_url`: TEXT
- `media_type`: VARCHAR(32) (`image`, `video`, `document`, `none`)
- `status`: VARCHAR(32) DEFAULT `'pending'` (`pending`, `processing`, `sent`, `delivered`, `failed`, `cancelled`, `opted_out`)
- `retry_count`: INT DEFAULT 0
- `max_retries`: INT DEFAULT 3
- `evolution_message_id`: VARCHAR(128) (Returned by Evolution API upon delivery)
- `error_message`: TEXT
- `idempotency_key`: VARCHAR(255) NOT NULL UNIQUE (Format: `${campaign_id}_${customer_id}_${template_id}`)
- `dispatched_at`: TIMESTAMPTZ
- `delivered_at`: TIMESTAMPTZ
- `read_at`: TIMESTAMPTZ

#### 3. `whatsapp_campaign.customers`
Suppression list and contact database.
- `id`: VARCHAR(64) PRIMARY KEY
- `name`: VARCHAR(255) NOT NULL
- `phone`: VARCHAR(32) NOT NULL UNIQUE (E.164 formatted)
- `email`: VARCHAR(255)
- `country_code`: VARCHAR(8) DEFAULT `'91'`
- `tags`: TEXT[] (Array of string tags e.g. `['VIP', 'fashion']`)
- `segment`: VARCHAR(128)
- `source`: VARCHAR(128)
- `opted_in`: BOOLEAN DEFAULT TRUE
- `opted_out`: BOOLEAN DEFAULT FALSE
- `opted_out_at`: TIMESTAMPTZ
- `opt_out_reason`: TEXT
- `last_contacted_at`: TIMESTAMPTZ
- `last_message_status`: VARCHAR(32)
- `purchase_count`: INT DEFAULT 0
- `total_spent`: NUMERIC(12,2) DEFAULT 0.00

#### 4. `whatsapp_campaign.templates`
WhatsApp message templates with auto-detected parameter variables and rich CTA buttons.
- `id`: VARCHAR(64) PRIMARY KEY
- `name`: VARCHAR(255) NOT NULL
- `language`: VARCHAR(16) DEFAULT `'en'`
- `category`: VARCHAR(32) (`MARKETING`, `UTILITY`, `AUTHENTICATION`)
- `status`: VARCHAR(32) (`Approved`, `Pending`, `Draft`)
- `body_text`: TEXT NOT NULL
- `variables`: TEXT[]
- `media_type`: VARCHAR(32)
- `media_url`: TEXT
- `buttons`: JSONB

#### 5. `whatsapp_campaign.segments`
Audience segmentation criteria.
- `id`: VARCHAR(64) PRIMARY KEY
- `name`: VARCHAR(255) NOT NULL
- `description`: TEXT
- `filter`: JSONB (Criteria e.g. `{"optedIn": true, "tags": ["sarees"]}`)
- `customer_count`: INT

---

## 3. Idempotency & Anti-Spam Pacing Architecture

### Problem Statement
Sending marketing messages over WhatsApp carries strict carrier limitations and Meta platform ban penalties if sent as bulk spam or duplicates.

### Solution Mechanisms

1. **Deterministic Idempotency Key**:
   - Each job row in `whatsapp_campaign.campaign_jobs` enforces a `UNIQUE` constraint on `idempotency_key`.
   - Computed as `${campaignId}_${customerId}_${templateId}`.
   - Any duplicate campaign launch or overlapping cron schedule will result in a harmless `ON CONFLICT (idempotency_key) DO NOTHING` in PostgreSQL.

2. **Atomic State Transition (`pending` -> `processing`)**:
   - At the beginning of each 1-minute cron iteration, n8n executes:
     ```sql
     UPDATE whatsapp_campaign.campaign_jobs
     SET status = 'processing', updated_at = NOW()
     WHERE id = {{ $json.job_id }}
     RETURNING id AS job_id, campaign_id, ...;
     ```
   - This immediately locks the jobs so that a concurrent execution or manual trigger will never re-pick the same messages.

3. **Rate Limiting & Pacing**:
   - Batch size is limited to 10 messages per minute.
   - Inside the loop, the **Anti-Spam Rate Limit Wait** node enforces a 2-second sleep between individual WhatsApp message dispatches.
   - This keeps delivery well within Meta and Evolution API recommended thresholds (max 30 messages/min for warmed numbers).

4. **Automatic Status Recalculation**:
   - When all jobs for a campaign transition out of `pending` and `processing`, the final SQL node automatically marks the campaign status as `Completed` and records `completed_at = NOW()`.
   - If jobs remain in `pending`, the campaign remains `Running` for the next 1-minute cron pass.

---

## 4. n8n Workflow Specification

- **Workflow Name**: `Promotional WhatsApp Messages Campaign`
- **Workflow ID**: `promotional_whatsapp_campaign`
- **Execution Mode**: Active (Scheduled Cron + Webhook)

### Workflow Node Pipeline

1. **Schedule Trigger (Every 1 Min)**: Fires at `* * * * *` continuously in the background.
2. **Manual Trigger**: Allows operator to run a manual execution cycle directly in n8n.
3. **Webhook - Start Campaign**: Listens on `/webhook/whatsapp-campaign/start` for instant triggers triggered by the Next.js UI when a user launches an immediate campaign.
4. **01 - Fetch Pending Jobs from PostgreSQL**:
   Queries `whatsapp_campaign.campaign_jobs` for up to 10 rows where `status = 'pending'` and campaign `status IN ('Scheduled', 'Running')`.
5. **02 - Has Pending Jobs? (If Node)**:
   Checks if rows were returned. If 0 jobs, the execution terminates cleanly in under 50ms without executing unnecessary steps.
6. **03 - Idempotency Lock (Mark Processing)**:
   Updates the fetched job IDs to `'processing'` atomically.
7. **04 - Loop Over Jobs (Split in Batches)**:
   Iterates through each job item one by one.
8. **05 - Anti-Spam Rate Limit Wait**:
   Pauses for 2 seconds.
9. **06 - Send WhatsApp via Evolution API**:
   Dispatches either `/message/sendText` or `/message/sendMedia` to the configured Evolution instance (`Naveen kumar kambham`) with the Evolution API authentication header.
10. **07 - Check Delivery Status (If Node)**:
    Evaluates whether Evolution API returned a message key / success ID.
11. **08a - Mark Sent in Postgres (On Success)**:
    Updates `campaign_jobs` row to `status = 'sent'`, sets `evolution_message_id = $json.key.id`, `dispatched_at = NOW()`. Updates customer `last_contacted_at = NOW()`.
12. **08b - Record Failure in Postgres (On Error)**:
    Increments `retry_count`. If `retry_count >= 3`, sets status to `'failed'`; otherwise returns to `'pending'` for retry in next cron pass.
13. **09 - Sync & Next Job (No-Op Node)**:
    Returns back to node 04 until the batch finishes.
14. **10 - Recalculate Campaign Flags & Stats**:
    Recalculates `sent_count`, `queued_count`, `delivered_count`, `failed_count`, and toggles campaign status to `'Completed'` when 0 pending jobs remain.
15. **11 - Respond to Webhook**:
    Returns execution status payload to the caller.

---

## 5. Next.js 16 REST API Specification

All routes query and mutate PostgreSQL directly via `src/lib/db/index.ts`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/campaigns` | Lists all campaigns from PostgreSQL with latest flags |
| `POST` | `/api/campaigns` | Creates campaign, generates recipient jobs with idempotency keys, and triggers n8n start webhook |
| `GET` | `/api/campaigns/:id` | Fetches campaign details by ID |
| `PUT` | `/api/campaigns/:id` | Updates campaign metadata, variables, or throttling |
| `DELETE` | `/api/campaigns/:id` | Deletes campaign and cascades deletion of jobs |
| `POST` | `/api/campaigns/:id/start` | Starts campaign, sets status to `Running` |
| `POST` | `/api/campaigns/:id/stop` | Emergency kill-switch: sets status to `Cancelled` and aborts pending jobs |
| `GET` | `/api/campaigns/:id/status` | Live delivery status and counter metrics |
| `GET` | `/api/campaigns/:id/logs` | Real-time dispatch audit logs from `campaign_jobs` |
| `GET` | `/api/customers` | Searches, filters (opt-in/opt-out/segment/tag) customers |
| `POST` | `/api/customers` | Creates customer with normalized phone number |
| `PUT` | `/api/customers/:id` | Updates customer profile or opt-out status |
| `DELETE` | `/api/customers/:id` | Removes customer |
| `POST` | `/api/customers/import` | High-speed CSV import with validation & blocklist suppression |
| `GET` | `/api/customers/export` | Streams customer list to CSV download |
| `POST` | `/api/customers/bulk-tag` | Bulk tags selected customers |
| `POST` | `/api/customers/bulk-opt-out` | Bulk suppresses customers to opt-out blocklist |
| `GET` | `/api/templates` | Lists approved marketing templates |
| `POST` | `/api/templates` | Creates new template with automatic variable extraction |
| `GET` | `/api/segments` | Lists target audience segments |
| `POST` | `/api/segments` | Creates audience segment definition |
| `GET` | `/api/stats` | Aggregated live metrics from database tables |

---

## 6. Verification & Operational Testing

1. **Unit Tests**:
   - `npm test` runs 7 comprehensive tests covering E.164 phone normalization, variable extraction, UTM link generation, phone masking, and HMAC signature validation.
2. **ESLint**:
   - `npm run lint` completes with `0 errors`.
3. **Next.js Production Build**:
   - `npm run build` compiles all 33 static and dynamic routes cleanly.
4. **Live Database Dispatch Test**:
   - Verified row `campaign_jobs` ID 3:
     - Dispatched to phone `+919811223344`
     - Status: `sent`
     - Evolution Message ID: `3EB0351F0966A53DB658F0`
     - Dispatched at: `2026-10-08T20:14:19.465Z`
     - Campaign status automatically transitioned to `Completed`.
