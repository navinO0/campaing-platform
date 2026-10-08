import { z } from "zod";

const envSchema = z.object({
  // App
  NEXT_PUBLIC_APP_NAME: z.string().default("WhatsApp Campaign Manager"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // n8n connection (Server-side ONLY)
  N8N_BASE_URL: z.string().url().default("https://n8n-ktxhkuiuzp3gnwgrggc15ekz.navin.lol"),
  N8N_API_KEY: z.string().default("n8n_api_a3f5c2a2a7b418388e287f894afc59ae51e95bd985613a3d"),
  N8N_WEBHOOK_SECRET: z.string().default("whsec_whatsapp_campaign_2026_supersecret_key"),

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
  DATABASE_URL: z.string().default(
    "postgres://postgres:8r7OI5gyHV7RSXNTYOl5MUCrDfcCOOrdD92Ytz6IXDrHRCOgzYXwv24H2qGsOUix@100.121.9.105:6574/postgres?sslmode=require"
  ),

  // Evolution API Metadata (Orchestrated through n8n - Server-side reference)
  EVOLUTION_API_URL: z.string().default("https://evo-sgwly6o49pvn1dvcdxwemtrc.navin.lol"),
  EVOLUTION_INSTANCE_NAME: z.string().default("Naveen kumar kambham"),
  EVOLUTION_API_KEY: z.string().default("4A917FA35F1C-4E65-AF79-2DEAE24C9CE3"),

  // Authentication & Security
  AUTH_SECRET: z.string().optional().default(""),
});

export type EnvConfig = z.infer<typeof envSchema>;

function getValidatedEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables configuration:", result.error.format());
    throw new Error("Invalid environment configuration");
  }
  return result.data;
}

export const env = getValidatedEnv();
