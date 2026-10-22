import { z } from "zod";

const envSchema = z.object({
  // App
  NEXT_PUBLIC_APP_NAME: z.string().default("WhatsApp Campaign Manager"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // n8n connection (Server-side ONLY - loaded dynamically from container environment)
  N8N_BASE_URL: z.string().default(""),
  N8N_API_KEY: z.string().default(""),
  N8N_WEBHOOK_SECRET: z.string().default(""),

  // n8n webhook paths
  N8N_CONTACTS_WEBHOOK: z.string().default("/webhook/whatsapp-campaign/contacts"),
  N8N_TEMPLATES_WEBHOOK: z.string().default("/webhook/whatsapp-campaign/templates"),
  N8N_CAMPAIGNS_WEBHOOK: z.string().default("/webhook/whatsapp-campaign/campaigns"),
  N8N_CAMPAIGN_START_WEBHOOK: z.string().default("/webhook/whatsapp-campaign/start"),
  N8N_CAMPAIGN_STOP_WEBHOOK: z.string().default("/webhook/whatsapp-campaign/stop"),
  N8N_CAMPAIGN_STATUS_WEBHOOK: z.string().default("/webhook/whatsapp-campaign/status"),
  N8N_CAMPAIGN_LOGS_WEBHOOK: z.string().default("/webhook/whatsapp-campaign/logs"),
  N8N_CUSTOMER_IMPORT_WEBHOOK: z.string().default("/webhook/whatsapp-campaign/import"),
  N8N_MEDIA_UPLOAD_WEBHOOK: z.string().default("/webhook/whatsapp-campaign/media"),
  N8N_TEMPLATE_PREVIEW_WEBHOOK: z.string().default("/webhook/whatsapp-campaign/preview"),

  // Resiliency & Timeouts
  N8N_REQUEST_TIMEOUT_MS: z.coerce.number().default(15000),
  N8N_MAX_RETRIES: z.coerce.number().default(2),
  CAMPAIGN_STATUS_POLL_INTERVAL_MS: z.coerce.number().default(5000),

  // Database connection (PostgreSQL for Job Queue and Persistent Storage)
  DATABASE_URL: z.string().default(""),

  // Evolution API Metadata (Orchestrated through n8n - Server-side reference)
  EVOLUTION_API_URL: z.string().default(""),
  EVOLUTION_INSTANCE_NAME: z.string().default(""),
  EVOLUTION_API_KEY: z.string().default(""),

  // Authentication & Security
  AUTH_SECRET: z.string().optional().default(""),

  // WhatsApp Webhook & OTP Security
  WEBHOOK_VERIFY_TOKEN: z.string().default("whatsapp_verify_token_2026"),
  OTP_EXPIRY_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),
  OTP_COOLDOWN_SECONDS: z.coerce.number().default(60),
  OTP_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(900),
  OTP_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(5),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function getValidatedEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables configuration:", result.error.format());
    throw new Error("Invalid environment configuration");
  }
  return result.data;
}

/**
 * Dynamic Proxy that reads environment variables from process.env at runtime.
 * Ensures that values injected by container platforms like Coolify, Docker, or Kubernetes
 * are read dynamically instead of being baked in or cached at build time.
 */
export const env: EnvConfig = new Proxy({} as EnvConfig, {
  get(_target, prop: string) {
    const validated = getValidatedEnv();
    return validated[prop as keyof EnvConfig];
  },
});
