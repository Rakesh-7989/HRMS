const db = require("../../../config/db");
const inboxService = require("../../inbox/inbox.service");

/* =========================
   EXPENSE CATEGORIES
========================= */
const createCategory = async (tenantId, payload) => {
  const {
    name,
    code,
    description,
    requiresApproval,
    approvalThreshold,
    isActive
  } = payload;

  return (
    await db.query(
      `
      INSERT INTO expense_categories
      (tenant_id, name, code, description, requires_approval, approval_threshold, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *;
      `,
      [
        tenantId,
        name,
        code,
        description ?? null,
        requiresApproval ?? false,
        approvalThreshold ?? null,
        isActive ?? true
      ]
    )
  ).rows[0];
};

const getCategories = async (tenantId) => {
  return (
    await db.query(
      `
      SELECT *
      FROM expense_categories
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY created_at DESC;
      `,
      [tenantId]
    )
  ).rows;
};

/* =========================
   EXPENSES
========================= */
const createExpense = async (tenantId, employeeId, userId, payload) => {
  const {
    categoryId,
    amount,
    expenseDate,
    description,
    payrollIncluded
  } = payload;

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const expDate = new Date(expenseDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (expDate > today) {
    throw new Error("Expense date cannot be in the future");
  }

  // SECURITY FIX: Check for duplicate expense
  const dupCheck = await db.query(
    `
    SELECT id FROM employee_expenses
    WHERE tenant_id = $1
      AND employee_id = $2
      AND amount = $3
      AND expense_date = $4
      AND category_id = $5
      AND is_deleted = false
    LIMIT 1;
    `,
    [tenantId, employeeId, numericAmount, expenseDate, categoryId]
  );

  if (dupCheck.rowCount > 0) {
    throw new Error("A duplicate expense already exists for this date and amount.");
  }

  const created = (
    await db.query(
      `
      INSERT INTO employee_expenses
      (
        tenant_id,
        employee_id,
        category_id,
        amount,
        expense_date,
        include_in_payroll,
        remarks,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
      `,
      [
        tenantId,
        employeeId,
        categoryId,
        numericAmount,
        expenseDate,
        payrollIncluded,
        description ?? null,
        userId
      ]
    )
  ).rows[0];

  // Notify admin/HR: new expense submitted
  try {
    const empRes = await db.query(
      `SELECT first_name, last_name FROM employees WHERE id = $1`, [employeeId]
    );
    const emp = empRes.rows[0];
    const hrUsers = await db.query(
      `SELECT id FROM users WHERE tenant_id = $1 AND role IN ('HR','ADMIN') AND id != $2`, [tenantId, userId]
    );
    for (const hr of hrUsers.rows) {
      await inboxService.createNotification(db, {
        tenant_id: tenantId, user_id: hr.id,
        title: 'New Expense Submitted',
        message: `${emp?.first_name} ${emp?.last_name} submitted an expense of ₹${amount}`,
        type: 'info', link: '/payroll/expenses'
      });
    }
  } catch (notifErr) {
    console.error('Expense submit notification error:', notifErr.message);
  }

  return created;
};

const getExpenses = async (tenantId) => {
  return (
    await db.query(
      `
      SELECT *
      FROM employee_expenses
      WHERE tenant_id = $1
        AND is_deleted = false
      ORDER BY created_at DESC;
      `,
      [tenantId]
    )
  ).rows;
};

const approveExpense = async (tenantId, expenseId, status, approverId) => {
  // SECURITY FIX: Validate status is only APPROVED or REJECTED
  const validStatuses = ['APPROVED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // SECURITY FIX: Fetch expense to verify it exists, is not deleted, and prevent self-approval
  const expense = await db.query(
    `
    SELECT ee.employee_id, ee.created_by, e.user_id AS employee_user_id
    FROM employee_expenses ee
    LEFT JOIN employees e ON e.id = ee.employee_id
    WHERE ee.tenant_id = $1
      AND ee.id = $2
      AND ee.is_deleted = false
    `,
    [tenantId, expenseId]
  );

  if (expense.rowCount === 0) {
    throw new Error("Expense not found or already processed");
  }

  const expRow = expense.rows[0];

  // SECURITY FIX: Prevent self-approval
  if (expRow.created_by === approverId || expRow.employee_user_id === approverId) {
    throw new Error("Cannot approve your own expense request.");
  }

  // SECURITY FIX: Only allow approving PENDING and non-deleted expenses
  const result = await db.query(
    `
    UPDATE employee_expenses
    SET status = $1,
        approved_by = $2,
        approved_at = now(),
        updated_at = now()
    WHERE tenant_id = $3 
      AND id = $4
      AND status = 'PENDING'
      AND is_deleted = false
    RETURNING *;
    `,
    [status, approverId, tenantId, expenseId]
  );

  if (result.rowCount === 0) {
    throw new Error("Expense not found or already processed");
  }

  const updated = result.rows[0];

  // Notify employee: expense approved/rejected
  try {
    const empUserRes = await db.query(
      `SELECT e.user_id FROM employees e WHERE e.id = $1`, [updated.employee_id]
    );
    if (empUserRes.rows[0]) {
      const isApproved = status === 'APPROVED';
      await inboxService.createNotification(db, {
        tenant_id: tenantId, user_id: empUserRes.rows[0].user_id,
        title: isApproved ? 'Expense Approved ✅' : 'Expense Rejected',
        message: isApproved
          ? `Your expense claim of ₹${updated.amount} has been approved.`
          : `Your expense claim of ₹${updated.amount} was rejected.`,
        type: isApproved ? 'success' : 'warning', link: '/payroll/expenses'
      });
    }
  } catch (notifErr) {
    console.error('Expense approve notification error:', notifErr.message);
  }

  return updated;
};

const togglePayroll = async (tenantId, expenseId, payrollIncluded) => {
  return (
    await db.query(
      `
      UPDATE employee_expenses
      SET include_in_payroll = $1,
          updated_at = now()
      WHERE tenant_id = $2 AND id = $3
      RETURNING *;
      `,
      [payrollIncluded, tenantId, expenseId]
    )
  ).rows[0];
};

const updateExpense = async (tenantId, expenseId, payload) => {
  const fields = [];
  const values = [];
  let index = 1;

  // 🔑 STRICT mapping: API → DB
  const columnMap = {
    categoryId: "category_id",
    amount: "amount",
    expenseDate: "expense_date",
    description: "description",
    payrollIncluded: "payroll_included"
  };

  for (const key of Object.keys(payload)) {
    if (!columnMap[key]) continue;

    fields.push(`${columnMap[key]} = $${index}`);
    values.push(payload[key]);
    index++;
  }

  // 🚨 Safety check
  if (fields.length === 0) {
    throw new Error("No valid fields to update");
  }

  const query = `
    UPDATE employee_expenses
    SET ${fields.join(", ")},
        updated_at = now()
    WHERE tenant_id = $${index}
      AND id = $${index + 1}
    RETURNING *;
  `;

  values.push(tenantId, expenseId);

  return (await db.query(query, values)).rows[0];
};


const deleteExpense = async (tenantId, expenseId) => {
  return (
    await db.query(
      `
      UPDATE employee_expenses
      SET is_deleted = true, updated_at = now()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *;
      `,
      [tenantId, expenseId]
    )
  ).rows[0];
};

module.exports = {
  createCategory,
  getCategories,
  createExpense,
  getExpenses,
  approveExpense,
  togglePayroll,
  updateExpense,
  deleteExpense
};
