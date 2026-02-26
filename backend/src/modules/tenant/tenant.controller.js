
const tenantService = require("./tenant.service");
const { deleteFile } = require("../../utils/fileUpload");
const path = require("path");

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

    // ADMIN and HR can set the prefix
    if (!req.user.permissions.includes('manage_organization') && !req.user.permissions.includes('platform.manage_tenants')) {
      return res.status(403).json({
        status: "error",
        message: "Only Admin  can configure employee ID prefix"
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

/**
 * Toggle employee ID mode
 */
exports.toggleEmployeeIdMode = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { usePrefix } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        status: "error",
        message: "Tenant ID is required"
      });
    }

    const result = await tenantService.toggleEmployeeIdMode(tenantId, usePrefix);

    res.json({
      status: "success",
      data: result
    });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message || "Failed to toggle employee ID mode"
    });
  }
};

exports.getTenantProfile = async (req, res) => {
  try {
    const data = await tenantService.getTenantProfile(req.user.tenantId);
    res.json({ status: "success", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.updateTenantProfile = async (req, res) => {
  try {
    const data = await tenantService.updateTenantProfile(req.user.tenantId, req.body);
    res.json({ status: "success", data, message: "Organization details updated successfully" });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const filePath = `/uploads/documents/${req.file.filename}`;
    const result = await tenantService.updateTenantLogo(req.user.tenantId, filePath);

    // If there was an old logo, try to delete the file
    if (result.oldLogoUrl) {
      try {
        const projectRoot = process.cwd();
        let oldPath = "";

        if (result.oldLogoUrl.startsWith('/uploads')) {
          oldPath = path.join(projectRoot, result.oldLogoUrl);
        } else if (result.oldLogoUrl.includes('uploads')) {
          const relativePart = result.oldLogoUrl.substring(result.oldLogoUrl.indexOf('uploads'));
          oldPath = path.join(projectRoot, relativePart);
        }

        if (oldPath) {
          deleteFile(oldPath);
        }
      } catch (e) {
        console.error('Failed to delete old logo file:', e);
      }
    }

    res.json({
      status: 'success',
      message: 'Logo uploaded successfully',
      data: { logo_url: filePath }
    });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.deleteLogo = async (req, res) => {
  try {
    const result = await tenantService.updateTenantLogo(req.user.tenantId, null);

    // Try to delete the old file
    if (result.oldLogoUrl) {
      try {
        const projectRoot = process.cwd();
        let oldPath = "";

        if (result.oldLogoUrl.startsWith('/uploads')) {
          oldPath = path.join(projectRoot, result.oldLogoUrl);
        } else if (result.oldLogoUrl.includes('uploads')) {
          const relativePart = result.oldLogoUrl.substring(result.oldLogoUrl.indexOf('uploads'));
          oldPath = path.join(projectRoot, relativePart);
        }

        if (oldPath) {
          deleteFile(oldPath);
        }
      } catch (e) {
        console.error('Failed to delete old logo file:', e);
      }
    }

    res.json({
      status: 'success',
      message: 'Logo removed successfully',
      data: { logo_url: null }
    });
  } catch (err) {
    console.error('Logo delete error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};


exports.getAllTenants = async (req, res) => {
  try {
    const tenants = await tenantService.getAllTenants();
    res.json({ status: "success", tenants });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getPlatformTenantById = async (req, res) => {
  try {
    const tenant = await tenantService.getTenantById(req.params.id);
    res.json({ status: "success", tenant });
  } catch (err) {
    res.status(404).json({ status: "error", message: err.message });
  }
};

exports.activateTenant = async (req, res) => {
  try {
    const data = await tenantService.updatePlatformTenantStatus(req.params.id, true);
    res.json({ status: "success", data, message: "Tenant activated successfully" });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.deactivateTenant = async (req, res) => {
  try {
    const data = await tenantService.updatePlatformTenantStatus(req.params.id, false);
    res.json({ status: "success", data, message: "Tenant deactivated successfully" });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.getUsersByTenant = async (req, res) => {
  try {
    const users = await tenantService.getUsersByTenant(req.params.id);
    res.json({ status: "success", users });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getPlatformTenantEmployeeCount = async (req, res) => {
  try {
    const count = await tenantService.getPlatformTenantEmployeeCount(req.params.id);
    res.json({ status: "success", count });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
