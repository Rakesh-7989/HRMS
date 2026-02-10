-- Standardize Plans and setup fees
UPDATE plans SET name = 'ELITE', setup_fee = 1500.00 WHERE id = '09c69f14-8f92-42c9-b213-870b22e72553';
UPDATE plans SET name = 'PREMIUM', setup_fee = 1000.00 WHERE id = '3308ba22-a493-45dc-9cb5-ef134d4e330d';
UPDATE plans SET name = 'STANDARD', setup_fee = 0.00 WHERE id = '7f78638f-8311-4b58-91a1-b73cbb3af6d1';

-- Delete duplicate/messy plans
DELETE FROM plans WHERE name = 'Elite' AND id = '0b5355b4-be9e-4eb2-92cd-8bd318875fc4';

-- Clear existing variations if any
DELETE FROM plan_variations;

-- Insert Standard variations
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage) VALUES
('7f78638f-8311-4b58-91a1-b73cbb3af6d1', 'MONTHLY', 1, 55.00, 18.00),
('7f78638f-8311-4b58-91a1-b73cbb3af6d1', 'YEARLY', 12, 45.00, 18.00);

-- Insert Premium variations
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage) VALUES
('3308ba22-a493-45dc-9cb5-ef134d4e330d', 'MONTHLY', 1, 70.00, 18.00),
('3308ba22-a493-45dc-9cb5-ef134d4e330d', 'QUARTERLY', 3, 67.00, 18.00),
('3308ba22-a493-45dc-9cb5-ef134d4e330d', 'HALF_YEARLY', 6, 65.00, 18.00),
('3308ba22-a493-45dc-9cb5-ef134d4e330d', 'YEARLY', 12, 60.00, 18.00);

-- Insert Elite variations
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage) VALUES
('09c69f14-8f92-42c9-b213-870b22e72553', 'MONTHLY', 1, 220.00, 18.00),
('09c69f14-8f92-42c9-b213-870b22e72553', 'QUARTERLY', 3, 214.00, 18.00),
('09c69f14-8f92-42c9-b213-870b22e72553', 'HALF_YEARLY', 6, 208.00, 18.00),
('09c69f14-8f92-42c9-b213-870b22e72553', 'YEARLY', 12, 200.00, 18.00);
