-- Phase 2 Migration: Add Missing Provider Fields
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)

-- Add missing columns (whatsapp_provider already exists)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS waha_session_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS waha_status VARCHAR(50) DEFAULT 'disconnected';

-- Update SAK tenant to premium plan
UPDATE tenants 
SET plan = 'premium', 
    whatsapp_provider = 'waha'
WHERE business_name = 'SAK';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_provider ON tenants(whatsapp_provider);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- Verify results
SELECT 
    id,
    business_name,
    whatsapp_provider,
    plan,
    waha_status,
    is_active
FROM tenants;
