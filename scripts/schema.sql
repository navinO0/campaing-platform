CREATE SCHEMA IF NOT EXISTS whatsapp_campaign;

CREATE TABLE IF NOT EXISTS whatsapp_campaign.campaigns (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'Scheduled',
  template_id VARCHAR(64) NOT NULL,
  template_name VARCHAR(255),
  audience_type VARCHAR(64) NOT NULL DEFAULT 'all_opted_in',
  segment_id VARCHAR(64),
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  media JSONB,
  tracking JSONB,
  schedule JSONB NOT NULL DEFAULT '{"type":"immediate"}'::jsonb,
  throttling JSONB NOT NULL DEFAULT '{"batchSize":10,"delaySeconds":3,"maxPerMinute":60}'::jsonb,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign.templates (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  language VARCHAR(16) NOT NULL DEFAULT 'en',
  category VARCHAR(32) NOT NULL DEFAULT 'MARKETING',
  status VARCHAR(32) NOT NULL DEFAULT 'Approved',
  body_text TEXT NOT NULL,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
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

-- Seed initial templates if not present
INSERT INTO whatsapp_campaign.templates (id, name, language, category, status, body_text, variables, media_type, media_url, buttons)
VALUES 
('tpl_festive_sale_01', 'Festive Season Discount Offer', 'en', 'MARKETING', 'Approved', 
 'Hello {{customer_name}},\n\nSpecial Festive Sale is LIVE now! Enjoy {{discount}} OFF on our latest collection.\n\nShop our curated styles:\n{{product_link}}\n\nUse coupon {{coupon_code}} at checkout.', 
 ARRAY['customer_name', 'discount', 'product_link', 'coupon_code'], 'image', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
 '[{"id":"btn_1","type":"visit_website","text":"Shop Now","url":"https://example.com/collection"},{"id":"btn_2","type":"copy_coupon","text":"Copy Coupon","couponCode":"FESTIVE25"}]'::jsonb),
('tpl_cart_recovery_02', 'Abandoned Cart Reminder', 'en', 'MARKETING', 'Approved',
 'Hi {{first_name}},\n\nYou left items in your cart! Complete your order within the next 2 hours and get an extra {{discount}} discount.\n\nResume checkout:\n{{product_link}}',
 ARRAY['first_name', 'discount', 'product_link'], 'none', NULL,
 '[{"id":"btn_1","type":"visit_website","text":"Complete Order","url":"https://example.com/checkout"}]'::jsonb),
('tpl_vip_exclusive_03', 'VIP Members Exclusive Preview', 'en', 'MARKETING', 'Approved',
 'Dear {{customer_name}},\n\nAs a valued VIP member, you get 24-hour early access to our new arrivals with {{discount}} off.\n\nExplore VIP Catalog:\n{{product_link}}',
 ARRAY['customer_name', 'discount', 'product_link'], 'image', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
 '[{"id":"btn_1","type":"visit_website","text":"VIP Access","url":"https://example.com/vip"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

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
