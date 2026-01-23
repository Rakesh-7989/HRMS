
const tenantService = require("./tenant.service");

exports.registerTenant = async (req, res) => {
  try {
    const result = await tenantService.registerTenant(req.body, req);

    res.status(201).json({
      status: "success",
      message: "Tenant registered. Temporary password sent to admin email.",
      data: {
        tenantId: result.tenant.id,
        adminUserId: result.adminUser.id,
        adminEmail: result.adminUser.email
      }
    });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message || "Failed to register tenant"
    });
  }
};
