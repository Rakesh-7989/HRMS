const consultantService = require("./consultant.service");

// Consultants
const createConsultant = async (req, res) => {
    const data = await consultantService.createConsultant(req.user.tenantId, req.user.id, req.body);
    res.status(201).json({ status: "success", data });
};

const getConsultants = async (req, res) => {
    const activeOnly = req.query.activeOnly !== 'false';
    const data = await consultantService.getConsultants(req.user.tenantId, activeOnly);
    res.json({ status: "success", data });
};

const getConsultantById = async (req, res) => {
    const data = await consultantService.getConsultantById(req.user.tenantId, req.params.id);
    if (!data) {
        return res.status(404).json({ status: "error", message: "Consultant not found" });
    }
    res.json({ status: "success", data });
};

const updateConsultant = async (req, res) => {
    const data = await consultantService.updateConsultant(req.user.tenantId, req.params.id, req.body);
    res.json({ status: "success", data });
};

// Invoices
const createInvoice = async (req, res) => {
    const data = await consultantService.createInvoice(req.user.tenantId, req.body);
    res.status(201).json({ status: "success", data });
};

const getInvoices = async (req, res) => {
    const data = await consultantService.getInvoices(req.user.tenantId, req.query);
    res.json({ status: "success", data });
};

const approveInvoice = async (req, res) => {
    const data = await consultantService.approveInvoice(req.user.tenantId, req.params.id);
    res.json({ status: "success", data, message: "Invoice approved" });
};

const markInvoicePaid = async (req, res) => {
    const data = await consultantService.markInvoicePaid(
        req.user.tenantId,
        req.params.id,
        req.body.paymentReference
    );
    res.json({ status: "success", data, message: "Invoice marked as paid" });
};

const getConsultantPayrollSummary = async (req, res) => {
    const data = await consultantService.getConsultantPayrollSummary(req.user.tenantId, req.query);
    res.json({ status: "success", data });
};

module.exports = {
    createConsultant,
    getConsultants,
    getConsultantById,
    updateConsultant,
    createInvoice,
    getInvoices,
    approveInvoice,
    markInvoicePaid,
    getConsultantPayrollSummary
};
