const statutoryService = require("./statutory.service");

// Statutory Config
const getStatutoryConfig = async (req, res) => {
    const data = await statutoryService.getStatutoryConfig(req.user.tenantId);
    res.json({ status: "success", data: data || {} });
};

const upsertStatutoryConfig = async (req, res) => {
    const data = await statutoryService.upsertStatutoryConfig(req.user.tenantId, req.user.id, req.body);
    res.json({ status: "success", data });
};

// PT Slabs
const getPTSlabs = async (req, res) => {
    const data = await statutoryService.getPTSlabs(req.user.tenantId, req.query.state);
    res.json({ status: "success", data });
};

const createPTSlab = async (req, res) => {
    const data = await statutoryService.createPTSlab(req.user.tenantId, req.body);
    res.status(201).json({ status: "success", data });
};

const deletePTSlab = async (req, res) => {
    const data = await statutoryService.deletePTSlab(req.user.tenantId, req.params.id);
    res.json({ status: "success", data });
};

// Deduction Types
const getDeductionTypes = async (req, res) => {
    const data = await statutoryService.getDeductionTypes(req.user.tenantId);
    res.json({ status: "success", data });
};

const createDeductionType = async (req, res) => {
    const data = await statutoryService.createDeductionType(req.user.tenantId, req.body);
    res.status(201).json({ status: "success", data });
};

const updateDeductionType = async (req, res) => {
    const data = await statutoryService.updateDeductionType(req.user.tenantId, req.params.id, req.body);
    res.json({ status: "success", data });
};

// Employee Deductions
const getEmployeeDeductions = async (req, res) => {
    const data = await statutoryService.getEmployeeDeductions(req.user.tenantId, req.params.employeeId);
    res.json({ status: "success", data });
};

const addEmployeeDeduction = async (req, res) => {
    const data = await statutoryService.addEmployeeDeduction(req.user.tenantId, req.user.id, req.body);
    res.status(201).json({ status: "success", data });
};

const removeEmployeeDeduction = async (req, res) => {
    const data = await statutoryService.removeEmployeeDeduction(req.user.tenantId, req.params.id);
    res.json({ status: "success", data });
};

// Cost Centres
const getCostCentres = async (req, res) => {
    const data = await statutoryService.getCostCentres(req.user.tenantId);
    res.json({ status: "success", data });
};

const createCostCentre = async (req, res) => {
    const data = await statutoryService.createCostCentre(req.user.tenantId, req.user.id, req.body);
    res.status(201).json({ status: "success", data });
};

const updateCostCentre = async (req, res) => {
    const data = await statutoryService.updateCostCentre(req.user.tenantId, req.params.id, req.body);
    res.json({ status: "success", data });
};

const deleteCostCentre = async (req, res) => {
    const data = await statutoryService.deleteCostCentre(req.user.tenantId, req.params.id);
    res.json({ status: "success", data });
};

// Cost Centre Allocations
const getCostCentreAllocations = async (req, res) => {
    const data = await statutoryService.getCostCentreAllocations(req.user.tenantId, req.query);
    res.json({ status: "success", data });
};

const upsertCostCentreAllocation = async (req, res) => {
    const data = await statutoryService.upsertCostCentreAllocation(req.user.tenantId, req.body);
    res.json({ status: "success", data });
};

const deleteCostCentreAllocation = async (req, res) => {
    const data = await statutoryService.deleteCostCentreAllocation(req.user.tenantId, req.params.id);
    res.json({ status: "success", data });
};

module.exports = {
    getStatutoryConfig,
    upsertStatutoryConfig,
    getPTSlabs,
    createPTSlab,
    deletePTSlab,
    getDeductionTypes,
    createDeductionType,
    updateDeductionType,
    getEmployeeDeductions,
    addEmployeeDeduction,
    removeEmployeeDeduction,
    getCostCentres,
    createCostCentre,
    updateCostCentre,
    deleteCostCentre,
    getCostCentreAllocations,
    upsertCostCentreAllocation,
    deleteCostCentreAllocation
};
