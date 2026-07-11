-- ===================================================================
-- Enable Row-Level Security on all tenant-scoped tables
-- Phase 2: Activate existing dormant policies + add RLS to new tables
-- ===================================================================

-- Section 1: Tables that have CREATE POLICY defined in schema.sql
-- but ALTER TABLE ... ENABLE ROW LEVEL SECURITY was missing
-- ===================================================================
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loan_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_loan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_loan_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_loan_adjustments ENABLE ROW LEVEL SECURITY;

-- Section 2: Phase 5 module tables — create tenant-isolation policies
-- Performance Module
-- ===================================================================
ALTER TABLE IF EXISTS performance_review_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_performance_review_cycles ON performance_review_cycles;
CREATE POLICY tenant_isolation_performance_review_cycles ON performance_review_cycles
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS performance_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_performance_reviews ON performance_reviews;
CREATE POLICY tenant_isolation_performance_reviews ON performance_reviews
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS performance_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_performance_goals ON performance_goals;
CREATE POLICY tenant_isolation_performance_goals ON performance_goals
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS performance_feedback_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_performance_feedback_requests ON performance_feedback_requests;
CREATE POLICY tenant_isolation_performance_feedback_requests ON performance_feedback_requests
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS performance_review_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_performance_review_templates ON performance_review_templates;
CREATE POLICY tenant_isolation_performance_review_templates ON performance_review_templates
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Recruitment Module
-- ===================================================================
ALTER TABLE IF EXISTS recruitment_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_recruitment_jobs ON recruitment_jobs;
CREATE POLICY tenant_isolation_recruitment_jobs ON recruitment_jobs
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS recruitment_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_recruitment_candidates ON recruitment_candidates;
CREATE POLICY tenant_isolation_recruitment_candidates ON recruitment_candidates
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS recruitment_interviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_recruitment_interviews ON recruitment_interviews;
CREATE POLICY tenant_isolation_recruitment_interviews ON recruitment_interviews
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Bonus Module
-- ===================================================================
ALTER TABLE IF EXISTS bonus_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_bonus_plans ON bonus_plans;
CREATE POLICY tenant_isolation_bonus_plans ON bonus_plans
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS employee_bonuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_employee_bonuses ON employee_bonuses;
CREATE POLICY tenant_isolation_employee_bonuses ON employee_bonuses
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS commission_structures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_commission_structures ON commission_structures;
CREATE POLICY tenant_isolation_commission_structures ON commission_structures
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Engagement Module
-- ===================================================================
ALTER TABLE IF EXISTS engagement_surveys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_engagement_surveys ON engagement_surveys;
CREATE POLICY tenant_isolation_engagement_surveys ON engagement_surveys
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS engagement_recognition ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_engagement_recognition ON engagement_recognition;
CREATE POLICY tenant_isolation_engagement_recognition ON engagement_recognition
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Compliance Module
-- ===================================================================
ALTER TABLE IF EXISTS compliance_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_compliance_reports ON compliance_reports;
CREATE POLICY tenant_isolation_compliance_reports ON compliance_reports
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- AI Module
-- ===================================================================
ALTER TABLE IF EXISTS ai_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_ai_insights ON ai_insights;
CREATE POLICY tenant_isolation_ai_insights ON ai_insights
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Section 3: Core tables that completely lacked RLS — add policies + enable
-- ===================================================================
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_notifications ON notifications;
CREATE POLICY tenant_isolation_notifications ON notifications
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_conversations ON conversations;
CREATE POLICY tenant_isolation_conversations ON conversations
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS company_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_company_holidays ON company_holidays;
CREATE POLICY tenant_isolation_company_holidays ON company_holidays
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE IF EXISTS corporate_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_corporate_announcements ON corporate_announcements;
CREATE POLICY tenant_isolation_corporate_announcements ON corporate_announcements
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Section 4: Fix default-deny tables (inbox_tasks, employee_documents)
-- These have ENABLE RLS but no policies — add basic policies
-- ===================================================================
DROP POLICY IF EXISTS tenant_isolation_inbox_tasks ON inbox_tasks;
CREATE POLICY tenant_isolation_inbox_tasks ON inbox_tasks
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

DROP POLICY IF EXISTS tenant_isolation_employee_documents ON employee_documents;
CREATE POLICY tenant_isolation_employee_documents ON employee_documents
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
