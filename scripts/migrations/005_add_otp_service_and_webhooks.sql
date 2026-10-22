-- Migration 005: Add OTP Service, Verification Engine, and Webhook Logging
-- Implements production-grade OTP lifecycle (cryptographic hashing, expiry, rate-limiting, attempt-locking)
-- and incoming webhook event auditing.

CREATE TABLE IF NOT EXISTS whatsapp_campaign.otp_verifications (
  id VARCHAR(64) PRIMARY KEY,
  phone VARCHAR(32) NOT NULL,
  otp_hash VARCHAR(128) NOT NULL,
  salt VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'expired', 'max_attempts_exceeded', 'superseded'
  purpose VARCHAR(64) NOT NULL DEFAULT 'authentication',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  evolution_message_id VARCHAR(128),
  delivery_status VARCHAR(32) DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'read', 'failed'
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign.webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'evolution', -- 'evolution', 'meta_cloud_api', 'n8n'
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON whatsapp_campaign.otp_verifications(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_status ON whatsapp_campaign.otp_verifications(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON whatsapp_campaign.webhook_logs(created_at DESC);

-- Seed Meta-compliant Authentication OTP Templates
INSERT INTO whatsapp_campaign.templates (
  id, name, description, language, category, status,
  header_text, body_text, footer_text, variables, example_values,
  media_type, media_url, buttons
) VALUES
(
  'tpl_auth_otp_login_01',
  'WhatsApp One-Time Password (OTP) Login',
  'Meta-compliant authentication template for secure user login and verification with Copy Code button.',
  'en',
  'AUTHENTICATION',
  'Approved',
  '🔒 Security Verification',
  'Your {{app_name}} verification code is: *{{otp_code}}*.

⏱️ This code will expire in {{expiry_minutes}} minutes.

⚠️ For your security, do not share this code with anyone, including our support team.',
  'Never share your OTP with anyone',
  ARRAY['app_name', 'otp_code', 'expiry_minutes'],
  '{"app_name": "Campaign Pro", "otp_code": "849201", "expiry_minutes": "5"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_copy","type":"copy_coupon","text":"Copy Code","couponCode":"849201"}]'::jsonb
),
(
  'tpl_auth_otp_transaction_02',
  'Payment & Transaction Authorization OTP',
  'Transactional authorization OTP with transaction amount and invoice reference.',
  'en',
  'AUTHENTICATION',
  'Approved',
  '💳 Authorize Transaction',
  'Your verification code to authorize payment of {{amount}} for {{reference}} is: *{{otp_code}}*.

⏱️ This code will expire in {{expiry_minutes}} minutes.

Do not share this code with anyone.',
  'Official Authorization Alert',
  ARRAY['amount', 'reference', 'otp_code', 'expiry_minutes'],
  '{"amount": "₹1,499", "reference": "Invoice #8912", "otp_code": "519342", "expiry_minutes": "5"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_copy","type":"copy_coupon","text":"Copy Code","couponCode":"519342"}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  header_text = EXCLUDED.header_text,
  body_text = EXCLUDED.body_text,
  footer_text = EXCLUDED.footer_text,
  variables = EXCLUDED.variables,
  example_values = EXCLUDED.example_values,
  buttons = EXCLUDED.buttons,
  updated_at = NOW();
