ALTER TABLE timesheet_entries ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX idx_te_project ON timesheet_entries(project_id);
