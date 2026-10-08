# Comprehensive Architecture & Feature Documentation

This document provides an exhaustive, in-depth explanation of every architectural component, design decision, security boundary, and feature in the **WhatsApp Promotional Campaign Manager**. It is designed as a master reference for engineering, operations, and product teams.

---

## Table of Contents
1. [Core Architecture & Boundaries](#1-core-architecture--boundaries)
2. [Security Architecture & Zero-Trust Client Model](#2-security-architecture--zero-trust-client-model)
3. [Environment Configuration & Startup Validation](#3-environment-configuration--startup-validation)
4. [Deep Dive into Every Application Feature](#4-deep-dive-into-every-application-feature)
   - [4.1 Main Dashboard & Analytics Cards](#41-main-dashboard--analytics-cards)
   - [4.2 Multi-Step Campaign Wizard (7 Steps)](#42-multi-step-campaign-wizard-7-steps)
   - [4.3 Real-Time Campaign Execution & Telemetry](#43-real-time-campaign-execution--telemetry)
   - [4.4 Emergency Kill Switch Architecture](#44-emergency-kill-switch-architecture)
   - [4.5 Anti-Ban Rate Limiting & Throttling](#45-anti-ban-rate-limiting--throttling)
   - [4.6 Compliance, Opt-In / Opt-Out & Suppression List](#46-compliance-opt-in--opt-out--suppression-list)
   - [4.7 6-Step CSV Import Wizard](#47-6-step-csv-import-wizard)
   - [4.8 WhatsApp Template Manager & Variable Parser](#48-whatsapp-template-manager--variable-parser)
   - [4.9 Realistic WhatsApp Simulation Frame](#49-realistic-whatsapp-simulation-frame)
   - [4.10 Call-To-Action (CTA) & Promotional Link Builder](#410-call-to-action-cta--promotional-link-builder)
   - [4.11 Customer Directory & Dynamic Segments](#411-customer-directory--dynamic-segments)
   - [4.12 Campaign Delivery Logs & CSV Audit Export](#412-campaign-delivery-logs--csv-audit-export)
   - [4.13 Campaign Analytics & Attribution Modeling](#413-campaign-analytics--attribution-modeling)
   - [4.14 Integrations & n8n Live Connection Tester](#414-integrations--n8n-live-connection-tester)
5. [Server-Side API Proxy & n8n Webhook Client](#5-server-side-api-proxy--n8n-webhook-client)
6. [Testing Strategy (Unit, Integration & E2E)](#6-testing-strategy-unit-integration--e2e)
7. [Production Deployment (Docker, Docker Compose, Standalone)](#7-production-deployment-docker-docker-compose-standalone)
8. [Troubleshooting & Runbook](#8-troubleshooting--runbook)

---

## 1. Core Architecture & Boundaries

### Separation of Responsibilities
To achieve high reliability and protect WhatsApp phone numbers from ban risk, the architecture enforces a strict division of labor:

```text
┌─────────────────────────────────┐
│     Next.js 16 Dashboard        │
│  - User Interface & Forms       │
│  - Zod Validation               │
│  - Live WhatsApp Preview        │
│  - Campaign Configuration       │
│  - Server API Proxy & Auth      │
└────────────────┬────────────────┘
                 │ Secure HTTPS Webhooks
                 │ (HMAC + Bearer Token)
                 ▼
┌─────────────────────────────────┐
│      n8n Orchestration Server   │
│  - Split-In-Batches Queue       │
│  - Rate Limiting & Wait Delays  │
│  - Deduplication & Idempotency  │
│  - Emergency Stop Interrupter   │
│  - Status & Reply Webhooks      │
│  - Opt-Out Keyword Processing   │
└────────────────┬────────────────┘
                 │ Isolated Network / Internal API
                 ▼
┌─────────────────────────────────┐
│        Evolution API            │
│  - WhatsApp Multi-Device Socket │
│  - Baileys Protocol Transport   │
│  - Message Delivery & Retries   │
└─────────────────────────────────┘
```

- **Next.js NEVER contacts Evolution API directly:** Evolution API instance tokens and URLs are never compiled into client-side JavaScript.
- **Next.js NEVER runs bulk dispatch loops:** If an admin schedules 10,000 customers, Next.js does not run a loop that might crash the Node.js server. Next.js dispatches a single structured payload to n8n, which runs durable background batch executions.

---

## 2. Security Architecture & Zero-Trust Client Model

### 1. Server-Side Environment Protection
All sensitive connection keys (`N8N_BASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_SECRET`) omit the `NEXT_PUBLIC_` prefix. Next.js ensures that variables without this prefix are removed from the browser JavaScript bundle.

### 2. Request Signing (HMAC-SHA256)
Every outgoing request from Next.js to n8n is signed with an HMAC-SHA256 signature in the `X-Webhook-Signature` header computed from the JSON body. n8n workflows can verify this signature to reject unauthorized requests.

### 3. Request Tracing (`X-Request-ID`)
Every request generates a cryptographically unique request identifier (e.g. `req_a7d8c2...`). This identifier is propagated across headers, API responses, and server logs.

### 4. Structured Server Logs with Redaction
Server logs format audit events in structured JSON format. Customer phone numbers are masked automatically (e.g., `+919876543210` becomes `********3210`) to comply with data privacy standards (GDPR, DPDP).

---

## 3. Environment Configuration & Startup Validation

The application validates its environment variables using Zod in [`src/config/env.ts`](file:///home/naveen/whatsapp-campaign-manager/src/config/env.ts):

```typescript
const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("WhatsApp Campaign Manager"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  N8N_BASE_URL: z.string().url(),
  N8N_API_KEY: z.string().optional().default(""),
  N8N_WEBHOOK_SECRET: z.string().optional().default(""),
  // Webhook paths...
  N8N_REQUEST_TIMEOUT_MS: z.coerce.number().default(15000),
  N8N_MAX_RETRIES: z.coerce.number().default(2),
  CAMPAIGN_STATUS_POLL_INTERVAL_MS: z.coerce.number().default(5000),
});
```

If any mandatory variable is missing or malformed, the application reports the schema error at startup rather than encountering runtime errors.

---

## 4. Deep Dive into Every Application Feature

### 4.1 Main Dashboard & Analytics Cards
- **Location:** [`src/app/(dashboard)/dashboard/page.tsx`](file:///home/naveen/whatsapp-campaign-manager/src/app/(dashboard)/dashboard/page.tsx)
- **Component:** [`DashboardMetrics`](file:///home/naveen/whatsapp-campaign-manager/src/components/dashboard/dashboard-metrics.tsx)
- **Features:**
  - 8 real-time metric cards: **Total Customers**, **Opted-in Customers**, **Messages Sent**, **Delivered**, **Read**, **Failed**, **Opted Out**, and **Campaigns Sent**.
  - Rate calculations for delivery rate, read rate, failure rate, and opt-out rate.
  - Recent campaigns table with live execution badges and instant kill switch triggers.

### 4.2 Multi-Step Campaign Wizard (7 Steps)
- **Location:** [`src/app/(dashboard)/campaigns/create/page.tsx`](file:///home/naveen/whatsapp-campaign-manager/src/app/(dashboard)/campaigns/create/page.tsx)
- **Detailed Step Breakdown:**
  1. **Step 1 — Details:** Captures campaign name and internal description.
  2. **Step 2 — Audience:** Allows targeting All Opted-in Contacts, Saved Segments, CSV Cohorts, or Manual Selection.
  3. **Step 3 — Template:** Displays registered WhatsApp marketing templates with quick selection.
  4. **Step 4 — Variables & Overrides:** Automatically scans the template body for variables like `{{customer_name}}`, `{{discount}}`, and `{{product_link}}`, providing input fields for defaults.
  5. **Step 5 — Preview & Tracking:** Integrates a UTM builder (`utm_source`, `utm_medium`, `utm_campaign`) and generates live tracked URLs.
  6. **Step 6 — Pre-flight Validation:** Verifies audience existence, E.164 phone formats, exclusion of opted-out users, and template variable completeness.
  7. **Step 7 — Throttling & Launch:** Allows setting batch size, delay between batches, and choosing between immediate send or scheduled launch.

### 4.3 Real-Time Campaign Execution & Telemetry
- **Location:** [`src/app/(dashboard)/campaigns/[id]/page.tsx`](file:///home/naveen/whatsapp-campaign-manager/src/app/(dashboard)/campaigns/[id]/page.tsx)
- **Mechanism:**
  - Uses TanStack React Query with configurable polling (`CAMPAIGN_STATUS_POLL_INTERVAL_MS`).
  - Automatically ceases polling when campaign status transitions from `Running` to `Completed`, `Cancelled`, or `Failed`.
  - Visual progress bar displays `sent / totalAudience`.

### 4.4 Emergency Kill Switch Architecture
- **Location:** Integrated in the header of the campaign detail view and dashboard table.
- **Workflow:**
  1. User clicks **"STOP CAMPAIGN"**.
  2. A confirmation modal displays warning notes explaining that already sent messages cannot be unsent.
  3. On confirmation, Next.js calls `POST /api/campaigns/:id/stop`.
  4. The server forwards an emergency payload to `N8N_CAMPAIGN_STOP_WEBHOOK`.
  5. The n8n workflow aborts active loop iterations and marks remaining queue items as cancelled.

### 4.5 Anti-Ban Rate Limiting & Throttling
- WhatsApp actively blocks numbers that transmit bulk messages with zero delays.
- The wizard allows marketing teams to configure:
  - **Batch Size:** e.g., 20 messages per batch.
  - **Batch Delay:** e.g., 5 seconds between batches.
  - **Max Per Minute:** e.g., 60 messages/minute.
- Next.js transmits these parameters to n8n, which enforces the pacing via the `Wait` and `Split in Batches` nodes.

### 4.6 Compliance, Opt-In / Opt-Out & Suppression List
- **Suppression Logic:** Customers with `optedIn: false` or `optedOut: true` are blocked from promotional blast queues.
- Inbound WhatsApp messages with keywords (`STOP`, `UNSUBSCRIBE`, `CANCEL`) trigger n8n to mark the contact as opted-out.
- The customer table displays compliance badges (`Opted In` in green vs `Opted Out` in red).

### 4.7 6-Step CSV Import Wizard
- **Location:** [`src/app/(dashboard)/customers/import/page.tsx`](file:///home/naveen/whatsapp-campaign-manager/src/app/(dashboard)/customers/import/page.tsx)
- **Features:**
  - **Step 1 (Upload):** Parses CSV files directly in the browser using PapaParse.
  - **Step 2 (Map Columns):** Automatically matches columns for `name`, `phone`, `email`, `tags`, and `optedIn`.
  - **Step 3 (Validate):** Normalizes phone numbers to E.164 without assuming India (supports UK, US, etc.), detects duplicates, and excludes opted-out contacts.
  - **Step 4 (Preview):** Displays a sanitized preview table of valid records.
  - **Step 5 (Import):** Sends validated customers to the n8n contact processor webhook.
  - **Step 6 (Result):** Provides an import summary and an option to download invalid rows for audit.

### 4.8 WhatsApp Template Manager & Variable Parser
- **Location:** [`src/app/(dashboard)/templates/page.tsx`](file:///home/naveen/whatsapp-campaign-manager/src/app/(dashboard)/templates/page.tsx)
- **Regex Extraction:** Uses `/\{\{([a-zA-Z0-9_\-]+)\}\}/g` to detect placeholders in real-time as the user types.
- **Provider Sync:** A "Sync Templates" button polls n8n to ingest templates from Meta Cloud API or Evolution API.

### 4.9 Realistic WhatsApp Simulation Frame
- **Location:** [`src/components/whatsapp/whatsapp-preview.tsx`](file:///home/naveen/whatsapp-campaign-manager/src/components/whatsapp/whatsapp-preview.tsx)
- **Visuals:**
  - Interactive switcher between **Mobile View** (iPhone device shell with camera notch) and **Desktop View**.
  - Authentic WhatsApp green topbar (`#008069`), wallpaper pattern, message bubble (`#d9fdd3`), timestamp, and blue checkmarks.
  - Live preview of image banners and interactive CTA buttons.

### 4.10 Call-To-Action (CTA) & Promotional Link Builder
- Supports up to 3 interactive buttons per template:
  - **Visit Website:** Generates URL buttons with click handlers.
  - **Call Phone:** Direct tel prompt.
  - **Copy Coupon:** One-click clipboard copy.

### 4.11 Customer Directory & Dynamic Segments
- **Customers Page:** Fast search, filtering by tags, country codes, and opt-in status.
- **Segments Page:** Define audience filters (e.g. `optedIn: true`, `tags: ["sarees"]`, `minSpent: 10000`) without transferring multi-gigabyte contact lists to the browser.

### 4.12 Campaign Delivery Logs & CSV Audit Export
- Displays real-time message audit logs with customer name, phone number, rendered text, status (`sent`, `delivered`, `read`, `failed`), and timestamp.
- Includes a **"Export CSV"** button for offline compliance reporting.

### 4.13 Campaign Analytics & Attribution Modeling
- Displays real delivery funnels (Audience ➔ Sent ➔ Delivered ➔ Read).
- **Anti-Fabrication:** Click-Through Rate (CTR) and Downstream Conversions clearly state `"Not available"` when tracking webhooks are unlinked, avoiding fabricated data.

### 4.14 Integrations & n8n Live Connection Tester
- **Location:** [`src/app/(dashboard)/settings/page.tsx`](file:///home/naveen/whatsapp-campaign-manager/src/app/(dashboard)/settings/page.tsx)
- Displays current n8n base URL and webhook security headers without exposing API keys.
- **Test Connection:** Dispatches a non-destructive ping webhook to n8n and reports latency and response status.

---

## 5. Server-Side API Proxy & n8n Webhook Client

All communication is handled in [`src/lib/api/n8n-client.ts`](file:///home/naveen/whatsapp-campaign-manager/src/lib/api/n8n-client.ts) using the `forwardToN8n` helper:

```typescript
export async function forwardToN8n<T>(
  webhookPath: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>>
```

Key capabilities:
- **Exponential Backoff:** Retries idempotent requests up to `N8N_MAX_RETRIES` times with exponential delay.
- **Timeout Protection:** AbortController cancels requests exceeding `N8N_REQUEST_TIMEOUT_MS` (default 15s).
- **Error Mapping:** Maps standard HTTP error codes (`400`, `401`, `404`, `502`, `504`) into clear messages while redacting internal stack traces.

---

## 6. Testing Strategy

### Unit Tests (Vitest)
Located at [`test/unit-validation.test.ts`](file:///home/naveen/whatsapp-campaign-manager/test/unit-validation.test.ts):
- Phone normalization (handling Indian and non-Indian formats).
- Regex variable extraction.
- UTM URL generator.
- Log privacy masking.
- HMAC SHA-256 signature generation.

Run unit tests:
```bash
npm test
```

### End-to-End Tests (Playwright)
Located at [`test/e2e/campaign-flow.spec.ts`](file:///home/naveen/whatsapp-campaign-manager/test/e2e/campaign-flow.spec.ts):
- Complete flow testing covering dashboard loading, campaign wizard steps, customer directory, template preview, and integration settings.

Run E2E tests:
```bash
npm run test:e2e
```

---

## 7. Production Deployment

### Docker Multi-Stage Build
The provided [`Dockerfile`](file:///home/naveen/whatsapp-campaign-manager/Dockerfile) builds a lean standalone production image:
- **Stage 1 (deps):** Installs production and dev dependencies.
- **Stage 2 (builder):** Compiles Next.js with standalone output.
- **Stage 3 (runner):** Executes using an unprivileged `nextjs` system user with Alpine Linux.

Deploy via Docker Compose:
```bash
docker compose up -d --build
```

Health check verification:
```bash
curl -f http://localhost:3000/api/health
```

---

## 8. Troubleshooting & Runbook

| Symptom | Cause | Solution |
|---|---|---|
| **n8n Connection Failed (502)** | n8n instance is offline or URL is wrong | Verify `N8N_BASE_URL` in `.env.local` and check that the n8n container is healthy. |
| **Invalid Signature (401)** | Webhook secret mismatch | Ensure `N8N_WEBHOOK_SECRET` matches the signature node in n8n. |
| **Customer Phone Invalid** | Phone does not match E.164 | Normalize phone with international country code prefix (e.g. `+919876543210`). |
| **Messages Not Progressing** | Throttling or rate limit delay active | Check campaign batch delay settings in n8n. |
| **Campaign Won't Stop** | n8n workflow lacks kill switch trigger | Verify that `N8N_CAMPAIGN_STOP_WEBHOOK` is configured in your n8n workflow. |
