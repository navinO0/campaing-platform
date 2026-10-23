-- Migration 006: Add Banner Images, Custom Payment Links & QR Codes, Interactive Choice Options, and Recurring Schedules
-- Adds support for:
-- 1. Banner image headers on client templates and global templates
-- 2. Direct payment links and dynamic payment QR code configurations
-- 3. Interactive 'Choose One' Quick Reply options for customer response
-- 4. Recurring and repeated scheduling for client reminders and campaigns

-- 1. Client Templates Enhancements
ALTER TABLE whatsapp_campaign.client_templates
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_config JSONB DEFAULT '{"enabled": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS choice_options JSONB DEFAULT '[]'::jsonb;

-- 2. Global Templates Enhancements
ALTER TABLE whatsapp_campaign.templates
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_config JSONB DEFAULT '{"enabled": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS choice_options JSONB DEFAULT '[]'::jsonb;

-- 3. Client Reminders Recurring Scheduling
ALTER TABLE whatsapp_campaign.client_reminders
  ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(32) NOT NULL DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recurring_rule JSONB,
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_client_reminders_next_run
  ON whatsapp_campaign.client_reminders(next_run_at)
  WHERE next_run_at IS NOT NULL;

-- 4. Clients Table: Recurring reminder configuration
ALTER TABLE whatsapp_campaign.clients
  ADD COLUMN IF NOT EXISTS reminder_schedule JSONB DEFAULT '{"type":"immediate"}'::jsonb;

-- 5. Update Seeded Client Templates with Rich Banner Images, Payment QR Codes, and Choice Options
UPDATE whatsapp_campaign.client_templates
SET
  banner_url = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
  qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dsharma.services%40okaxis%26pn%3DSharma%2BEnterprises%26am%3D1499.00%26cu%3DINR',
  payment_config = '{
    "enabled": true,
    "upiId": "sharma.services@okaxis",
    "payeeName": "Sharma Enterprises HVAC Care",
    "amount": 1499.00,
    "paymentLink": "https://pay.example.com/inv/8912",
    "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dsharma.services%40okaxis%26pn%3DSharma%2BEnterprises%26am%3D1499.00%26cu%3DINR"
  }'::jsonb,
  choice_options = '["✅ Paid Already", "💳 Pay ₹1,499 Online", "📞 Request Callback"]'::jsonb,
  buttons = '[
    {"id":"b1","type":"visit_website","text":"💳 Pay ₹1,499 Now","url":"https://pay.example.com/inv/8912"},
    {"id":"b2","type":"call_phone","text":"📞 Call Helpline","phoneNumber":"+919876543210"}
  ]'::jsonb
WHERE id = 'ctpl_aarav_maintenance_01';

UPDATE whatsapp_campaign.client_templates
SET
  banner_url = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80',
  qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dpurewater.ro%40icici%26pn%3DPureWater%2BServices%26am%3D850.00%26cu%3DINR',
  payment_config = '{
    "enabled": true,
    "upiId": "purewater.ro@icici",
    "payeeName": "PureWater RO Solutions",
    "amount": 850.00,
    "paymentLink": "https://pay.example.com/inv/ro-850",
    "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dpurewater.ro%40icici%26pn%3DPureWater%2BServices%26am%3D850.00%26cu%3DINR"
  }'::jsonb,
  choice_options = '["✅ Service Done / Paid", "📅 Confirm Slot", "💬 Chat Support"]'::jsonb,
  buttons = '[
    {"id":"b1","type":"visit_website","text":"💳 Pay ₹850 Online","url":"https://pay.example.com/inv/ro-850"},
    {"id":"b2","type":"call_phone","text":"📞 Technician Call","phoneNumber":"+919823456789"}
  ]'::jsonb
WHERE id = 'ctpl_priya_ro_02';

UPDATE whatsapp_campaign.client_templates
SET
  banner_url = 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&auto=format&fit=crop&q=80',
  qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dverma.fleet%40hdfcbank%26pn%3DVerma%2BLogistics%26am%3D3200.00%26cu%3DINR',
  payment_config = '{
    "enabled": true,
    "upiId": "verma.fleet@hdfcbank",
    "payeeName": "Verma Logistics GPS Care",
    "amount": 3200.00,
    "paymentLink": "https://pay.example.com/fleet/verma",
    "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dverma.fleet%40hdfcbank%26pn%3DVerma%2BLogistics%26am%3D3200.00%26cu%3DINR"
  }'::jsonb,
  choice_options = '["✅ Renewed & Paid", "💳 Renew Online Now", "⚠️ Report Dispute"]'::jsonb,
  buttons = '[
    {"id":"b1","type":"visit_website","text":"💳 Instant Renew (₹3,200)","url":"https://pay.example.com/fleet/verma"}
  ]'::jsonb
WHERE id = 'ctpl_rohan_fleet_03';
