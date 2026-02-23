-- Migration to fix missing columns and add metadata support
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Standardize regime selection table
ALTER TABLE employee_tax_regimes ALTER COLUMN financial_year TYPE VARCHAR(20);
ALTER TABLE employee_tax_regimes ALTER COLUMN regime TYPE VARCHAR(20);

-- Ensure indexes are present
CREATE UNIQUE INDEX IF NOT EXISTS it_declarations_emp_fy_section_idx ON it_declarations(employee_id, financial_year, section_id);
