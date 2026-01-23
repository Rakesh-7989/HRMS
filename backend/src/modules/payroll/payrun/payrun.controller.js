const payrunService = require("./payrun.service");

// Pay Schedules
const createSchedule = async (req, res) => {
    const data = await payrunService.createSchedule(req.user.tenantId, req.user.id, req.body);
    res.status(201).json({ status: "success", data });
};

const getSchedules = async (req, res) => {
    const data = await payrunService.getSchedules(req.user.tenantId);
    res.json({ status: "success", data });
};

// Payroll Runs
const createPayrun = async (req, res) => {
    const data = await payrunService.createPayrun(req.user.tenantId, req.user.id, req.body);
    res.status(201).json({ status: "success", data });
};

const getPayruns = async (req, res) => {
    const data = await payrunService.getPayruns(req.user.tenantId, req.query);
    res.json({ status: "success", data });
};

const getPayrunById = async (req, res) => {
    const payrun = await payrunService.getPayrunById(req.user.tenantId, req.params.id);
    if (!payrun) {
        return res.status(404).json({ status: "error", message: "Payrun not found" });
    }
    const items = await payrunService.getPayrunItems(req.user.tenantId, req.params.id);
    res.json({ status: "success", data: { ...payrun, items } });
};

const calculatePayrun = async (req, res) => {
    const data = await payrunService.calculatePayrun(req.user.tenantId, req.params.id, req.user.id);
    res.json({ status: "success", data, message: "Payroll calculated successfully" });
};

const approvePayrun = async (req, res) => {
    const data = await payrunService.approvePayrun(req.user.tenantId, req.params.id, req.user.id);
    res.json({ status: "success", data, message: "Payroll approved" });
};

const rejectPayrun = async (req, res) => {
    const data = await payrunService.rejectPayrun(
        req.user.tenantId,
        req.params.id,
        req.user.id,
        req.body.reason
    );
    res.json({ status: "success", data, message: "Payroll rejected" });
};

const revokePayrun = async (req, res) => {
    const data = await payrunService.revokePayrun(req.user.tenantId, req.params.id, req.user.id);
    res.json({ status: "success", data, message: "Payroll revoked" });
};

const deletePayrun = async (req, res) => {
    const data = await payrunService.deletePayrun(req.user.tenantId, req.params.id);
    res.json({ status: "success", data });
};

const lockPayrun = async (req, res) => {
    const data = await payrunService.lockPayrun(req.user.tenantId, req.params.id, req.user.id);
    res.json({ status: "success", data, message: "Payroll locked" });
};

module.exports = {
    createSchedule,
    getSchedules,
    createPayrun,
    getPayruns,
    getPayrunById,
    calculatePayrun,
    approvePayrun,
    rejectPayrun,
    revokePayrun,
    deletePayrun,
    lockPayrun
};
