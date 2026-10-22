-- Migration 002: Add Template, Customer, and Campaign Enhancements
-- Adds support for rich headers, footers, sample example values, and customer metadata

-- Template enhancements
ALTER TABLE whatsapp_campaign.templates
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS header_text TEXT,
  ADD COLUMN IF NOT EXISTS footer_text TEXT,
  ADD COLUMN IF NOT EXISTS example_values JSONB DEFAULT '{}'::jsonb;

-- Customer dynamic metadata
ALTER TABLE whatsapp_campaign.customers
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Campaign jobs variable snapshot
ALTER TABLE whatsapp_campaign.campaign_jobs
  ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;

-- Campaign headers/footers
ALTER TABLE whatsapp_campaign.campaigns
  ADD COLUMN IF NOT EXISTS header_text TEXT,
  ADD COLUMN IF NOT EXISTS footer_text TEXT;
