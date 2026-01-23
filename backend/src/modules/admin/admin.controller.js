const adminService = require("./admin.service");

// Tenant company profile (for settings page - future use)
exports.getTenantProfile = async (req, res) => {
  try {
    const data = await adminService.getTenantProfile(req.db, req.user.tenantId);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.updateTenantProfile = async (req, res) => {
  try {
    const data = await adminService.updateTenantProfile(req.db, req.user.tenantId, req.body);
    res.json({ status: "success", data, message: "Organization details updated successfully" });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

// Audit logs (admin only) - for audit trail feature (future use)
exports.getAuditLogs = async (req, res) => {
  try {
    const data = await adminService.getAuditLogs(req.db, req.user.tenantId);
    if (!data || data.length === 0) {
      return res.status(404).json({ status: "error", message: "No audit logs found" });
    }
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};
