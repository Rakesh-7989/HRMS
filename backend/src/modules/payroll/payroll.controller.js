const payrollService = require('./payroll.service');

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
    const payload = req.body;
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
    const payload = req.body;
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
    const payload = req.body;
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
    const payload = req.body;
    payload.created_by = req.user?.id || null;
    const row = await payrollService.createTransaction(null, tenantId, payload);
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create transaction' });
  }
};