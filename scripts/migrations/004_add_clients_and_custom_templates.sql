-- Migration 004: Add Clients, Client Custom Templates, and Reminder Dispatch Logs
-- Allows creating custom WhatsApp templates tailored to a specific client / mobile number,
-- grouped by client, with direct reminder dispatch tracking.

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

