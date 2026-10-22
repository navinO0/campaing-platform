-- Migration 001: Initial Schema
-- Creates dedicated schema and core tables: campaigns, customers, templates, segments, campaign_jobs

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
  evolution_instance VARCHAR(128),
  evolution_api_url TEXT,
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
