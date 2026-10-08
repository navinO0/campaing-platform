# Developer Master Handbook: WhatsApp Promotional Campaign Manager

Welcome to the **WhatsApp Promotional Campaign Manager** developer handbook. This comprehensive guide covers the system architecture, design decisions, database schema, workflow mechanics, API contracts, deployment guidelines, and operational runbooks for any current or future developer working on this codebase.

---

## Table of Contents

1. [System Overview & High-Level Architecture](#1-system-overview--high-level-architecture)
2. [Technology Stack & Architectural Principles](#2-technology-stack--architectural-principles)
3. [PostgreSQL Database Design (`whatsapp_campaign` Schema)](#3-postgresql-database-design-whatsapp_campaign-schema)
4. [Idempotency & Anti-Spam Queue Engine](#4-idempotency--anti-spam-queue-engine)
5. [n8n Orchestration Workflow ("Promotional WhatsApp Messages Campaign")](#5-n8n-orchestration-workflow-promotional-whatsapp-messages-campaign)
6. [Next.js 16 Application Architecture](#6-nextjs-16-application-architecture)
7. [Comprehensive REST API Reference](#7-comprehensive-rest-api-reference)
8. [Audience Targeting & 6-Step CSV Import Wizard](#8-audience-targeting--6-step-csv-import-wizard)
9. [Template Management & WhatsApp Simulator](#9-template-management--whatsapp-simulator)
10. [Local Development & Testing Runbook](#10-local-development--testing-runbook)
11. [Production Deployment & Infrastructure](#11-production-deployment--infrastructure)
12. [Troubleshooting & FAQ](#12-troubleshooting--faq)

---

## 1. System Overview & High-Level Architecture

The **WhatsApp Promotional Campaign Manager** is an enterprise-grade platform built to solve the core challenges of WhatsApp broadcast marketing:

1. **Carrier & Platform Compliance**: Preventing Meta WhatsApp number bans through strict message pacing (throttling), opt-out blocklist suppression, and human-like delays.
2. **Idempotency**: Ensuring that scheduled cron jobs and distributed webhook events **never** send duplicate messages to the same contact during a campaign run.
3. **Decoupled Architecture**: Completely isolating WhatsApp credentials and the WhatsApp provider API from the frontend web browser.

### The System Pipeline

```
                                ┌──────────────────────────────────────┐
                                │          Admin / Marketer UI         │
                                │   (Next.js 16 App Router, shadcn/ui) │
                                └──────────────────┬───────────────────┘
                                                   │
                                     Secure TLS / Internal Pool
                                                   │
                                                   ▼
                                ┌──────────────────────────────────────┐
                                │         PostgreSQL Database          │
                                │       Dedicated Schema:              │
                                │        whatsapp_campaign             │
                                │ ├── campaigns                        │
                                │ ├── campaign_jobs (Queue)            │
                                │ ├── customers (Suppression list)     │
                                │ ├── templates                        │
                                │ └── segments                         │
                                └──────────────────▲───────────────────┘
                                                   │
                                      Internal Docker Network
                                      (8zr2cd3qrthqd9tpddk4z6bf:5432)
                                                   │
                                ┌──────────────────┴───────────────────┐
                                │        n8n Orchestration Engine      │
                                │  ├── Schedule Cron (Every 1 minute)  │
                                │  ├── Webhook Start / Stop Triggers   │
                                │  ├── Anti-Spam Rate Limiter (2s gap) │
                                │  └── Status & Aggregate Recalculator │
                                └──────────────────┬───────────────────┘
                                                   │
                                      Authenticated HTTP Request
                                                   │
                                                   ▼
                                ┌──────────────────────────────────────┐
                                │         Evolution API Server         │
                                │  (Instance: 'Naveen kumar kambham')  │
                                └──────────────────┬───────────────────┘
                                                   │
                                                   ▼
                                ┌──────────────────────────────────────┐
                                │            Meta / WhatsApp           │
                                │          Customer Mobile Devices     │
                                └──────────────────────────────────────┘
```

---

## 2. Technology Stack & Architectural Principles

### Frontend & Application Layer
- **Framework**: **Next.js 16** (App Router, Turbopack, React 19).
- **Language**: **TypeScript 5.x** with strict type-safety.
- **Styling**: **Tailwind CSS** with a dark/light responsive design system.
- **UI Components**: **shadcn/ui** primitives built on accessible Radix UI patterns.
- **Forms & Validation**: **React Hook Form** paired with **Zod** validation schemas.
- **State & Server Cache**: **TanStack React Query v5** for optimistic updates, caching, and auto-refetching.
- **Icons & Toast**: **Lucide React** icons and **Sonner** toast notifications.

### Backend & Database Layer
- **Database**: **PostgreSQL 16** hosted via Coolify on dedicated container `postgresql-database-8zr2cd3qrthqd9tpddk4z6bf`.
- **Driver**: `pg` (Node-Postgres) with connection pooling (`pg.Pool`), custom leaf certificate handling, and snake_case to camelCase entity mappers.
- **Security**:
  - Environment variables protected server-side; zero `NEXT_PUBLIC_` leakage of database credentials or n8n API secrets.
  - HMAC-SHA256 request verification and E.164 phone number masking in logs.

### Automation & Delivery Engine
- **n8n Workflow Automation**: Self-hosted n8n in Docker (`n8nio/n8n:2.10.4`), connected to Redis for queue mode execution and PostgreSQL for state storage.
- **WhatsApp Provider**: **Evolution API**, communicating with authenticated WhatsApp instances.

---

## 3. PostgreSQL Database Design (`whatsapp_campaign` Schema)

All tables and indexes are isolated in the dedicated schema `whatsapp_campaign` to prevent any collisions with other services.

### Migration Script Location
The complete SQL schema definition is maintained at [`scripts/schema.sql`](file:///home/naveen/whatsapp-campaign-manager/scripts/schema.sql).

### Table Schema Breakdown

#### 1. `whatsapp_campaign.campaigns`
Stores campaign metadata, target audience rules, template references, throttling parameters, and real-time execution statistics.

| Column | Type | Default | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | Primary Key | Unique campaign ID (e.g. `cmp_1728414890000`) |
| `name` | VARCHAR(255) | NOT NULL | Friendly campaign name |
| `description` | TEXT | NULL | Campaign description / goal |
| `status` | VARCHAR(32) | `'Scheduled'` | `'Draft'`, `'Scheduled'`, `'Running'`, `'Completed'`, `'Failed'`, `'Cancelled'` |
| `template_id` | VARCHAR(64) | NOT NULL | Reference to template ID |
| `template_name` | VARCHAR(255) | NULL | Denormalized template name for fast table views |
| `audience_type` | VARCHAR(64) | `'all_opted_in'` | `'all_opted_in'`, `'segment'`, `'manual_selection'`, `'csv_upload'` |
| `segment_id` | VARCHAR(64) | NULL | Segment ID when `audience_type = 'segment'` |
| `variables` | JSONB | `'{}'` | Key-value pairs for template tags (e.g. `discount`, `product_link`, `coupon_code`) |
| `media` | JSONB | NULL | `{ "type": "image", "url": "https://...", "caption": "..." }` |
| `tracking` | JSONB | NULL | UTM tags: `{ "utm_source": "whatsapp", "utm_medium": "campaign", ... }` |
| `schedule` | JSONB | `'{"type":"immediate"}'` | Execution schedule: `immediate` or `{ "type": "scheduled", "scheduledAt": "..." }` |
| `throttling` | JSONB | `'{"batchSize":10,"delaySeconds":2}'` | Batch pacing rules |
| `total_audience` | INT | `0` | Total recipient count |
| `queued_count` | INT | `0` | Count of jobs in `pending` status |
| `sent_count` | INT | `0` | Count of jobs successfully delivered |
| `delivered_count`| INT | `0` | Confirmed WhatsApp deliveries |
| `read_count` | INT | `0` | Confirmed WhatsApp read receipts (blue ticks) |
| `failed_count` | INT | `0` | Failed dispatches |
| `opted_out_count`| INT | `0` | Contacts suppressed due to opt-out |
| `created_at` | TIMESTAMPTZ | `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | `NOW()` | Last update timestamp |
| `started_at` | TIMESTAMPTZ | NULL | Timestamp when campaign transitioned to Running |
| `completed_at` | TIMESTAMPTZ | NULL | Timestamp when all jobs completed |

#### 2. `whatsapp_campaign.campaign_jobs`
The core message queue. When a campaign is created in the Next.js UI, rows are automatically generated in this table for every eligible customer.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | Primary Key | Auto-incrementing job identifier |
| `campaign_id` | VARCHAR(64) | REFERENCES campaigns(id) | Foreign key to campaign |
| `customer_id` | VARCHAR(64) | REFERENCES customers(id) | Foreign key to customer |
| `customer_name`| VARCHAR(255) | NOT NULL | Customer's full name |
| `phone` | VARCHAR(32) | NOT NULL | E.164 normalized phone number (e.g. `+919876543210`) |
| `message` | TEXT | NULL | Fully interpolated message body |
| `media_url` | TEXT | NULL | Public URL of promotional image/video |
| `media_type` | VARCHAR(32) | `'none'` | `'image'`, `'video'`, `'document'`, `'none'` |
| `status` | VARCHAR(32) | `'pending'` | State machine: `'pending'`, `'processing'`, `'sent'`, `'delivered'`, `'failed'`, `'cancelled'`, `'opted_out'` |
| `retry_count` | INT | `0` | Number of dispatch attempts made |
| `max_retries` | INT | `3` | Maximum allowed dispatch retry attempts |
| `evolution_message_id` | VARCHAR(128) | NULL | Message ID returned by Evolution API (e.g. `3EB0351F0966A53DB658F0`) |
| `error_message`| TEXT | NULL | Reason for failure if dispatch errored |
| `idempotency_key` | VARCHAR(255) | **UNIQUE NOT NULL** | **Deterministic idempotency key: `${campaign_id}_${customer_id}_${template_id}`** |
| `dispatched_at`| TIMESTAMPTZ | NULL | Exact time message was sent |
| `created_at` | TIMESTAMPTZ | `NOW()` | Job creation timestamp |
| `updated_at` | TIMESTAMPTZ | `NOW()` | Timestamp of last status change |

#### 3. `whatsapp_campaign.customers`
Customer contact database and compliance suppression list.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | Primary Key | Customer ID (e.g. `cust_001`) |
| `name` | VARCHAR(255) | NOT NULL | Customer name |
| `phone` | VARCHAR(32) | **UNIQUE NOT NULL** | E.164 phone number |
| `email` | VARCHAR(255) | NULL | Customer email |
| `country_code` | VARCHAR(8) | `'91'` | Country dialing code |
| `tags` | TEXT[] | `ARRAY[]` | Categorization tags (`['VIP', 'fashion', 'frequent-buyer']`) |
| `segment` | VARCHAR(128) | NULL | Primary segment assignment |
| `source` | VARCHAR(128) | `'System'` | Origin (`Store Checkout`, `CSV Import Wizard`, etc.) |
| `opted_in` | BOOLEAN | `TRUE` | Consent to receive promotional WhatsApp broadcasts |
| `opted_out` | BOOLEAN | `FALSE` | **Permanent suppression flag.** If TRUE, all sends are blocked |
| `opted_out_at` | TIMESTAMPTZ | NULL | Time opt-out occurred |
| `opt_out_reason`| TEXT | NULL | Reason (`User replied STOP`, `Admin suppression`, etc.) |
| `last_contacted_at` | TIMESTAMPTZ | NULL | Timestamp of last WhatsApp message |
| `last_message_status` | VARCHAR(32) | NULL | `'sent'`, `'delivered'`, `'read'`, `'failed'` |
| `purchase_count`| INT | `0` | Order history count |
| `total_spent` | NUMERIC(12,2)| `0.00` | Lifetime value |

#### 4. `whatsapp_campaign.templates`
WhatsApp message templates with dynamic variable tags and CTA buttons.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | Primary Key | Template ID (e.g. `tpl_festive_sale_01`) |
| `name` | VARCHAR(255) | NOT NULL | Display name |
| `language` | VARCHAR(16) | `'en'` | Language code |
| `category` | VARCHAR(32) | `'MARKETING'` | Meta template category |
| `status` | VARCHAR(32) | `'Approved'` | `'Approved'`, `'Pending'`, `'Draft'` |
| `body_text` | TEXT | NOT NULL | Raw template body containing variables (e.g. `{{customer_name}}`, `{{discount}}`) |
| `variables` | TEXT[] | `ARRAY[]` | Auto-detected variable names |
| `media_type` | VARCHAR(32) | `'none'` | Media header type |
| `media_url` | TEXT | NULL | Promotional image URL |
| `buttons` | JSONB | `'[]'` | Interactive CTA buttons (`visit_website`, `copy_coupon`, etc.) |

#### 5. `whatsapp_campaign.segments`
Reusable audience segment rules.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | Primary Key | Segment ID (e.g. `seg_vip`) |
| `name` | VARCHAR(255) | NOT NULL | Segment title |
| `description` | TEXT | NULL | Explanatory description |
| `filter` | JSONB | `'{}'` | JSON filter rules (e.g. `{"optedIn": true, "tags": ["sarees"], "minSpent": 15000}`) |
| `customer_count` | INT | `0` | Number of matching audience members |

---

## 4. Idempotency & Anti-Spam Queue Engine

### Why Idempotency is Critical in WhatsApp Marketing
Unlike email, sending duplicate WhatsApp messages causes immediate customer friction, opt-out requests, spam reports, and can lead to immediate WhatsApp Business Account (WABA) restrictions or permanent instance bans.

### The 4-Layer Idempotency & Anti-Spam Architecture

```
Layer 1: Deterministic Idempotency Key
  idempotency_key = `${campaign_id}_${customer_id}_${template_id}`
  UNIQUE constraint in PostgreSQL ensures zero duplicate rows.

Layer 2: Atomic State Transition Lock
  UPDATE whatsapp_campaign.campaign_jobs
  SET status = 'processing', updated_at = NOW()
  WHERE id = $job_id
  Ensures parallel cron passes never pick up the same message.

Layer 3: Rate Limiting & Anti-Spam Pacing
  Batch Limit: Max 10 messages fetched per 1-minute cron cycle.
  Inter-message Sleep: 2-second delay via n8n Wait Node.
  Delivery Speed: Maximum 30 messages/minute.

Layer 4: Suppression Blocklist Enforcement
  SELECT * FROM whatsapp_campaign.customers
  WHERE opted_in = TRUE AND opted_out = FALSE;
  Opted-out customers are suppressed before job creation AND re-checked before dispatch.
```

### State Machine for `campaign_jobs.status`

```
  ┌─────────┐
  │ pending │ ◄── [Job created by Next.js API]
  └────┬────┘
       │
       ▼ (n8n fetches job & locks)
┌────────────┐
│ processing │
└──────┬─────┘
       │
       ├─────────────────────────────────┐
       │ (Evolution API Success)         │ (Evolution API Error)
       ▼                                 ▼
   ┌──────┐                        ┌───────────┐
   │ sent │                        │ retry < 3 │ ──► Reset to 'pending'
   └──────┘                        └─────┬─────┘
                                         │ (retry >= 3)
                                         ▼
                                    ┌────────┐
                                    │ failed │
                                    └────────┘
```

---

## 5. n8n Orchestration Workflow ("Promotional WhatsApp Messages Campaign")

The n8n workflow operates as the autonomous execution engine.

- **Workflow Name**: `Promotional WhatsApp Messages Campaign`
- **Workflow ID**: `promotional_whatsapp_campaign`
- **Active Status**: `true`

### Workflow Node-by-Node Pipeline

```
[Schedule: Every 1m] ──┐
[Manual Trigger]     ──┼─► [01: Fetch Pending Jobs from PostgreSQL]
[Webhook: /start]    ──┘       │
                               ▼
                    [02: Has Pending Jobs? (If Node)]
                               │
                        False  ├─► Exit cleanly in <50ms
                               │
                        True   ▼
                    [03: Idempotency Lock (Mark 'processing')]
                               │
                               ▼
                    [04: Loop Over Jobs (Split in Batches: 1)] ◄─────┐
                               │                                     │
                               ▼                                     │
                    [05: Anti-Spam Rate Limit Wait (2s)]             │
                               │                                     │
                               ▼                                     │
                    [06: Send Message via Evolution API]             │
                               │                                     │
                               ▼                                     │
                    [07: Check Delivery Status (If Node)]            │
                               │                                     │
                        Success├─────────────► [08a: Mark 'sent' in Postgres]
                               │                        │
                        Error  └─────────────► [08b: Record Failure / Retry]
                                                        │
                                                        ▼
                                              [09: Sync & Next Job] ─┘
                                                        │
                                                        ▼ (Batch Done)
                                    [10: Recalculate Campaign Flags & Stats]
                                                        │
                                                        ▼
                                            [11: Respond to Webhook]
```

### Detailed Node Specifications

#### 1. Triggers
- **`Schedule Trigger (Every 1 Min)`**: Runs automatically every 60 seconds.
- **`Manual Trigger`**: Allows testing manually from the n8n UI canvas.
- **`Webhook - Start Campaign`**: HTTP POST endpoint on `https://n8n-ktxhkuiuzp3gnwgrggc15ekz.navin.lol/webhook/whatsapp-campaign/start`. Invoked immediately when a user creates or starts a campaign in Next.js.

#### 2. `01 - Fetch Pending Jobs from PostgreSQL`
- **Node Type**: `n8n-nodes-base.postgres`
- **Credential**: `pgWhatsAppCampaign01` (Internal host: `8zr2cd3qrthqd9tpddk4z6bf:5432`)
- **Query**:
  ```sql
  SELECT 
    j.id AS job_id,
    j.campaign_id,
    j.customer_id,
    j.customer_name,
    j.phone,
    j.message,
    j.media_url,
    j.media_type,
    j.idempotency_key,
    j.retry_count,
    c.name AS campaign_name,
    c.throttling
  FROM whatsapp_campaign.campaign_jobs j
  JOIN whatsapp_campaign.campaigns c ON j.campaign_id = c.id
  WHERE j.status = 'pending' 
    AND c.status IN ('Scheduled', 'Running')
  ORDER BY j.id ASC
  LIMIT 10;
  ```

#### 3. `02 - Has Pending Jobs?`
- **Node Type**: `n8n-nodes-base.if`
- **Condition**: `{{ Boolean($json.job_id) }} === true`
- If false, the workflow terminates immediately, consuming virtually zero CPU/memory during idle periods.

#### 4. `03 - Idempotency Lock (Mark Processing)`
- **Node Type**: `n8n-nodes-base.postgres`
- **Query**:
  ```sql
  UPDATE whatsapp_campaign.campaign_jobs
  SET status = 'processing', updated_at = NOW()
  WHERE id = {{ $json.job_id }}
  RETURNING id AS job_id, campaign_id, customer_id, customer_name, phone, message, media_url, media_type, retry_count;
  ```

#### 5. `05 - Anti-Spam Rate Limit Wait`
- **Node Type**: `n8n-nodes-base.wait`
- **Delay**: `2 seconds`
- Provides natural cadence between messages to satisfy carrier anti-spam algorithms.

#### 6. `06 - Send WhatsApp via Evolution API`
- **Node Type**: `n8n-nodes-base.httpRequest`
- **URL**: `=https://evo-sgwly6o49pvn1dvcdxwemtrc.navin.lol/message/{{ $json.media_url ? 'sendMedia' : 'sendText' }}/Naveen kumar kambham`
- **Authentication**: `genericCredentialType` with Evolution API Key credential `G0uAVpbhb8ySGCgw`.
- **Payload (Text)**:
  ```json
  {
    "number": "{{ $json.phone }}",
    "text": "{{ $json.message }}"
  }
  ```
- **Payload (Media)**:
  ```json
  {
    "number": "{{ $json.phone }}",
    "media": "{{ $json.media_url }}",
    "mediatype": "{{ $json.media_type || 'image' }}",
    "caption": "{{ $json.message }}"
  }
  ```

#### 7. `08a - Mark Sent in Postgres`
- **Node Type**: `n8n-nodes-base.postgres`
- **Query**:
  ```sql
  UPDATE whatsapp_campaign.campaign_jobs 
  SET 
    status = 'sent', 
    evolution_message_id = '{{ $json.key?.id || $json.messageId || $json.id || 'EVO_' + Date.now() }}', 
    dispatched_at = NOW(), 
    updated_at = NOW() 
  WHERE id = {{ $('04 - Loop Over Jobs').first().json.job_id }};

  UPDATE whatsapp_campaign.customers 
  SET 
    last_contacted_at = NOW(), 
    last_message_status = 'delivered', 
    updated_at = NOW() 
  WHERE id = '{{ $('04 - Loop Over Jobs').first().json.customer_id }}';
  ```

#### 8. `08b - Record Failure in Postgres`
- **Node Type**: `n8n-nodes-base.postgres`
- **Query**:
  ```sql
  UPDATE whatsapp_campaign.campaign_jobs 
  SET 
    retry_count = retry_count + 1, 
    status = CASE WHEN retry_count + 1 >= 3 THEN 'failed' ELSE 'pending' END, 
    error_message = '{{ ($json.response?.data?.message || $json.message || $json.error || 'Evolution API delivery failed').toString().replace(/'/g, "") }}', 
    updated_at = NOW() 
  WHERE id = {{ $('04 - Loop Over Jobs').first().json.job_id }};
  ```

#### 9. `10 - Recalculate Campaign Flags & Stats`
- **Node Type**: `n8n-nodes-base.postgres`
- **Operation**: Runs after the batch of 10 messages finishes.
- **Query**:
  ```sql
  UPDATE whatsapp_campaign.campaigns c 
  SET 
    sent_count = (SELECT count(*) FROM whatsapp_campaign.campaign_jobs WHERE campaign_id = c.id AND status = 'sent'), 
    delivered_count = (SELECT count(*) FROM whatsapp_campaign.campaign_jobs WHERE campaign_id = c.id AND status = 'delivered'), 
    failed_count = (SELECT count(*) FROM whatsapp_campaign.campaign_jobs WHERE campaign_id = c.id AND status = 'failed'), 
    queued_count = (SELECT count(*) FROM whatsapp_campaign.campaign_jobs WHERE campaign_id = c.id AND status = 'pending'), 
    status = CASE 
      WHEN (SELECT count(*) FROM whatsapp_campaign.campaign_jobs WHERE campaign_id = c.id AND status IN ('pending', 'processing')) = 0 
      THEN 'Completed' 
      ELSE 'Running' 
    END, 
    completed_at = CASE 
      WHEN (SELECT count(*) FROM whatsapp_campaign.campaign_jobs WHERE campaign_id = c.id AND status IN ('pending', 'processing')) = 0 
      THEN NOW() 
      ELSE c.completed_at 
    END, 
    updated_at = NOW() 
  WHERE c.status IN ('Scheduled', 'Running') 
  RETURNING id, name, status, sent_count, delivered_count, queued_count, failed_count;
  ```

---

## 6. Next.js 16 Application Architecture

### Folder Structure Overview

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx      # Main dashboard with live metrics & recent table
│   │   ├── campaigns/
│   │   │   ├── page.tsx            # Campaigns list with status tabs & filters
│   │   │   ├── create/page.tsx     # 7-step campaign creation wizard
│   │   │   └── [id]/page.tsx       # Campaign details, telemetry & dispatch logs
│   │   ├── customers/
│   │   │   ├── page.tsx            # Customer management table & bulk actions
│   │   │   └── import/page.tsx     # 6-step CSV import wizard
│   │   ├── segments/page.tsx       # Audience segments editor
│   │   ├── templates/page.tsx      # Template manager with WhatsApp preview simulator
│   │   ├── analytics/page.tsx      # Engagement funnel & performance telemetry
│   │   └── settings/page.tsx       # System health & n8n webhook diagnostics
│   ├── api/                        # Strongly-typed Next.js API Routes (Server-side)
│   ├── layout.tsx                  # Root layout with QueryClientProvider & theme
│   └── globals.css                 # Tailwind v4 styles & theme variables
├── components/
│   ├── dashboard/                  # Dashboard metrics cards & tables
│   ├── layout/                     # Sidebar navigation, header, theme toggle
│   ├── ui/                         # Accessible shadcn-style component primitives
│   └── whatsapp/                   # Mobile simulator preview frames (iPhone frame)
├── config/
│   └── env.ts                      # Zod-validated environment configuration
├── hooks/
│   └── use-dashboard-data.ts       # TanStack React Query hooks for all entities
├── lib/
│   ├── db/
│   │   └── index.ts                # PostgreSQL connection pool & repository layer
│   ├── validation/
│   │   └── index.ts                # Zod schemas, phone normalization, UTM builder
│   ├── api/
│   │   └── n8n-client.ts           # Resilient server-to-n8n HTTP client
│   └── utils.ts                    # Class merging, date formatters, currency helpers
└── types/
    └── index.ts                    # TypeScript domain interfaces
```

---

## 7. Comprehensive REST API Reference

All requests and responses use standard JSON with standard envelope `{ success: boolean, data?: T, error?: { code: string, message: string } }`.

### Campaigns API

#### 1. `GET /api/campaigns`
Returns all campaigns from `whatsapp_campaign.campaigns` ordered by `created_at DESC`.

#### 2. `POST /api/campaigns`
Creates a campaign, parses target audience from `whatsapp_campaign.customers`, replaces template variables, generates granular rows in `whatsapp_campaign.campaign_jobs` with unique `idempotency_key`, and triggers n8n start webhook.
- **Request Payload**:
  ```json
  {
    "name": "Diwali Mega Sale 2026",
    "description": "Festive catalog blast",
    "templateId": "tpl_festive_sale_01",
    "audience": {
      "type": "segment",
      "segmentId": "seg_vip"
    },
    "variables": {
      "discount": "25%",
      "coupon_code": "DIWALI25",
      "product_link": "https://example.com/diwali"
    },
    "media": {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800",
      "caption": "Festive Collection"
    },
    "tracking": {
      "utm_source": "whatsapp",
      "utm_medium": "campaign",
      "utm_campaign": "diwali-mega-sale"
    },
    "schedule": {
      "type": "immediate"
    },
    "throttling": {
      "batchSize": 10,
      "delaySeconds": 2,
      "maxPerMinute": 30
    }
  }
  ```

#### 3. `GET /api/campaigns/:id`
Fetches a single campaign by ID.

#### 4. `PUT /api/campaigns/:id`
Updates campaign details, description, variables, or throttling.

#### 5. `DELETE /api/campaigns/:id`
Deletes the campaign and cascades deletion of its queued jobs in `whatsapp_campaign.campaign_jobs`.

#### 6. `POST /api/campaigns/:id/start`
Starts a draft/scheduled campaign, transitions status to `Running`, and dispatches start command to n8n webhook.

#### 7. `POST /api/campaigns/:id/stop`
**Emergency Kill Switch**: Immediately transitions campaign status to `Cancelled`, cancels all pending jobs in PostgreSQL (`status = 'cancelled'`), and notifies n8n to halt execution.

#### 8. `GET /api/campaigns/:id/status`
Returns live delivery counters (`totalAudience`, `queued`, `sent`, `delivered`, `read`, `failed`).

#### 9. `GET /api/campaigns/:id/logs`
Returns real-time individual customer dispatch logs from `whatsapp_campaign.campaign_jobs` with status, timestamp, and Evolution message IDs. Supports `?status=sent` filter.

---

### Customers API

#### 1. `GET /api/customers`
Search and filter contacts.
- Query Parameters:
  - `search`: Filter by name, phone, email, or tag (case-insensitive ILIKE).
  - `segment`: Filter by segment name.
  - `optedIn`: `"true"` or `"false"`.
  - `optedOut`: `"true"` or `"false"`.
  - `tag`: Filter by tag array membership.

#### 2. `POST /api/customers`
Creates a customer. Normalizes the phone number to international E.164.

#### 3. `PUT /api/customers/:id`
Updates customer profile, tags, or opt-out status.

#### 4. `DELETE /api/customers/:id`
Removes customer record.

#### 5. `POST /api/customers/import`
High-speed batch CSV import wizard endpoint. Validates phones, checks suppression lists, and persists to PostgreSQL.

#### 6. `GET /api/customers/export`
Generates and streams a downloadable UTF-8 CSV containing all contacts.

#### 7. `POST /api/customers/bulk-tag`
Appends a tag to multiple selected customers.

#### 8. `POST /api/customers/bulk-opt-out`
Suppresses multiple selected customers to the permanent opt-out blocklist.

---

### Templates & Segments API

- `GET /api/templates`: Lists all templates.
- `POST /api/templates`: Saves new template; automatically detects variables enclosed in `{{...}}`.
- `GET /api/templates/:id`: Template details.
- `PUT /api/templates/:id`: Update template body text or buttons.
- `DELETE /api/templates/:id`: Delete template.
- `GET /api/segments`: Lists all segments with criteria and member counts.
- `POST /api/segments`: Creates an audience segment.
- `PUT /api/segments/:id`: Updates segment filter definition.
- `DELETE /api/segments/:id`: Removes segment.

---

### Stats & Diagnostics API

- `GET /api/stats`: Returns calculated telemetry from database tables (total customers, opted-in customers, messages sent, delivery rate, read rate, failure rate, opt-out rate).
- `GET /api/health`: Health check endpoint returning database connectivity status and application uptime.
- `POST /api/n8n/test-connection`: Verifies active webhook reachability to the remote n8n server.

---

## 8. Audience Targeting & 6-Step CSV Import Wizard

The platform features a 6-step CSV import wizard ([`src/app/(dashboard)/customers/import/page.tsx`](file:///home/naveen/whatsapp-campaign-manager/src/app/%28dashboard%29/customers/import/page.tsx)):

1. **Upload**: Drag-and-drop or select `.csv` file.
2. **Map Columns**: Matches user CSV columns (`name`, `phone`, `email`, `tags`, `opted_in`, `segment`) using fuzzy name heuristics.
3. **Validate**:
   - Validates required fields (`name` and `phone`).
   - Normalizes phone numbers with international dialing rules (supports non-Indian numbers like `+44`, `+1`, etc. via [`normalizePhoneNumber()`](file:///home/naveen/whatsapp-campaign-manager/src/lib/validation/index.ts)).
   - Flags invalid formats and duplicates.
4. **Suppression Blocklist Filter**:
   - Explicitly rejects rows where `optedIn === false` or `optedOut === true` from being imported.
5. **Preview**: Displays clean summary (Total Rows, Valid Rows, Invalid Rows, Duplicates, Blocklist Exclusions). Provides a button to download invalid rows for audit.
6. **Import & Results**: Persists valid records to `whatsapp_campaign.customers` and forwards the batch to n8n import webhook.

---

## 9. Template Management & WhatsApp Simulator

The template manager ([`src/app/(dashboard)/templates/page.tsx`](file:///home/naveen/whatsapp-campaign-manager/src/app/%28dashboard%29/templates/page.tsx)) includes an interactive mobile simulator ([`src/components/whatsapp/whatsapp-preview.tsx`](file:///home/naveen/whatsapp-campaign-manager/src/components/whatsapp/whatsapp-preview.tsx)):

- **Variable Detection**: Detects mustache variables (`{{customer_name}}`, `{{discount}}`, `{{product_link}}`) automatically as the marketer types.
- **Dynamic Preview**: Real-time rendering inside an iPhone device frame showing:
  - Business profile header and verified green badge.
  - Image header banner.
  - Live interpolated message text with emoji support.
  - Interactive CTA buttons ("Shop Now", "Copy Coupon", etc.).
  - Realistic timestamp and double blue ticks (read receipt).

---

## 10. Local Development & Testing Runbook

### Prerequisites
- **Node.js**: v20+ or v22+
- **npm**: v10+

### Environment Setup
Create `.env.local` based on `.env.example`:

```env
# Application
NEXT_PUBLIC_APP_NAME="WhatsApp Campaign Manager"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# PostgreSQL Database (Public URL for local dev)
DATABASE_URL="postgres://postgres:8r7OI5gyHV7RSXNTYOl5MUCrDfcCOOrdD92Ytz6IXDrHRCOgzYXwv24H2qGsOUix@100.121.9.105:6574/postgres?sslmode=require"

# n8n Orchestrator (Server-side ONLY)
N8N_BASE_URL="https://n8n-ktxhkuiuzp3gnwgrggc15ekz.navin.lol"
N8N_API_KEY=""
N8N_WEBHOOK_SECRET=""

# n8n Webhook Paths
N8N_CONTACTS_WEBHOOK="/webhook/whatsapp-campaign/contacts"
N8N_TEMPLATES_WEBHOOK="/webhook/whatsapp-campaign/templates"
N8N_CAMPAIGNS_WEBHOOK="/webhook/whatsapp-campaign/campaigns"
N8N_CAMPAIGN_START_WEBHOOK="/webhook/whatsapp-campaign/start"
N8N_CAMPAIGN_STOP_WEBHOOK="/webhook/whatsapp-campaign/stop"
N8N_CAMPAIGN_STATUS_WEBHOOK="/webhook/whatsapp-campaign/status"
N8N_CAMPAIGN_LOGS_WEBHOOK="/webhook/whatsapp-campaign/logs"
N8N_CUSTOMER_IMPORT_WEBHOOK="/webhook/whatsapp-campaign/import"
N8N_MEDIA_UPLOAD_WEBHOOK="/webhook/whatsapp-campaign/media"
N8N_TEMPLATE_PREVIEW_WEBHOOK="/webhook/whatsapp-campaign/preview"
```

### Essential Developer Commands

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests with Vitest
npm test

# 3. Check linting rules
npm run lint

# 4. Build optimized production bundle
npm run build

# 5. Start development server (Port 3000)
npm run dev
```

---

## 11. Production Deployment & Infrastructure

### Coolify / Docker Infrastructure Details
- **Server IP**: `100.121.9.105`
- **SSH User**: `naveen`
- **PostgreSQL Database Container**: `8zr2cd3qrthqd9tpddk4z6bf` (Exposed publicly on port `6574`, internal Docker network port `5432`).
- **n8n Container**: `n8n-ktxhkuiuzp3gnwgrggc15ekz` (External domain: `https://n8n-ktxhkuiuzp3gnwgrggc15ekz.navin.lol`).
- **n8n Worker Container**: `n8n-worker-ktxhkuiuzp3gnwgrggc15ekz` (Execution mode: `queue` with Redis).
- **Evolution API Container**: `api-sgwly6o49pvn1dvcdxwemtrc` (External domain: `https://evo-sgwly6o49pvn1dvcdxwemtrc.navin.lol`).

### Docker Container Networking Note
The n8n container and the PostgreSQL container share the internal Docker network `ktxhkuiuzp3gnwgrggc15ekz`. Inside n8n nodes, the PostgreSQL host is reached directly at `8zr2cd3qrthqd9tpddk4z6bf:5432` without going through the public internet, ensuring zero latency and maximum security.

---

## 12. Troubleshooting & FAQ

### Q1: What happens if a campaign needs to be stopped immediately?
**A:** Click the **Stop Campaign** button on the campaign detail page or dashboard. This triggers `POST /api/campaigns/:id/stop`, which:
1. Immediately updates the campaign status in PostgreSQL to `'Cancelled'`.
2. Cancels all pending recipient jobs (`UPDATE campaign_jobs SET status = 'cancelled' WHERE status = 'pending'`).
3. Sends an emergency kill-switch payload to n8n's `/webhook/whatsapp-campaign/stop` to interrupt running loops.

### Q2: Why did a message fail with "Evolution API delivery failed"?
**A:** Check `campaign_jobs.error_message`. Common reasons:
- Customer phone number is not registered on WhatsApp.
- International dialing prefix was missing or invalid.
- WhatsApp instance on Evolution API needs re-authentication via QR code.
- Customer previously blocked the business phone number.
Jobs with transient errors will automatically retry up to 3 times across subsequent 1-minute cron passes before being marked as `'failed'`.

### Q3: How do we verify that cron jobs are executing?
**A:** Query n8n's execution logs:
```bash
docker exec postgresql-ktxhkuiuzp3gnwgrggc15ekz psql -U UZ2Dd4tp4eVRsS22 -d n8n \
  -c "SELECT id, \"workflowId\", status, \"startedAt\" FROM execution_entity WHERE \"workflowId\" = 'promotional_whatsapp_campaign' ORDER BY id DESC LIMIT 5;"
```
You will see automatic executions logged every 60 seconds.

---

*Authored for engineering teams maintaining the WhatsApp Promotional Campaign Platform.*
