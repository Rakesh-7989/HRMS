const payrollService = require('./payroll.service');
const {
  createSalaryComponentSchema,
  createExpenseSchema,
  createLoanSchema,
  createTransactionSchema
} = require('./payroll.validator');

exports.getSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const data = await payrollService.getSummary(null, tenantId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll summary' });
  }
};

exports.listSalaryComponents = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const rows = await payrollService.listSalaryComponents(null, tenantId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to list salary components' });
  }
};

exports.createSalaryComponent = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    // Validate request body
    const validation = createSalaryComponentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.errors
      });
    }

    const payload = validation.data;
    payload.created_by = req.user?.id || null;

    const row = await payrollService.createSalaryComponent(null, tenantId, payload);
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create salary component' });
  }
};

exports.listExpenses = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const rows = await payrollService.listExpenses(null, tenantId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to list expenses' });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    // Validate request body
    const validation = createExpenseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.errors
      });
    }

    const payload = validation.data;
    payload.created_by = req.user?.id || null;

    const row = await payrollService.createExpense(null, tenantId, payload);
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
};

exports.listLoans = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const rows = await payrollService.listLoans(null, tenantId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to list loans' });
  }
};

exports.createLoan = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    // Validate request body
    const validation = createLoanSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.errors
      });
    }

    const payload = validation.data;
    payload.created_by = req.user?.id || null;

    const row = await payrollService.createLoan(null, tenantId, payload);
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create loan' });
  }
};

exports.listTransactions = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const rows = await payrollService.listTransactions(null, tenantId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to list transactions' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    // Validate request body
    const validation = createTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.errors
      });
    }

    const payload = validation.data;
    payload.created_by = req.user?.id || null;

    const row = await payrollService.createTransaction(null, tenantId, payload);
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create transaction' });
  }
};