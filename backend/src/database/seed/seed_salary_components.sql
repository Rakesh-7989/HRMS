-- Seed: Default Indian Salary Components
-- This script seeds default salary components for a tenant
-- Run this after the migration, passing tenant_id as a parameter

-- Usage: Replace $1 with actual tenant_id when running
-- Or call via application code

-- Function to seed default components for a tenant
CREATE OR REPLACE FUNCTION seed_default_salary_components(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
    -- EARNINGS
    INSERT INTO salary_components (tenant_id, name, code, component_type, category, is_taxable, is_pro_rata, is_statutory, display_order, description)
    VALUES 
        (p_tenant_id, 'Basic Salary', 'BASIC', 'EARNING', 'BASIC', TRUE, TRUE, FALSE, 1, 'Base salary component, typically 40-50% of CTC'),
        (p_tenant_id, 'House Rent Allowance', 'HRA', 'EARNING', 'ALLOWANCE', TRUE, TRUE, FALSE, 2, 'Allowance for housing, typically 40-50% of Basic'),
        (p_tenant_id, 'Dearness Allowance', 'DA', 'EARNING', 'ALLOWANCE', TRUE, TRUE, FALSE, 3, 'Cost of living adjustment allowance'),
        (p_tenant_id, 'Special Allowance', 'SPECIAL', 'EARNING', 'ALLOWANCE', TRUE, TRUE, FALSE, 4, 'Flexible allowance to balance CTC'),
        (p_tenant_id, 'Conveyance Allowance', 'CONVEYANCE', 'EARNING', 'ALLOWANCE', FALSE, TRUE, FALSE, 5, 'Transport allowance (tax-exempt up to limit)'),
        (p_tenant_id, 'Medical Allowance', 'MEDICAL', 'EARNING', 'ALLOWANCE', FALSE, TRUE, FALSE, 6, 'Medical expense allowance'),
        (p_tenant_id, 'Leave Travel Allowance', 'LTA', 'EARNING', 'ALLOWANCE', FALSE, FALSE, FALSE, 7, 'Travel allowance (tax-exempt with conditions)'),
        (p_tenant_id, 'Performance Bonus', 'PERF_BONUS', 'EARNING', 'BENEFIT', TRUE, FALSE, FALSE, 8, 'Variable performance-based bonus'),
        (p_tenant_id, 'Statutory Bonus', 'STAT_BONUS', 'EARNING', 'BENEFIT', TRUE, FALSE, TRUE, 9, 'Statutory bonus as per Payment of Bonus Act')
    ON CONFLICT (tenant_id, code) DO NOTHING;

    -- DEDUCTIONS
    INSERT INTO salary_components (tenant_id, name, code, component_type, category, is_taxable, is_pro_rata, is_statutory, statutory_code, display_order, description)
    VALUES 
        (p_tenant_id, 'Provident Fund (Employee)', 'PF_EE', 'DEDUCTION', 'STATUTORY', FALSE, TRUE, TRUE, 'PF', 20, 'Employee contribution to PF (12% of Basic)'),
        (p_tenant_id, 'Professional Tax', 'PT', 'DEDUCTION', 'STATUTORY', FALSE, FALSE, TRUE, 'PT', 21, 'State professional tax'),
        (p_tenant_id, 'Tax Deducted at Source', 'TDS', 'DEDUCTION', 'STATUTORY', FALSE, FALSE, TRUE, 'TDS', 22, 'Income tax deduction'),
        (p_tenant_id, 'ESI (Employee)', 'ESI_EE', 'DEDUCTION', 'STATUTORY', FALSE, TRUE, TRUE, 'ESI', 23, 'Employee contribution to ESI (1.75% of Gross)')
    ON CONFLICT (tenant_id, code) DO NOTHING;

    -- EMPLOYER CONTRIBUTIONS (Not paid to employee but part of CTC)
    INSERT INTO salary_components (tenant_id, name, code, component_type, category, is_taxable, is_pro_rata, is_statutory, statutory_code, display_order, description)
    VALUES 
        (p_tenant_id, 'Provident Fund (Employer)', 'PF_ER', 'EMPLOYER_CONTRIBUTION', 'STATUTORY', FALSE, TRUE, TRUE, 'PF', 30, 'Employer contribution to PF (12% of Basic, capped)'),
        (p_tenant_id, 'ESI (Employer)', 'ESI_ER', 'EMPLOYER_CONTRIBUTION', 'STATUTORY', FALSE, TRUE, TRUE, 'ESI', 31, 'Employer contribution to ESI (4.75% of Gross)'),
        (p_tenant_id, 'Gratuity', 'GRATUITY', 'EMPLOYER_CONTRIBUTION', 'STATUTORY', FALSE, TRUE, TRUE, 'GRATUITY', 32, 'Gratuity provision (4.81% of Basic)')
    ON CONFLICT (tenant_id, code) DO NOTHING;

    -- REIMBURSEMENTS
    INSERT INTO salary_components (tenant_id, name, code, component_type, category, is_taxable, is_pro_rata, is_statutory, display_order, description)
    VALUES 
        (p_tenant_id, 'Food Allowance', 'FOOD', 'REIMBURSEMENT', 'BENEFIT', FALSE, TRUE, FALSE, 40, 'Food/meal reimbursement'),
        (p_tenant_id, 'Telephone Reimbursement', 'TELEPHONE', 'REIMBURSEMENT', 'BENEFIT', FALSE, TRUE, FALSE, 41, 'Phone/internet bill reimbursement'),
        (p_tenant_id, 'Fuel Reimbursement', 'FUEL', 'REIMBURSEMENT', 'BENEFIT', FALSE, TRUE, FALSE, 42, 'Fuel expense reimbursement')
    ON CONFLICT (tenant_id, code) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Function to seed default reimbursement types
CREATE OR REPLACE FUNCTION seed_default_reimbursement_types(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO reimbursement_types (tenant_id, name, code, max_annual_limit, requires_receipt, is_taxable, description)
    VALUES 
        (p_tenant_id, 'Medical Reimbursement', 'MEDICAL', 15000, TRUE, FALSE, 'Medical bill reimbursement'),
        (p_tenant_id, 'Travel Reimbursement', 'TRAVEL', NULL, TRUE, FALSE, 'Business travel expenses'),
        (p_tenant_id, 'Internet/Phone Bills', 'TELECOM', 12000, TRUE, FALSE, 'Monthly internet and phone bills'),
        (p_tenant_id, 'Fuel Reimbursement', 'FUEL', 24000, TRUE, FALSE, 'Vehicle fuel expenses'),
        (p_tenant_id, 'Books & Periodicals', 'BOOKS', 5000, TRUE, FALSE, 'Professional books and journals'),
        (p_tenant_id, 'Training & Certification', 'TRAINING', 50000, TRUE, FALSE, 'Professional development courses')
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to create a default salary structure
CREATE OR REPLACE FUNCTION seed_default_salary_structure(p_tenant_id UUID)
RETURNS UUID AS $$
DECLARE
    v_structure_id UUID;
    v_basic_id UUID;
    v_hra_id UUID;
    v_special_id UUID;
    v_pf_ee_id UUID;
    v_pf_er_id UUID;
    v_gratuity_id UUID;
BEGIN
    -- Create default structure
    INSERT INTO salary_structures (tenant_id, name, description, is_default, is_active)
    VALUES (p_tenant_id, 'Standard India Structure', 'Default salary structure for Indian employees with PF and Gratuity', TRUE, TRUE)
    RETURNING id INTO v_structure_id;

    -- Get component IDs
    SELECT id INTO v_basic_id FROM salary_components WHERE tenant_id = p_tenant_id AND code = 'BASIC';
    SELECT id INTO v_hra_id FROM salary_components WHERE tenant_id = p_tenant_id AND code = 'HRA';
    SELECT id INTO v_special_id FROM salary_components WHERE tenant_id = p_tenant_id AND code = 'SPECIAL';
    SELECT id INTO v_pf_ee_id FROM salary_components WHERE tenant_id = p_tenant_id AND code = 'PF_EE';
    SELECT id INTO v_pf_er_id FROM salary_components WHERE tenant_id = p_tenant_id AND code = 'PF_ER';
    SELECT id INTO v_gratuity_id FROM salary_components WHERE tenant_id = p_tenant_id AND code = 'GRATUITY';

    -- Add structure components
    -- Basic: 40% of CTC
    INSERT INTO salary_structure_components (tenant_id, structure_id, component_id, calculation_type, percentage, display_order)
    VALUES (p_tenant_id, v_structure_id, v_basic_id, 'PERCENTAGE_OF_CTC', 40, 1);

    -- HRA: 50% of Basic (or 20% of CTC)
    INSERT INTO salary_structure_components (tenant_id, structure_id, component_id, calculation_type, percentage, display_order)
    VALUES (p_tenant_id, v_structure_id, v_hra_id, 'PERCENTAGE_OF_BASIC', 50, 2);

    -- PF Employee: 12% of Basic (max 15000 base)
    INSERT INTO salary_structure_components (tenant_id, structure_id, component_id, calculation_type, percentage, max_value, display_order)
    VALUES (p_tenant_id, v_structure_id, v_pf_ee_id, 'PERCENTAGE_OF_BASIC', 12, 1800, 3);

    -- PF Employer: 12% of Basic (max 15000 base)
    INSERT INTO salary_structure_components (tenant_id, structure_id, component_id, calculation_type, percentage, max_value, display_order)
    VALUES (p_tenant_id, v_structure_id, v_pf_er_id, 'PERCENTAGE_OF_BASIC', 12, 1800, 4);

    -- Gratuity: 4.81% of Basic
    INSERT INTO salary_structure_components (tenant_id, structure_id, component_id, calculation_type, percentage, display_order)
    VALUES (p_tenant_id, v_structure_id, v_gratuity_id, 'PERCENTAGE_OF_BASIC', 4.81, 5);

    -- Special Allowance: Remaining amount to balance CTC
    INSERT INTO salary_structure_components (tenant_id, structure_id, component_id, calculation_type, display_order)
    VALUES (p_tenant_id, v_structure_id, v_special_id, 'REMAINING', 6);

    RETURN v_structure_id;
END;
$$ LANGUAGE plpgsql;
