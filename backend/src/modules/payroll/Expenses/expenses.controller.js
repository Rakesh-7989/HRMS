const service = require("./expenses.service");
const logAudit = require("../../../utils/auditLogger");

/* Categories */
const createCategory = async (req, res) => {
  const data = await service.createCategory(req.user.tenantId, req.body);
  res.status(201).json({ status: "success", data });
};

const getCategories = async (req, res) => {
  const data = await service.getCategories(req.user.tenantId);
  res.json({ status: "success", data });
};

/* Expenses */
const createExpense = async (req, res) => {
  const data = await service.createExpense(
    req.user.tenantId,
    req.user.employeeId,
    req.user.id,
    req.body
  );
  res.status(201).json({ status: "success", data });
};

const getExpenses = async (req, res) => {
  const data = await service.getExpenses(req.user.tenantId);
  res.json({ status: "success", data });
};

const approveExpense = async (req, res) => {
  const data = await service.approveExpense(
    req.user.tenantId,
    req.params.expenseId,
    req.body.status,
    req.user.id
  );

  try {
    await logAudit(req, 'employee_expenses', req.params.expenseId,
      data.status === 'APPROVED' ? 'APPROVE_EXPENSE' : 'REJECT_EXPENSE',
      { status: 'PENDING' },
      { status: data.status, approved_by: req.user.id, amount: data.amount }
    );
  } catch (e) { // eslint-disable-next-line no-console
    console.error('Audit failed', e); }

  res.json({ status: "success", data });
};

const togglePayroll = async (req, res) => {
  const data = await service.togglePayroll(
    req.user.tenantId,
    req.params.expenseId,
    req.body.payrollIncluded
  );
  res.json({ status: "success", data });
};

const updateExpense = async (req, res) => {
  const data = await service.updateExpense(
    req.user.tenantId,
    req.params.expenseId,
    req.body
  );
  res.json({ status: "success", data });
};

const deleteExpense = async (req, res) => {
  const data = await service.deleteExpense(
    req.user.tenantId,
    req.params.expenseId
  );
  res.json({ status: "success", data });
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
