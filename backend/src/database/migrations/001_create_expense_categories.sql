-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  requires_approval BOOLEAN DEFAULT false,
  approval_threshold NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT uq_expense_category_code UNIQUE (tenant_id, code)
);

-- Create employee_expenses table
CREATE TABLE IF NOT EXISTS employee_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  category_id UUID NOT NULL,

  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL,

  include_in_payroll BOOLEAN DEFAULT false,

  status VARCHAR(20) DEFAULT 'PENDING',

  remarks TEXT,

  approved_by UUID,
  approved_at TIMESTAMP,

  created_by UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);

-- Create indexes if needed
CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant ON expense_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_expenses_tenant ON employee_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_expenses_employee ON employee_expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_expenses_status ON employee_expenses(status);
