-- Add framework mapping columns to nis2_mappings table
-- Run this SQL in your Supabase SQL editor

ALTER TABLE nis2_mappings 
ADD COLUMN IF NOT EXISTS nist_csf_control_ids JSONB,
ADD COLUMN IF NOT EXISTS soc2_control_ids JSONB,
ADD COLUMN IF NOT EXISTS pci_dss_control_ids JSONB;

-- Example: Update existing NIS2 mappings with NIST CSF control IDs
-- UPDATE nis2_mappings 
-- SET nist_csf_control_ids = '["AC-1", "AC-2", "AU-1"]'::jsonb
-- WHERE nis2_article = '21(2)(a)';

-- Example: Update existing NIS2 mappings with SOC 2 control IDs
-- UPDATE nis2_mappings 
-- SET soc2_control_ids = '["CC1.1", "CC2.1", "CC5.1"]'::jsonb
-- WHERE nis2_article = '21(2)(a)';

-- Example: Update existing NIS2 mappings with PCI-DSS control IDs
-- UPDATE nis2_mappings 
-- SET pci_dss_control_ids = '["Req-1.1", "Req-2.1", "Req-7.1"]'::jsonb
-- WHERE nis2_article = '21(2)(a)';

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nis2_mappings' 
AND column_name IN ('nist_csf_control_ids', 'soc2_control_ids', 'pci_dss_control_ids');
