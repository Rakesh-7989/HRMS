const salaryService = require("./salary.service");

// Salary Templates
const createTemplate = async (req, res) => {
    const data = await salaryService.createTemplate(req.user.tenantId, req.user.id, req.body);
    res.status(201).json({ status: "success", data });
};

const getTemplates = async (req, res) => {
    const data = await salaryService.getTemplates(req.user.tenantId);
    res.json({ status: "success", data });
};

const getTemplateById = async (req, res) => {
    const data = await salaryService.getTemplateById(req.user.tenantId, req.params.id);
    if (!data) {
        return res.status(404).json({ status: "error", message: "Template not found" });
    }
    res.json({ status: "success", data });
};

const updateTemplate = async (req, res) => {
    const data = await salaryService.updateTemplate(req.user.tenantId, req.params.id, req.body);
    res.json({ status: "success", data });
};

const deleteTemplate = async (req, res) => {
    const data = await salaryService.deleteTemplate(req.user.tenantId, req.params.id);
    res.json({ status: "success", data });
};

// Employee Salary Details
const assignSalary = async (req, res) => {
    const data = await salaryService.assignSalary(req.user.tenantId, req.user.id, req.body);
    res.status(201).json({ status: "success", data });
};

const getEmployeeSalary = async (req, res) => {
    const data = await salaryService.getEmployeeSalary(req.user.tenantId, req.params.employeeId);
    res.json({ status: "success", data: data || null });
};

const getEmployeeSalaryHistory = async (req, res) => {
    const data = await salaryService.getEmployeeSalaryHistory(req.user.tenantId, req.params.employeeId);
    res.json({ status: "success", data });
};

const getAllEmployeeSalaries = async (req, res) => {
    const data = await salaryService.getAllEmployeeSalaries(req.user.tenantId);
    res.json({ status: "success", data });
};

// Salary Revisions
const createRevision = async (req, res) => {
    const data = await salaryService.createRevision(req.user.tenantId, req.user.id, req.body);
    res.status(201).json({ status: "success", data });
};

const getRevisions = async (req, res) => {
    const data = await salaryService.getRevisions(req.user.tenantId, req.query.employeeId);
    res.json({ status: "success", data });
};

const approveRevision = async (req, res) => {
    const data = await salaryService.approveRevision(
        req.user.tenantId,
        req.params.id,
        req.user.id,
        req.body.status
    );
    res.json({ status: "success", data });
};

module.exports = {
    createTemplate,
    getTemplates,
    getTemplateById,
    updateTemplate,
    deleteTemplate,
    assignSalary,
    getEmployeeSalary,
    getEmployeeSalaryHistory,
    getAllEmployeeSalaries,
    createRevision,
    getRevisions,
    approveRevision
};
