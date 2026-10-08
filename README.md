# WhatsApp Promotional Campaign Manager

Production-ready **Next.js 16** promotional campaign management dashboard orchestrated through secure **n8n webhooks** and executed via **Evolution API / WhatsApp Multi-Device**.

---

## 🌟 Key Features

- **Multi-Step Campaign Wizard (7 Steps):**
  1. Campaign Details
  2. Audience Targeting (All Opted-in, Saved Segments, CSV Import, Manual)
  3. WhatsApp Template Selection
  4. Dynamic Variables & Overrides (`{{customer_name}}`, `{{discount}}`, etc.)
  5. Tracking URL Generation with UTM Builder (`utm_source=whatsapp`)
  6. Pre-flight Validation Checklist
  7. Throttling, Anti-Ban Rate Limiting & Scheduling
- **Emergency Kill Switch:**
  - Highly visible `STOP CAMPAIGN` button with confirmation modal.
  - Sends immediate cancellation webhook to n8n to interrupt active loops and drain queues.
- **Strict Opt-Out & Compliance Model:**
  - Suppression lists and permanent opt-out enforcement.
  - Automatic filtering out of customers where `optedIn === false` or `optedOut === true`.
- **6-Step CSV Import Wizard:**
  - Auto column mapping, E.164 international phone number normalization, duplicate detection, and download of invalid rows.
- **Live WhatsApp Simulator:**
  - Real-time mobile (iPhone frame) and desktop previews with variable replacement, media headers, and CTA buttons.
- **Provider Abstraction:**
  - Zero direct Evolution API / Meta Cloud API calls from the browser.
  - Credentials remain strictly encrypted in server-side environment variables.
- **Audit Logging & Security:**
  - Request IDs (`X-Request-ID`), HMAC-SHA256 signature verification (`X-Webhook-Signature`), and phone number redaction in structured server logs.

---

## 🏗️ Architecture

```text
               ┌──────────────────────┐
               │      Admin / UI      │
               └──────────┬───────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │      Next.js 16      │
               │  (Proxy & Dashboard) │
               └──────────┬───────────┘
                          │
              Authenticated Webhooks
              (HMAC + Bearer Secret)
                          │
                          ▼
               ┌──────────────────────┐
               │   n8n Webhook Engine │
               │   (Remote Server)    │
               └──────────┬───────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │    Evolution API     │
               │   (WhatsApp M-D)     │
               └──────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 20+ (tested on Node.js 23)
- npm 10+
- An active n8n instance

### 2. Environment Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
NEXT_PUBLIC_APP_NAME="WhatsApp Campaign Manager"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# n8n Orchestrator (Server-side ONLY)
N8N_BASE_URL="https://n8n-ktxhkuiuzp3gnwgrggc15ekz.navin.lol"
N8N_API_KEY=""
N8N_WEBHOOK_SECRET=""
```

### 3. Local Development
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Running Production Build
```bash
npm run build
npm run start
```

### 5. Running Tests & Quality Checks
```bash
# Run unit tests (Phone normalization, UTM tags, Variable parser, HMAC signatures)
npm run test

# Run code linter
npm run lint

# Run E2E test suite
npm run test:e2e
```

---

## 🐳 Docker Deployment

The application includes standalone Docker multi-stage build support:

```bash
docker compose up -d --build
```

Health check is verified automatically via `/api/health`.

---

## 📚 Documentation
- [n8n Webhook API Contracts](docs/n8n-api-contract.md)
- [Operational & Security Configuration Guide](docs/configuration.md)
