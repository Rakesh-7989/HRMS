const service = require("./superAdmin.service.js");

exports.getAllTenants = async (req, res) => {
  try {
    const tenants = await service.getAllTenants();
    if (!tenants || tenants.length === 0) {
      return res.status(404).json({ status: "error", message: "No tenants found" });
    }
    res.json({ status: "success", tenants });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getTenantById = async (req, res) => {
  try {
    const tenant = await service.getTenantById(req.params.id);
    if (!tenant) return res.status(404).json({ status: "error", message: "Tenant not found" });
    res.json({ status: "success", tenant });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.activateTenant = async (req, res) => {
  try {
    const updated = await service.updateTenantStatus(req.params.id, true);
    res.json({ status: "success", data: updated });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.deactivateTenant = async (req, res) => {
  try {
    const updated = await service.updateTenantStatus(req.params.id, false);
    res.json({ status: "success", data: updated });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getUsersByTenant = async (req, res) => {
  try {
    const users = await service.getUsersByTenant(req.params.id);
    if (!users || users.length === 0) {
      return res.status(404).json({ status: "error", message: "No users found for this tenant" });
    }
    res.json({ status: "success", users });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getTenantEmployeeCount = async (req, res) => {
  try {
    const count = await service.getTenantEmployeeCount(req.params.id);
    res.json({ status: "success", count });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

