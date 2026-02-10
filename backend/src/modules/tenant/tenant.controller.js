
const tenantService = require("./tenant.service");

exports.registerTenant = async (req, res) => {
  try {
    // Check if email is verified first
    const isVerified = await tenantService.checkEmailVerified(req.body.email);
    if (!isVerified) {
      return res.status(400).json({
        status: "error",
        message: "Email not verified. Please verify your email first."
      });
    }

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

exports.sendOtp = async (req, res) => {
  try {
    const { email, domain, phone } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required"
      });
    }

    const result = await tenantService.sendVerificationOtp(email, domain, phone);

    res.json({
      status: "success",
      message: result.message
    });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message || "Failed to send OTP"
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        status: "error",
        message: "Email and code are required"
      });
    }

    const result = await tenantService.verifyOtp(email, code);

    res.json({
      status: "success",
      verified: result.verified
    });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message || "Failed to verify OTP"
    });
  }
};

// ========================================================================
// EMPLOYEE ID SETTINGS ENDPOINTS
// ========================================================================

/**
 * Get employee ID settings for the current tenant
 */
exports.getEmployeeIdSettings = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        status: "error",
        message: "Tenant ID is required"
      });
    }

    const settings = await tenantService.getEmployeeIdSettings(tenantId);

    res.json({
      status: "success",
      data: settings
    });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message || "Failed to get employee ID settings"
    });
  }
};

/**
 * Set employee ID prefix for the current tenant
 */
exports.setEmployeeIdPrefix = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { prefix } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        status: "error",
        message: "Tenant ID is required"
      });
    }

    // Only ADMIN can set the prefix
    if (!["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Only Admin can configure employee ID prefix"
      });
    }

    const result = await tenantService.setEmployeeIdPrefix(tenantId, prefix);

    res.json({
      status: "success",
      data: result
    });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message || "Failed to set employee ID prefix"
    });
  }
};
