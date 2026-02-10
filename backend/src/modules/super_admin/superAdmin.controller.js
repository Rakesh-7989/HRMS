const service = require("./superAdmin.service.js");

exports.getAllTenants = async (req, res) => {
  try {
    const tenants = await service.getAllTenants(req.db);
    if (!tenants || tenants.length === 0) {
      return res.status(200).json({ status: "success", tenants: [] });
    }
    res.json({ status: "success", tenants });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getTenantById = async (req, res) => {
  try {
    const tenant = await service.getTenantById(req.db, req.params.id);
    if (!tenant) return res.status(404).json({ status: "error", message: "Tenant not found" });
    res.json({ status: "success", tenant });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.activateTenant = async (req, res) => {
  try {
    const updated = await service.updateTenantStatus(req.db, req.params.id, true);
    res.json({ status: "success", data: updated });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.deactivateTenant = async (req, res) => {
  try {
    const updated = await service.updateTenantStatus(req.db, req.params.id, false);
    res.json({ status: "success", data: updated });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getUsersByTenant = async (req, res) => {
  try {
    const users = await service.getUsersByTenant(req.db, req.params.id);
    res.json({ status: "success", users: users || [] });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getTenantEmployeeCount = async (req, res) => {
  try {
    const count = await service.getTenantEmployeeCount(req.db, req.params.id);
    res.json({ status: "success", count });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};


exports.getPlans = async (req, res) => {
  try {
    const plans = await service.getPlans(req.db);
    res.json({ status: "success", plans });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const updated = await service.updatePlan(req.db, req.params.id, req.body);
    res.json({ status: "success", data: updated });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const plan = await service.createPlan(req.db, req.body);
    res.json({ status: "success", data: plan });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const deleted = await service.deletePlan(req.db, req.params.id);
    if (!deleted) return res.status(404).json({ status: "error", message: "Plan not found" });
    res.json({ status: "success", data: deleted });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
