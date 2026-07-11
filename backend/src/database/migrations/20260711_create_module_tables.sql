-- Performance Module
CREATE TABLE IF NOT EXISTS performance_review_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cycle_type VARCHAR(20) NOT NULL DEFAULT 'QUARTERLY',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_perf_cycles_tenant ON performance_review_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_perf_cycles_status ON performance_review_cycles(tenant_id, status);

CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES performance_review_cycles(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    reviewer_id UUID REFERENCES employees(id),
    rating DECIMAL(4,2),
    comments TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_perf_reviews_cycle ON performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_perf_reviews_employee ON performance_reviews(tenant_id, employee_id);

CREATE TABLE IF NOT EXISTS performance_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(20) NOT NULL DEFAULT 'PERFORMANCE',
    target_value DECIMAL(12,2),
    current_value DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(50),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_perf_goals_employee ON performance_goals(tenant_id, employee_id);

CREATE TABLE IF NOT EXISTS performance_feedback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    requested_from UUID NOT NULL REFERENCES employees(id),
    message TEXT,
    response TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_perf_feedback_req ON performance_feedback_requests(tenant_id, employee_id);

CREATE TABLE IF NOT EXISTS performance_review_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sections JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_perf_templates_tenant ON performance_review_templates(tenant_id);

-- Recruitment Module
CREATE TABLE IF NOT EXISTS recruitment_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    location VARCHAR(255),
    employment_type VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME',
    min_experience INTEGER,
    max_experience INTEGER,
    min_salary DECIMAL(12,2),
    max_salary DECIMAL(12,2),
    description TEXT,
    requirements TEXT,
    skills_required TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    openings INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_recruitment_jobs_tenant ON recruitment_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_jobs_status ON recruitment_jobs(tenant_id, status);

CREATE TABLE IF NOT EXISTS recruitment_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_id UUID REFERENCES recruitment_jobs(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    resume_url TEXT,
    current_company VARCHAR(255),
    current_position VARCHAR(255),
    experience_years DECIMAL(4,1),
    skills TEXT[],
    source VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    rating INTEGER,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_job ON recruitment_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_tenant ON recruitment_candidates(tenant_id);

CREATE TABLE IF NOT EXISTS recruitment_interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
    interviewers UUID[] NOT NULL DEFAULT '{}',
    interview_type VARCHAR(50) NOT NULL DEFAULT 'IN_PERSON',
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    meeting_link TEXT,
    feedback TEXT,
    rating INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_recruitment_interviews_candidate ON recruitment_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_interviews_tenant ON recruitment_interviews(tenant_id);

-- Bonus Module
CREATE TABLE IF NOT EXISTS bonus_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    bonus_type VARCHAR(50) NOT NULL DEFAULT 'PERFORMANCE',
    frequency VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',
    calculation_basis VARCHAR(50) NOT NULL DEFAULT 'PERCENTAGE',
    calculation_value DECIMAL(12,4) NOT NULL DEFAULT 0,
    max_amount DECIMAL(12,2),
    eligibility_criteria JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bonus_plans_tenant ON bonus_plans(tenant_id);

CREATE TABLE IF NOT EXISTS employee_bonuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    plan_id UUID REFERENCES bonus_plans(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    period_month INTEGER,
    period_year INTEGER,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_emp_bonuses_employee ON employee_bonuses(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_bonuses_status ON employee_bonuses(tenant_id, status);

CREATE TABLE IF NOT EXISTS commission_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    commission_type VARCHAR(50) NOT NULL DEFAULT 'PERCENTAGE',
    rate DECIMAL(12,4) NOT NULL DEFAULT 0,
    threshold DECIMAL(12,2),
    max_commission DECIMAL(12,2),
    applicable_to TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_commission_structures_tenant ON commission_structures(tenant_id);

-- Engagement Module
CREATE TABLE IF NOT EXISTS engagement_surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    survey_type VARCHAR(50) NOT NULL DEFAULT 'PULSE',
    questions JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_engagement_surveys_tenant ON engagement_surveys(tenant_id);

CREATE TABLE IF NOT EXISTS engagement_survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES engagement_surveys(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(survey_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON engagement_survey_responses(survey_id);

CREATE TABLE IF NOT EXISTS engagement_recognition (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_employee_id UUID NOT NULL REFERENCES employees(id),
    to_employee_id UUID NOT NULL REFERENCES employees(id),
    category VARCHAR(50) NOT NULL DEFAULT 'VALUES',
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_engagement_recognition_tenant ON engagement_recognition(tenant_id);
CREATE INDEX IF NOT EXISTS idx_engagement_recognition_to ON engagement_recognition(to_employee_id);

-- Compliance Module
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'GENERATING',
    file_url TEXT,
    employee_count INTEGER DEFAULT 0,
    total_amount DECIMAL(14,2),
    period_month INTEGER,
    period_year INTEGER,
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_tenant ON compliance_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON compliance_reports(tenant_id, type);

-- AI Module
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    affected_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_insights_tenant ON ai_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(tenant_id, insight_type);

-- Feature Permissions Seed
INSERT INTO feature_permissions (plan_type, feature_key, is_enabled) VALUES
    (1, 'performance.full_access', FALSE),
    (2, 'performance.full_access', TRUE),
    (3, 'performance.full_access', TRUE),
    (1, 'recruitment.full_access', FALSE),
    (2, 'recruitment.full_access', TRUE),
    (3, 'recruitment.full_access', TRUE),
    (1, 'bonus.full_access', FALSE),
    (2, 'bonus.full_access', TRUE),
    (3, 'bonus.full_access', TRUE),
    (1, 'engagement.full_access', FALSE),
    (2, 'engagement.full_access', TRUE),
    (3, 'engagement.full_access', TRUE),
    (1, 'compliance.full_access', FALSE),
    (2, 'compliance.full_access', TRUE),
    (3, 'compliance.full_access', TRUE),
    (1, 'ai.full_access', FALSE),
    (2, 'ai.full_access', TRUE),
    (3, 'ai.full_access', TRUE)
ON CONFLICT (plan_type, feature_key) DO NOTHING;
