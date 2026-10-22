CREATE SCHEMA IF NOT EXISTS whatsapp_campaign;

CREATE TABLE IF NOT EXISTS whatsapp_campaign.schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign.campaigns (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'Scheduled',
  template_id VARCHAR(64) NOT NULL,
  template_name VARCHAR(255),
  header_text TEXT,
  footer_text TEXT,
  audience_type VARCHAR(64) NOT NULL DEFAULT 'all_opted_in',
  segment_id VARCHAR(64),
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  media JSONB,
  tracking JSONB,
  schedule JSONB NOT NULL DEFAULT '{"type":"immediate"}'::jsonb,
  throttling JSONB NOT NULL DEFAULT '{"batchSize":10,"delaySeconds":3,"maxPerMinute":60}'::jsonb,
  evolution_instance VARCHAR(128),
  evolution_api_url TEXT,
  total_audience INT NOT NULL DEFAULT 0,
  queued_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  read_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  opted_out_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign.customers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(255),
  country_code VARCHAR(8) DEFAULT '91',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  segment VARCHAR(128) DEFAULT 'All Customers',
  source VARCHAR(128) DEFAULT 'System',
  opted_in BOOLEAN NOT NULL DEFAULT TRUE,
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  opted_out_at TIMESTAMPTZ,
  opt_out_reason TEXT,
  last_contacted_at TIMESTAMPTZ,
  last_message_status VARCHAR(32),
  purchase_count INT DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0.00,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign.templates (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  language VARCHAR(16) NOT NULL DEFAULT 'en',
  category VARCHAR(32) NOT NULL DEFAULT 'MARKETING',
  status VARCHAR(32) NOT NULL DEFAULT 'Approved',
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  example_values JSONB DEFAULT '{}'::jsonb,
  media_type VARCHAR(32) DEFAULT 'none',
  media_url TEXT,
  buttons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign.segments (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  customer_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign.campaign_jobs (
  id BIGSERIAL PRIMARY KEY,
  campaign_id VARCHAR(64) NOT NULL REFERENCES whatsapp_campaign.campaigns(id) ON DELETE CASCADE,
  customer_id VARCHAR(64) REFERENCES whatsapp_campaign.customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  message TEXT,
  media_url TEXT,
  media_type VARCHAR(32) DEFAULT 'none',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  evolution_message_id VARCHAR(128),
  error_message TEXT,
  evolution_instance VARCHAR(128),
  evolution_api_url TEXT,
  variables JSONB DEFAULT '{}'::jsonb,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_jobs_status ON whatsapp_campaign.campaign_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_campaign ON whatsapp_campaign.campaign_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON whatsapp_campaign.campaigns(status);

-- Seed production business templates
INSERT INTO whatsapp_campaign.templates (
  id, name, description, language, category, status,
  header_text, body_text, footer_text, variables, example_values,
  media_type, media_url, buttons
) VALUES
(
  'tpl_service_maintenance_charges_01',
  'Service Maintenance & Charges Notice',
  'Scheduled maintenance notification with service breakdown, charges due, payment link, and ignore-if-paid notice.',
  'en',
  'UTILITY',
  'Approved',
  '🛠️ Scheduled Service & Maintenance',
  'Dear {{customer_name}},

This is a gentle reminder regarding the upcoming scheduled maintenance for your {{service_name}}.

📋 *Service Details:*
• Service / Equipment: {{service_name}}
• Scheduled Date: {{maintenance_date}}
• Invoice Reference: {{invoice_number}}
• Total Charges: {{amount_due}}
• Payment Due Date: {{due_date}}

💳 *Pay securely online:*
{{payment_link}}

⚠️ *Note:* If you have already completed this payment, please disregard this notice with our sincere appreciation.

For rescheduling, queries, or assistance, feel free to reply to this message directly.',
  'Official Service Maintenance Alert • Support: +91 98765 43210',
  ARRAY['customer_name', 'service_name', 'maintenance_date', 'invoice_number', 'amount_due', 'due_date', 'payment_link'],
  '{"customer_name": "Aarav Sharma", "service_name": "Annual HVAC / AC Servicing", "maintenance_date": "28th Oct 2026", "invoice_number": "INV-2026-8912", "amount_due": "₹1,499.00", "due_date": "31st Oct 2026", "payment_link": "https://pay.example.com/inv/8912"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_1","type":"visit_website","text":"Pay Charges","url":"https://pay.example.com"},{"id":"btn_2","type":"call_phone","text":"Call Support","phoneNumber":"+919876543210"}]'::jsonb
),
(
  'tpl_customer_welcome_greet_02',
  'Customer Welcome & Service Introduction',
  'Warm welcome message introducing business capabilities, support channels, and customer portal.',
  'en',
  'UTILITY',
  'Approved',
  '👋 Welcome to {{business_name}}',
  'Hello {{customer_name}},

Welcome to {{business_name}}! 🎉 We are truly delighted to have you with us.

We are dedicated to providing you with dependable service and uninterrupted support. You can use this official WhatsApp channel to:
• Track active services and bookings
• Access invoices and service receipts
• Request on-demand maintenance or emergency support

🌐 *Access your customer portal & service catalog:*
👉 {{portal_link}}

If you have any questions or require assistance, simply reply to this chat anytime.

Warm regards,
Team {{business_name}}',
  'Customer Success Team • We are here to help',
  ARRAY['customer_name', 'business_name', 'portal_link'],
  '{"customer_name": "Priya Patel", "business_name": "Apex Service Solutions", "portal_link": "https://portal.example.com/welcome"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_1","type":"visit_website","text":"Explore Services","url":"https://portal.example.com"},{"id":"btn_2","type":"visit_website","text":"Help & FAQ","url":"https://example.com/help"}]'::jsonb
),
(
  'tpl_festival_wishes_offer_03',
  'Festive Greetings & Special Celebration Offer',
  'Auspicious festive greetings with an exclusive promotional discount, coupon code, and validity period.',
  'en',
  'MARKETING',
  'Approved',
  '✨ Happy {{festival_name}}! 🪔',
  'Wishing you and your family abundant joy, prosperity, and good health on the auspicious occasion of {{festival_name}}! 🌟🎊

Dear {{customer_name}},

To celebrate this festive season with you, {{business_name}} is pleased to present our Festive Celebration Privilege:
Enjoy *{{discount_percentage}} OFF* across all services, maintenance packages, and products!

🎁 *Promo Code:* *{{coupon_code}}*
📅 *Valid Until:* {{valid_until}}

Claim your festive offer now:
👉 {{offer_link}}

May this season illuminate your home and business with happiness and success!',
  'Festive Wishes • Terms & Conditions Apply',
  ARRAY['festival_name', 'customer_name', 'business_name', 'discount_percentage', 'coupon_code', 'valid_until', 'offer_link'],
  '{"festival_name": "Diwali", "customer_name": "Rohan Verma", "business_name": "Apex Enterprise", "discount_percentage": "25%", "coupon_code": "FESTIVE25", "valid_until": "15th Nov 2026", "offer_link": "https://example.com/festive-deal"}'::jsonb,
  'image',
  'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80',
  '[{"id":"btn_1","type":"visit_website","text":"Claim Festive Deal","url":"https://example.com/festive-deal"},{"id":"btn_2","type":"copy_coupon","text":"Copy FESTIVE25","couponCode":"FESTIVE25"}]'::jsonb
),
(
  'tpl_routine_maintenance_due_04',
  'Routine Periodic Maintenance Due Notice',
  'Periodic servicing notification advising customers to schedule preventative maintenance before breakdown.',
  'en',
  'UTILITY',
  'Approved',
  '⏰ Maintenance Service Due',
  'Hello {{customer_name}},

Our system records indicate that your {{equipment_or_service}} is due for its periodic maintenance inspection.

Regular servicing ensures peak operational efficiency, equipment safety, and prevents unexpected downtime.

📋 *Inspection Details:*
• Asset / Equipment: {{equipment_or_service}}
• Previous Service Date: {{last_service_date}}
• Recommended Timeframe: {{recommended_timeframe}}

📅 *Book your preferred service slot:*
👉 {{booking_link}}

Need immediate technician dispatch? Reply to this message directly.',
  'Preventative Maintenance Desk • 24/7 Helpline',
  ARRAY['customer_name', 'equipment_or_service', 'last_service_date', 'recommended_timeframe', 'booking_link'],
  '{"customer_name": "Ananya Iyer", "equipment_or_service": "Water Treatment & RO Plant", "last_service_date": "20th April 2026", "recommended_timeframe": "Within the next 7 days", "booking_link": "https://example.com/schedule-service"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_1","type":"visit_website","text":"Book Slot Now","url":"https://example.com/schedule-service"},{"id":"btn_2","type":"call_phone","text":"Call Helpline","phoneNumber":"+919876543210"}]'::jsonb
),
(
  'tpl_payment_confirmation_receipt_05',
  'Payment Receipt & Service Confirmation',
  'Official payment acknowledgement providing transaction reference and downloadable PDF tax invoice.',
  'en',
  'UTILITY',
  'Approved',
  '✅ Payment Confirmation',
  'Dear {{customer_name}},

We have successfully received your payment of *{{amount_paid}}* towards {{service_name}}.

🧾 *Transaction Summary:*
• Receipt Number: {{receipt_number}}
• Payment Date: {{payment_date}}
• Service Status: {{service_status}}

📄 *Download your official receipt / tax invoice:*
👉 {{receipt_link}}

Thank you for your prompt payment and continued partnership with us!',
  'Accounts & Finance Team',
  ARRAY['customer_name', 'amount_paid', 'service_name', 'receipt_number', 'payment_date', 'service_status', 'receipt_link'],
  '{"customer_name": "Aarav Sharma", "amount_paid": "₹1,499.00", "service_name": "Annual HVAC / AC Servicing", "receipt_number": "REC-99412", "payment_date": "22nd Oct 2026", "service_status": "Paid & Confirmed", "receipt_link": "https://example.com/receipt/99412.pdf"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_1","type":"visit_website","text":"Download Invoice","url":"https://example.com/receipt/99412.pdf"}]'::jsonb
),
(
  'tpl_service_completion_feedback_06',
  'Service Completion & Experience Feedback',
  'Follow-up request sent after service completion to collect satisfaction score and Google/Trustpilot review.',
  'en',
  'UTILITY',
  'Approved',
  '⭐ How was your service experience?',
  'Hello {{customer_name}},

Our technician has completed the scheduled maintenance service for your {{service_name}}.

Your satisfaction is our highest priority! Could you please take 30 seconds to share your feedback?

🌟 *Rate our service:*
👉 {{feedback_link}}

If anything did not meet your expectations, please reply to this chat so our customer operations lead can assist you immediately.',
  'Quality Assurance Team • Powered by CustomerCare',
  ARRAY['customer_name', 'service_name', 'feedback_link'],
  '{"customer_name": "Vikram Malhotra", "service_name": "Commercial Diesel Generator Servicing", "feedback_link": "https://example.com/feedback"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_1","type":"visit_website","text":"Rate Service","url":"https://example.com/feedback"}]'::jsonb
),
(
  'tpl_festive_sale_01',
  'Festive Season Discount Offer',
  'Seasonal promotional campaign with coupon code and direct catalog link.',
  'en',
  'MARKETING',
  'Approved',
  '🎉 Mega Festive Sale is LIVE!',
  'Hello {{customer_name}},

Special Festive Sale is LIVE now! Enjoy {{discount}} OFF on our latest collection and services.

Shop our curated catalog:
{{product_link}}

Use coupon code *{{coupon_code}}* at checkout.',
  'Limited period festive privilege',
  ARRAY['customer_name', 'discount', 'product_link', 'coupon_code'],
  '{"customer_name": "Aarav Sharma", "discount": "25%", "product_link": "https://example.com/collection", "coupon_code": "FESTIVE25"}'::jsonb,
  'image',
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
  '[{"id":"btn_1","type":"visit_website","text":"Shop Now","url":"https://example.com/collection"},{"id":"btn_2","type":"copy_coupon","text":"Copy Coupon","couponCode":"FESTIVE25"}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  language = EXCLUDED.language,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  header_text = EXCLUDED.header_text,
  body_text = EXCLUDED.body_text,
  footer_text = EXCLUDED.footer_text,
  variables = EXCLUDED.variables,
  example_values = EXCLUDED.example_values,
  media_type = EXCLUDED.media_type,
  media_url = EXCLUDED.media_url,
  buttons = EXCLUDED.buttons,
  updated_at = NOW();

-- ----------------------------------------------------
-- OTP Service & Webhook Auditing
-- ----------------------------------------------------

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

-- Seed initial customers if not present
INSERT INTO whatsapp_campaign.customers (id, name, phone, email, country_code, tags, segment, source, opted_in, opted_out, purchase_count, total_spent)
VALUES
('cust_001', 'Aarav Sharma', '+919876543210', 'aarav.sharma@example.com', '91', ARRAY['VIP', 'fashion', 'frequent-buyer'], 'VIP Customers', 'Store Checkout', TRUE, FALSE, 14, 42500.00),
('cust_002', 'Priya Patel', '+919823456789', 'priya.patel@example.com', '91', ARRAY['fashion', 'sarees'], 'Customers who purchased Sarees', 'Website Signup', TRUE, FALSE, 6, 18400.00),
('cust_003', 'Rohan Verma', '+919811223344', 'rohan.v@example.com', '91', ARRAY['kurtis', 'festive'], 'Customers who purchased Kurtis', 'Instagram Ad', TRUE, FALSE, 3, 6200.00),
('cust_004', 'Ananya Iyer', '+919877665544', 'ananya.iyer@example.com', '91', ARRAY['inactive'], 'Inactive Customers', 'Website Signup', TRUE, FALSE, 1, 1500.00),
('cust_005', 'Vikram Malhotra', '+919844332211', 'vikram.m@example.com', '91', ARRAY['unsubscribed'], 'All Customers', 'Store Checkout', FALSE, TRUE, 2, 4800.00),
('cust_006', 'Elena Rostova', '+447700900123', 'elena.r@example.co.uk', '44', ARRAY['VIP', 'international'], 'VIP Customers', 'Global Store', TRUE, FALSE, 9, 68000.00)
ON CONFLICT (id) DO NOTHING;

-- Seed initial segments if not present
INSERT INTO whatsapp_campaign.segments (id, name, description, customer_count, filter)
VALUES
('seg_all', 'All Customers', 'Every registered customer regardless of tags', 6, '{}'::jsonb),
('seg_vip', 'VIP Customers', 'High lifetime value customers with > ₹20,000 spend', 2, '{"optedIn": true, "minSpent": 20000}'::jsonb),
('seg_sarees', 'Customers who purchased Sarees', 'Shoppers interested in ethnic saree collections', 1, '{"optedIn": true, "tags": ["sarees"]}'::jsonb),
('seg_kurtis', 'Customers who purchased Kurtis', 'Shoppers who bought daily wear and formal kurtis', 1, '{"optedIn": true, "tags": ["kurtis"]}'::jsonb),
('seg_inactive', 'Inactive Customers', 'Customers who haven''t ordered in the last 90 days', 1, '{"optedIn": true, "lastContactedBefore": "2026-07-01T00:00:00Z"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------
-- Clients & Client-Specific Custom Templates
-- ----------------------------------------------------

CREATE TABLE IF NOT EXISTS whatsapp_campaign.clients (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL UNIQUE,
  company VARCHAR(255),
  service_type VARCHAR(128) NOT NULL DEFAULT 'General Service Maintenance',
  charges_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  due_date DATE,
  notes TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign.client_templates (
  id VARCHAR(64) PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL REFERENCES whatsapp_campaign.clients(id) ON DELETE CASCADE,
  client_phone VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(32) NOT NULL DEFAULT 'UTILITY',
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  media_type VARCHAR(32) NOT NULL DEFAULT 'none',
  media_url TEXT,
  buttons JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_sent_at TIMESTAMPTZ,
  sent_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign.client_reminders (
  id BIGSERIAL PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL REFERENCES whatsapp_campaign.clients(id) ON DELETE CASCADE,
  client_template_id VARCHAR(64) REFERENCES whatsapp_campaign.client_templates(id) ON DELETE SET NULL,
  phone VARCHAR(32) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  rendered_message TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'sent',
  evolution_message_id VARCHAR(128),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_templates_client_id ON whatsapp_campaign.client_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_client_templates_phone ON whatsapp_campaign.client_templates(client_phone);
CREATE INDEX IF NOT EXISTS idx_client_reminders_client ON whatsapp_campaign.client_reminders(client_id);
CREATE INDEX IF NOT EXISTS idx_client_reminders_created ON whatsapp_campaign.client_reminders(created_at DESC);

-- Seed initial Clients
INSERT INTO whatsapp_campaign.clients (id, name, phone, company, service_type, charges_amount, due_date, notes, status)
VALUES
(
  'cli_001',
  'Aarav Sharma',
  '+919876543210',
  'Sharma Enterprises',
  'HVAC & Industrial AC Servicing',
  1499.00,
  CURRENT_DATE + INTERVAL '7 days',
  'Quarterly maintenance contract. Prefers afternoon reminder messages.',
  'pending_payment'
),
(
  'cli_002',
  'Priya Patel',
  '+919823456789',
  'Patel Textiles & Boutiques',
  'Water Purifier & RO Plant Maintenance',
  850.00,
  CURRENT_DATE + INTERVAL '12 days',
  'Commercial RO servicing with cartridge replacement.',
  'active'
),
(
  'cli_003',
  'Rohan Verma',
  '+919811223344',
  'Verma Logistics & Fleet',
  'Commercial Fleet GPS & Telematics Care',
  3200.00,
  CURRENT_DATE + INTERVAL '3 days',
  'Fleet tracker annual renewal fee.',
  'overdue'
)
ON CONFLICT (phone) DO NOTHING;

-- Seed custom templates tied to these specific clients and mobile numbers
INSERT INTO whatsapp_campaign.client_templates (
  id, client_id, client_phone, title, category, header_text, body_text, footer_text, variables, media_type, media_url, buttons
) VALUES
(
  'ctpl_aarav_maintenance_01',
  'cli_001',
  '+919876543210',
  'Custom AC Maintenance & Charges Reminder',
  'UTILITY',
  '🛠️ Scheduled Maintenance & Charges Due',
  'Dear {{client_name}},

This is a personalized reminder from our service desk regarding the scheduled maintenance for your {{service_type}}.

📋 *Account & Service Details:*
• Client / Company: {{company}}
• Mobile: {{client_phone}}
• Service Asset: {{service_type}}
• Maintenance Charges: ₹{{charges_amount}}
• Payment Due Date: {{due_date}}

💳 *Pay securely online:*
{{payment_link}}

⚠️ *Note:* If you have already processed this payment, kindly ignore this notice with our sincere appreciation.

For any queries or schedule adjustment, please reply directly to this message.',
  'Dedicated Account Manager • Helpdesk: +91 98765 43210',
  '{"client_name":"Aarav Sharma","company":"Sharma Enterprises","client_phone":"+919876543210","service_type":"HVAC & Industrial AC Servicing","charges_amount":"1499.00","due_date":"30th Oct 2026","payment_link":"https://pay.example.com/inv/8912"}'::jsonb,
  'none',
  NULL,
  '[{"id":"b1","type":"visit_website","text":"Pay Charges","url":"https://pay.example.com/inv/8912"},{"id":"b2","type":"call_phone","text":"Call Account Mgr","phoneNumber":"+919876543210"}]'::jsonb
),
(
  'ctpl_priya_ro_02',
  'cli_002',
  '+919823456789',
  'Custom RO Servicing & Filter Replacement',
  'UTILITY',
  '💧 Water Purifier Routine Care',
  'Hello {{client_name}},

Your commercial {{service_type}} is due for its quarterly inspection and membrane filter checkup.

📋 *Contract Details:*
• Client: {{company}}
• Registered Mobile: {{client_phone}}
• Service Fee: ₹{{charges_amount}}
• Scheduled Due Date: {{due_date}}

Our certified technician will arrive on your preferred slot.

⚠️ *Note:* If already settled, please ignore this notice. Thank you!',
  'PureWater Maintenance Services',
  '{"client_name":"Priya Patel","company":"Patel Textiles & Boutiques","client_phone":"+919823456789","service_type":"Water Purifier & RO Plant Maintenance","charges_amount":"850.00","due_date":"4th Nov 2026"}'::jsonb,
  'none',
  NULL,
  '[{"id":"b1","type":"visit_website","text":"Confirm Slot","url":"https://example.com/confirm"},{"id":"b2","type":"call_phone","text":"Helpdesk","phoneNumber":"+919823456789"}]'::jsonb
),
(
  'ctpl_rohan_fleet_03',
  'cli_003',
  '+919811223344',
  'Fleet GPS Subscription Renewal & Overdue Alert',
  'UTILITY',
  '⚠️ Subscription Renewal Notice',
  'Dear {{client_name}},

This is an urgent notice regarding your annual subscription for {{service_type}} for {{company}}.

• Outstanding Amount: ₹{{charges_amount}}
• Payment Due: {{due_date}}
• Account Mobile: {{client_phone}}

Please renew today to avoid any interruption in live tracking and telematics reports.

💳 *Pay Instantly:*
{{payment_link}}

⚠️ *Note:* Please disregard if payment has already been remitted.',
  'Fleet Operations Accounts Team',
  '{"client_name":"Rohan Verma","company":"Verma Logistics & Fleet","client_phone":"+919811223344","service_type":"Commercial Fleet GPS & Telematics Care","charges_amount":"3200.00","due_date":"26th Oct 2026","payment_link":"https://pay.example.com/fleet/verma"}'::jsonb,
  'none',
  NULL,
  '[{"id":"b1","type":"visit_website","text":"Renew Now","url":"https://pay.example.com/fleet/verma"}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  header_text = EXCLUDED.header_text,
  body_text = EXCLUDED.body_text,
  footer_text = EXCLUDED.footer_text,
  variables = EXCLUDED.variables,
  buttons = EXCLUDED.buttons,
  updated_at = NOW();

-- ----------------------------------------------------
-- OTP Service & Webhook Auditing
-- ----------------------------------------------------

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
