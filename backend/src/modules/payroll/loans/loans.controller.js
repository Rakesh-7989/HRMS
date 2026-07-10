const loanService = require("./loans.service.js");
const { createLoanSchema, approveLoanSchema, createLoanTypeSchema } = require("./loans.validator.js");

const createLoan = async (req, res) => {
  // Employees use the detailed flow (validated schema). Those with management permissions may create loans via simplified payload.
  if (req.user && req.user.permissions.includes('payroll:manage')) {
    // accept simplified payload from frontend: { employee_id, amount, outstanding, type }
    const payload = req.body;
    const loan = await loanService.createLoanAdmin(req.user.tenantId, req.user.id, payload);
    return res.status(201).json({ status: 'success', data: loan });
  }

  // Default: employee self-service path
  const payload = createLoanSchema.parse(req.body);

  const loan = await loanService.createLoan(
    req.user.tenantId,
    req.user.id,
    payload
  );

  res.status(201).json({ status: 'success', data: loan });
};

const getLoans = async (req, res) => {
  const loans = await loanService.getLoansByEmployee(req.user.tenantId, req.user.employeeId);
  res.json({ status: "success", data: loans });
};

const getMyLoans = async (req, res) => {
  const loans = await loanService.getLoansByEmployee(req.user.tenantId, req.user.employeeId);
  res.json({ status: "success", data: loans });
};

const getTeamLoans = async (req, res) => {
  const loans = await loanService.getLoansByManager(req.user.tenantId, req.user.employeeId);
  res.json({ status: "success", data: loans });
};

const getAllLoans = async (req, res) => {
  const loans = await loanService.getLoans(req.user.tenantId);
  res.json({ status: "success", data: loans });
};

const getLoanById = async (req, res) => {
  const loan = await loanService.getLoanById(
    req.user.tenantId,
    req.params.loanId
  )


  if (!loan) {
    return res.status(404).json({ message: "Loan not found" });
  }

  res.json({
    status: "success",
    data: loan
  });
};

const approveLoan = async (req, res) => {
  const payload = approveLoanSchema.parse(req.body);

  const loan = await loanService.approveOrRejectLoan(
    req.user.tenantId,
    req.params.loanId,
    payload.status,
    req.user.id,
    payload.remarks
  );

  res.json({
    status: "success",
    data: loan
  });
};

const closeLoan = async (req, res) => {
  const loan = await loanService.closeLoan(
    req.user.tenantId,
    req.params.loanId,
    req.user.id
  );

  res.json({ status: "success", data: loan });
};


const createLoanType = async (req, res) => {
  const data = await loanService.createLoanType(req.user.tenantId, req.body);

  res.status(201).json({ status: "success", data });
};

const getLoanTypes = async (req, res) => {
  const { tenantId } = req.user;
  const data = await loanService.getLoanTypes(tenantId);

  res.json({ status: "success", data });
};

const getLoanTypeById = async (req, res) => {
  const loanType = await loanService.getLoanTypeById(
    req.user.tenantId,
    req.params.loantypeid // ✅ CORRECT
  );

  if (!loanType) {
    // If not found or tenant mismatch, deny access (403) to avoid leaking existence
    return res.status(403).json({
      status: "error",
      message: "Loan type not found or access denied"
    });
  }

  res.json({
    status: "success",
    data: loanType
  });
};


const updateLoanType = async (req, res) => {
  const { tenantId } = req.user;
  const loantypeid = req.params.loantypeid || req.params.deleteloantypeid || req.params.updateloantypeid || req.params.id;
  const data = await loanService.updateLoanType(tenantId, loantypeid, req.body);

  res.json({ status: "success", data });
};

const deleteLoanType = async (req, res) => {
  const { tenantId } = req.user;
  const loantypeid = req.params.loantypeid || req.params.deleteloantypeid || req.params.updateloantypeid || req.params.id;
  const data = await loanService.deleteLoanType(tenantId, loantypeid);

  res.json({ status: "success", data });
};



module.exports = {
  createLoan,
  getLoans,
  getLoanById,
  approveLoan,
  deleteLoanType,
  updateLoanType,
  getLoanTypeById,
  getLoanTypes,
  createLoanType,
  closeLoan,
  getMyLoans,
  getTeamLoans,
  getAllLoans
};
