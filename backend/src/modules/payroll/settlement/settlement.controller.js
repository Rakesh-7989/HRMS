const settlementService = require("./settlement.service");

// Reimbursements
const createReimbursement = async (req, res) => {
    const data = await settlementService.createReimbursement(
        req.user.tenantId,
        req.user.employeeId,
        req.user.id,
        req.body
    );
    res.status(201).json({ status: "success", data });
};

const getReimbursements = async (req, res) => {
    const data = await settlementService.getReimbursements(req.user.tenantId, req.query);
    res.json({ status: "success", data });
};

const getMyReimbursements = async (req, res) => {
    const data = await settlementService.getMyReimbursements(req.user.tenantId, req.user.employeeId);
    res.json({ status: "success", data });
};

const approveReimbursement = async (req, res) => {
    const data = await settlementService.approveReimbursement(
        req.user.tenantId,
        req.params.id,
        req.user.id,
        req.body.status,
        req.body.includeInPayroll
    );
    res.json({ status: "success", data });
};

// F&F Settlement
const createFnFSettlement = async (req, res) => {
    const data = await settlementService.createFnFSettlement(req.user.tenantId, req.user.id, req.body);
    res.status(201).json({ status: "success", data });
};

const getFnFSettlements = async (req, res) => {
    const data = await settlementService.getFnFSettlements(req.user.tenantId, req.query);
    res.json({ status: "success", data });
};

const getFnFSettlementById = async (req, res) => {
    const data = await settlementService.getFnFSettlementById(req.user.tenantId, req.params.id);
    if (!data) {
        return res.status(404).json({ status: "error", message: "Settlement not found" });
    }
    res.json({ status: "success", data });
};

const updateFnFSettlement = async (req, res) => {
    const data = await settlementService.updateFnFSettlement(req.user.tenantId, req.params.id, req.body);
    res.json({ status: "success", data });
};

const submitFnFForApproval = async (req, res) => {
    const data = await settlementService.submitFnFForApproval(req.user.tenantId, req.params.id);
    res.json({ status: "success", data, message: "Submitted for approval" });
};

const approveFnFSettlement = async (req, res) => {
    try {
        const data = await settlementService.approveFnFSettlement(
            req.user.tenantId,
            req.params.id,
            req.user.id,
            req.body.status
        );
        res.json({ status: "success", data });
    } catch (error) {
        console.error("Approve GnF Settlement Error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
};

const markFnFPaid = async (req, res) => {
    try {
        const data = await settlementService.markFnFPaid(req.user.tenantId, req.params.id, req.user.id);
        res.json({ status: "success", data, message: "Settlement marked as paid" });
    } catch (error) {
        console.error("Mark FnF Paid Error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
};

module.exports = {
    createReimbursement,
    getReimbursements,
    getMyReimbursements,
    approveReimbursement,
    createFnFSettlement,
    getFnFSettlements,
    getFnFSettlementById,
    updateFnFSettlement,
    submitFnFForApproval,
    approveFnFSettlement,
    markFnFPaid
};
