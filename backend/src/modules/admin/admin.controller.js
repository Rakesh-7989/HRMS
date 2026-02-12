const adminService = require("./admin.service");
const { deleteFile } = require("../../utils/fileUpload");
const path = require("path");

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

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    // Construct public URL
    // Assumption: uploaded to uploads/documents or uploads/profile-pictures based on middleware
    // fileUpload.js logic puts it in 'documents' by default or 'profile-pictures' if type is profile
    // I will use uploadImage middleware which I assume I will use in router.

    // Check fileUpload.js: storage destination depends on req.uploadType.
    // If I use uploadImage middleware, I should see where it goes.
    // It goes to DOCUMENTS_DIR by default unless req.uploadType is 'profile'.
    // Let's assume standard serving path /uploads/documents/filename

    // However, the router should probably set req.uploadType = 'profile' if we want it there, or just keep it in documents.
    // Let's keep it simple: /uploads/documents/filename

    const filePath = `/uploads/documents/${req.file.filename}`;
    const result = await adminService.updateTenantLogo(req.db, req.user.tenantId, filePath);

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
    const result = await adminService.updateTenantLogo(req.db, req.user.tenantId, null);

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
