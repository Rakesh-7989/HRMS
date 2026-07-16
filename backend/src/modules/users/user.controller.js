const userService = require("./user.service");
const logAudit = require('../../utils/auditLogger');
const fs = require('fs');
const path = require('path');

/* REAL-TIME UNIQUENESS CHECK */
exports.checkFieldUniqueness = async (req, res) => {
  try {
    const { field, value, excludeUserId } = req.query;
    if (!field || !value) {
      return res.status(400).json({ status: "error", message: "field and value are required" });
    }
    const result = await userService.checkFieldUniqueness(
      req.db, field, value, req.user.tenantId, excludeUserId || null
    );
    res.json({ status: "success", data: result });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const result = await userService.createUser(req.db, req.body, req.user);

    // Audit Log
    try {
      await logAudit(req, 'users', result.user.id, 'CREATE', null, { email: result.user.email, role: result.user.role });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Audit failed', e);
    }

    res.status(201).json({
      status: "success",
      message: "User created successfully. Temporary password sent via email.",
      data: result
    });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers(req.db, req.query, req.user);
    if (!users || users.length === 0) {
      return res.status(200).json({ status: "success", users: [] });
    }
    res.json({ status: "success", users });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const unmask = req.query.unmask === 'true';
    const user = await userService.getUserById(req.db, req.params.id, req.user.tenantId, req.user, { unmask });
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });

    res.json({ status: "success", user });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updated = await userService.updateUser(req.db, req.params.id, req.body, req.user);
    res.json({ status: "success", updated });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const updated = await userService.updateEmployee(req.db, req.params.id, req.body, req.user);
    res.json({ status: "success", updated });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.changeRole = async (req, res) => {
  try {
    const oldUserRows = await req.db.query(
      'SELECT role FROM users WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenantId]
    );
    const oldRole = oldUserRows.rows[0]?.role;

    const result = await userService.changeRole(req.db, req.params.id, req.body.role, req.user);

    try {
      await logAudit(req, 'users', req.params.id, 'UPDATE_ROLE',
        { role: oldRole }, { role: result.role }
      );
    } catch (e) { // eslint-disable-next-line no-console
      console.error('Audit failed', e); }

    res.json({ status: "success", result });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.changeManager = async (req, res) => {
  try {
    const result = await userService.changeManager(req.db, req.params.id, req.body.manager_employee_id, req.user);
    res.json({ status: "success", result });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.assignDepartment = async (req, res) => {
  try {
    const result = await userService.assignDepartment(req.db, req.params.id, req.body.department_id, req.user);
    res.json({ status: "success", result });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.assignDesignation = async (req, res) => {
  try {
    const result = await userService.assignDesignation(req.db, req.params.id, req.body.designation_id, req.user);
    res.json({ status: "success", result });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const oldUserRows = await req.db.query(
      'SELECT is_active FROM users WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenantId]
    );
    const wasActive = oldUserRows.rows[0]?.is_active;

    const result = await userService.deactivateUser(req.db, req.params.id, req.user);

    try {
      await logAudit(req, 'users', req.params.id, 'DEACTIVATE_USER',
        { is_active: wasActive }, { is_active: false }
      );
    } catch (e) { // eslint-disable-next-line no-console
      console.error('Audit failed', e); }

    res.json({ status: "success", result });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.activateUser = async (req, res) => {
  try {
    const result = await userService.activateUser(req.db, req.params.id, req.user);
    res.json({ status: "success", result });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const result = await userService.updateUserStatus(req.db, req.params.id, req.body.is_active, req.user);
    res.json({ status: "success", result });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    const oldUserRows = await req.db.query(
      'SELECT is_active, is_deleted FROM users WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenantId]
    );
    const oldData = oldUserRows.rows[0] || {};

    const result = await userService.softDeleteUser(req.db, req.params.id, req.user);

    try {
      await logAudit(req, 'users', req.params.id, 'DELETE_USER',
        oldData, { is_active: false, is_deleted: true }
      );
    } catch (e) { // eslint-disable-next-line no-console
      console.error('Audit failed', e); }

    res.json({ status: "success", message: result.message });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.terminateEmployee = async (req, res) => {
  try {
    const oldUserRows = await req.db.query(
      'SELECT is_active, is_deleted FROM users WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenantId]
    );
    const oldData = oldUserRows.rows[0] || {};

    const result = await userService.terminateEmployee(req.db, req.params.id, req.body, req.user);

    try {
      await logAudit(req, 'users', req.params.id, 'TERMINATE_EMPLOYEE',
        oldData,
        { is_active: false, is_deleted: true, termination_reason: req.body.termination_reason }
      );
    } catch (e) { // eslint-disable-next-line no-console
      console.error('Audit failed', e); }

    res.json({ status: "success", message: result.message });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.rehireEmployee = async (req, res) => {
  try {
    const result = await userService.rehireEmployee(req.db, req.params.id, req.user);
    res.json({ status: "success", message: result.message });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const profile = await userService.getMyProfile(req.db, req.user);
    res.json({ status: "success", profile });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const updated = await userService.updateMyProfile(req.db, req.user, req.body);

    // Audit Log
    try {
      await logAudit(req, 'employees', req.user.id, 'UPDATE_PROFILE', null, req.body);
    } catch (e) { // eslint-disable-next-line no-console
      console.error(e); }

    res.json({ status: "success", updated });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      error: err.message,
      details: err.detail || err.hint || null
    });
  }
};

exports.getOrgTree = async (req, res) => {
  try {
    const tree = await userService.getOrgTree(req.db, req.user);
    res.json({ status: "success", tree });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {

    if (!req.file) {
      // eslint-disable-next-line no-console
      console.error("[uploadProfilePhoto] No file received");
      throw new Error("Please upload a file");
    }

    // Prepare filename and destination
    const ext = path.extname(req.file.originalname) || '.jpg';
    const idToUse = (req.user.empCode || req.user.id || 'unknown').toString();
    const safeId = idToUse.replace(/[^a-zA-Z0-9-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${safeId}_${dateStr}${ext}`;

    const targetDir = path.join(process.cwd(), 'uploads', 'profiles');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const finalPath = path.join(targetDir, filename);

    if (req.file.buffer) {
      // If using memoryStorage, write buffer to final destination
      fs.writeFileSync(finalPath, req.file.buffer);
    } else if (req.file.path) {
      // If using diskStorage, move/rename the file
      try {
        fs.renameSync(req.file.path, finalPath);
      } catch (mvErr) {
        // Fallback copy+unlink if across devices
        if (mvErr.code === 'EXDEV') {
          fs.copyFileSync(req.file.path, finalPath);
          fs.unlinkSync(req.file.path);
        } else {
          throw mvErr;
        }
      }
    } else {
      throw new Error("File data missing in request");
    }

    // Relative path for DB/URL
    const dbPath = `uploads/profiles/${filename}`;

    // Update DB
    const result = await userService.updateProfilePhoto(req.db, req.user.id, dbPath, req.user);

    if (!result) {
      // eslint-disable-next-line no-console
      console.error("[uploadProfilePhoto] DB Update returned no result! Checking user match...");
    }

    // Audit
    try { require('../../utils/auditLogger')(req, 'employees', req.user.id, 'UPDATE_PHOTO', null, { file: dbPath }); } catch (e) { /* no-op */ }

    res.json({ status: "success", data: result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[uploadProfilePhoto] Error:", err.message);
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.removeProfilePhoto = async (req, res) => {
  try {
    const result = await userService.removeProfilePhoto(req.db, req.user.id, req.user);

    // Audit
    try { require('../../utils/auditLogger')(req, 'employees', req.user.id, 'REMOVE_PHOTO', null, {}); } catch (e) { /* no-op */ }

    res.json({ status: "success", message: "Profile photo removed", data: result });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.bulkImportEmployees = async (req, res) => {
  try {
    if (!req.file) {
      throw new Error("Please upload an Excel file (.xlsx or .xls)");
    }

    const columnMapping = JSON.parse(req.body.mapping || '{}');

    const result = await userService.bulkImportEmployees(
      req.db,
      req.file.buffer,
      columnMapping,
      req.user
    );

    // Audit Log
    try {
      await logAudit(req, 'users', null, 'BULK_IMPORT', null, {
        total: result.total,
        success: result.success,
        failed: result.failed
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Audit failed', e);
    }

    res.status(200).json({
      status: "success",
      message: `Bulk import completed: ${result.success} succeeded, ${result.failed} failed.`,
      data: result
    });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message
    });
  }
};

// REVEAL SENSITIVE FIELD (for viewing another user's data — audit-logged)
exports.revealSensitiveField = async (req, res) => {
  try {
    const { field } = req.query;
    if (!field) {
      return res.status(400).json({ status: "error", message: "Query param 'field' is required" });
    }

    const result = await userService.revealSensitiveField(req.db, req.params.id, field, req.user);

    // Audit log the sensitive data access
    try {
      await logAudit(req, 'employees', req.params.id, 'SENSITIVE_DATA_VIEW', null, {
        field,
        viewer_role: req.user.role,
        viewer_id: req.user.id
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Audit failed for sensitive reveal', e);
    }

    res.json({ status: "success", data: result });
  } catch (err) {
    const statusCode = err.message.includes('permission') ? 403 : 400;
    res.status(statusCode).json({ status: "error", message: err.message });
  }
};

// REVEAL OWN SENSITIVE FIELD (self-service — audit-logged)
exports.revealOwnSensitiveField = async (req, res) => {
  try {
    const { field } = req.query;
    if (!field) {
      return res.status(400).json({ status: "error", message: "Query param 'field' is required" });
    }

    const result = await userService.revealSensitiveField(req.db, req.user.id, field, req.user);

    // Audit log
    try {
      await logAudit(req, 'employees', req.user.id, 'SENSITIVE_DATA_VIEW', null, {
        field,
        viewer_role: req.user.role,
        self_view: true
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Audit failed for sensitive reveal', e);
    }

    res.json({ status: "success", data: result });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};
