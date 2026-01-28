const userService = require("./user.service");
const logAudit = require('../../utils/auditLogger');

exports.createUser = async (req, res) => {
  try {
    const result = await userService.createUser(req.db, req.body, req.user);

    // Audit Log
    try {
      await logAudit(req, 'users', result.user.id, 'CREATE', null, { email: result.user.email, role: result.user.role });
    } catch (e) {
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
    const user = await userService.getUserById(req.db, req.params.id, req.user.tenantId);
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
    const result = await userService.changeRole(req.db, req.params.id, req.body.role, req.user);
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
    const result = await userService.deactivateUser(req.db, req.params.id, req.user);
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
    const result = await userService.softDeleteUser(req.db, req.params.id, req.user);
    res.json({ status: "success", message: result.message });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.terminateEmployee = async (req, res) => {
  try {
    const result = await userService.terminateEmployee(req.db, req.params.id, req.body, req.user);
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
    } catch (e) { console.error(e); }

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

