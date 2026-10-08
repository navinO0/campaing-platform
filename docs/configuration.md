# Environment and Operational Configuration

This guide provides an overview of all configuration variables for the **WhatsApp Campaign Manager**.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | No | `"WhatsApp Campaign Manager"` | Visible brand title |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public application URL |
| `NODE_ENV` | Yes | `production` | Environment tier |
| `N8N_BASE_URL` | Yes | `https://n8n...` | Base URL of n8n server |
| `N8N_API_KEY` | No | `""` | Bearer token for n8n API |
| `N8N_WEBHOOK_SECRET` | No | `""` | Secret used for HMAC-SHA256 signature header |
| `N8N_REQUEST_TIMEOUT_MS` | No | `15000` | Max milliseconds before webhook timeout |
| `N8N_MAX_RETRIES` | No | `2` | Idempotent request retry count |
| `CAMPAIGN_STATUS_POLL_INTERVAL_MS`| No | `5000` | Status polling interval for running campaigns |

---

## Security Best Practices

1. **Server-Side Exclusivity:**
   - Under no circumstances should `N8N_BASE_URL`, `N8N_API_KEY`, or `N8N_WEBHOOK_SECRET` be prefixed with `NEXT_PUBLIC_`.
   - All browser requests pass through Next.js App Router API proxy handlers (`/api/*`), maintaining full credential secrecy.
2. **Phone Number Masking:**
   - Structured server logs automatically redact customer contact numbers (e.g. `******3210`).
3. **Throttling & Kill Switch:**
   - Batching and waiting delays are configured by the admin frontend and enforced in n8n execution loops to prevent WhatsApp spam bans.
