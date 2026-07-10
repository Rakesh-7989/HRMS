const service = require("./project_management.service");
const { success } = require("../../utils/successResponse");
const logger = require("../../config/logger");
const logAudit = require("../../utils/auditLogger");

/**
 * ============================================================================
 * CLIENT CONTROLLERS
 * ============================================================================
 */

/**
 * POST /api/project-management/clients
 * Create a new client
 * Requires: ADMIN, HR
 */
exports.createClient = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { name, email, phone, address, city, state, country, zip_code, status, notes } = req.body;

    const client = await service.createClient(tenantId, userId, {
      name,
      email,
      phone,
      address,
      city,
      state,
      country,
      zip_code,
      status,
      notes,
    });

    return res.status(201).json({
      status: 'success',
      message: "Client created successfully",
      data: client
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/clients
 * List all clients with optional filters
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
exports.listClients = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { status, search, skip, limit } = req.query;

    const result = await service.listClients(tenantId, {
      status,
      search,
      skip: skip ? parseInt(skip) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return res.status(200).json({
      status: 'success',
      message: "Clients retrieved successfully",
      data: result.clients,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/project-management/clients/:id
 * Update a client
 * Requires: ADMIN, HR
 */
exports.updateClient = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id } = req.params;
    const { name, email, phone, address, city, state, country, zip_code, status, notes } = req.body;

    const client = await service.updateClient(tenantId, userId, id, {
      name,
      email,
      phone,
      address,
      city,
      state,
      country,
      zip_code,
      status,
      notes,
    });

    return res.status(200).json({
      status: 'success',
      message: "Client updated successfully",
      data: client
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/project-management/clients/:id
 * Delete a client
 * Requires: ADMIN, HR
 */
exports.deleteClient = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const result = await service.deleteClient(tenantId, id);

    return res.status(200).json({
      status: 'success',
      message: "Client deleted successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================================
 * PROJECT CONTROLLERS
 * ============================================================================
 */

/**
 * POST /api/project-management/projects
 * Create a new project
 * Requires: ADMIN, HR
 */
exports.createProject = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { client_id, name, description, status, start_date, end_date, budget } = req.body;

    const project = await service.createProject(tenantId, userId, {
      client_id,
      name,
      description,
      status,
      start_date,
      end_date,
      budget,
    });

    // Hide budget for employees
    if (req.user.role === "EMPLOYEE") {
      delete project.budget;
    }

    return res.status(201).json({
      status: 'success',
      message: "Project created successfully",
      data: project
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/projects
 * List all projects with optional filters
 * ADMIN: sees all projects
 * EMPLOYEE, HR, MANAGER: sees only assigned projects
 */
exports.listProjects = async (req, res, next) => {
  try {
    const { tenantId, role, employeeId } = req.user;
    const { client_id, status, search, skip, limit } = req.query;

    const result = await service.listProjects(tenantId, {
      client_id,
      status,
      search,
      skip: skip ? parseInt(skip) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      // Pass user info for permission-based filtering
      userPermissions: req.user.permissions,
      userEmployeeId: employeeId,
      userId: req.user.id,
    });

    return res.status(200).json({
      status: 'success',
      message: "Projects retrieved successfully",
      data: result.projects,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/project-management/projects/:id
 * Update a project
 * Requires: ADMIN, HR
 */
exports.updateProject = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id } = req.params;
    const { name, description, status, start_date, end_date, budget } = req.body;

    const project = await service.updateProject(tenantId, userId, id, {
      name,
      description,
      status,
      start_date,
      end_date,
      budget,
    });

    // Hide budget for employees
    if (req.user.role === "EMPLOYEE") {
      delete project.budget;
    }

    return res.status(200).json({
      status: 'success',
      message: "Project updated successfully",
      data: project
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/project-management/projects/:id
 * Delete a project
 * Requires: ADMIN, HR
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const result = await service.deleteProject(tenantId, id);

    return res.status(200).json({
      status: 'success',
      message: "Project deleted successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================================
 * PROJECT MEMBERSHIP CONTROLLERS
 * ============================================================================
 */

/**
 * POST /api/project-management/projects/:id/members
 * Add a member to project
 * Requires: ADMIN, HR
 */
exports.addProjectMember = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id: projectId } = req.params;
    const { employee_id, role } = req.body;

    const member = await service.addProjectMember(tenantId, userId, projectId, employee_id, role);

    return res.status(201).json({
      status: 'success',
      message: "Member added to project successfully",
      data: member
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/projects/:id/members
 * List all members of a project
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
exports.listProjectMembers = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id: projectId } = req.params;

    const members = await service.listProjectMembers(tenantId, projectId);

    return res.status(200).json({
      status: 'success',
      message: "Project members retrieved successfully",
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/project-management/projects/:id/members/:employee_id
 * Remove a member from project
 * Requires: ADMIN, HR
 */
exports.removeProjectMember = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id: projectId, employee_id: employeeId } = req.params;

    const result = await service.removeProjectMember(tenantId, projectId, employeeId);

    return res.status(200).json({
      status: 'success',
      message: "Member removed from project successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================================
 * KANBAN BOARD CONTROLLERS
 * ============================================================================
 */

/**
 * GET /api/project-management/projects/:project_id/board/exists
 * Check if Kanban board exists for a project
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
exports.checkKanbanExists = async (req, res, next) => {
  try {
    const { tenantId, role, employeeId, id: userId } = req.user;
    const { project_id } = req.params;

    const result = await service.checkKanbanExists(tenantId, project_id, { permissions: req.user.permissions, employeeId, userId });

    return res.status(200).json({
      status: 'success',
      message: result.exists ? "Kanban board exists" : "Kanban board not found",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/project-management/projects/:project_id/board/setup
 * Create Kanban board for a project (initial setup)
 * Requires: ADMIN, HR
 */
exports.createKanbanBoard = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { project_id } = req.params;

    // Explicitly log the entire body to debug
    console.log('[Controller] Full request body:', JSON.stringify(req.body));

    const useDefault = req.body.useDefault !== undefined ? req.body.useDefault : true;
    const columns = req.body.columns || [];
    const forceReset = req.body.forceReset === true; // Explicit check

    console.log('[Controller] Extracted values:', { useDefault, columnsCount: columns.length, forceReset, project_id });

    const result = await service.createKanbanBoard(tenantId, userId, project_id, {
      useDefault,
      customColumns: columns,
      forceReset,
    });

    return res.status(201).json({
      status: 'success',
      message: "Kanban board created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/projects/:project_id/board
 * Get Kanban board configuration and tasks
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
exports.getKanbanBoard = async (req, res, next) => {
  try {
    const { tenantId, role, employeeId, id: userId } = req.user;
    const { project_id } = req.params;

    const board = await service.getKanbanBoard(tenantId, project_id, { permissions: req.user.permissions, employeeId, userId });

    return res.status(200).json({
      status: 'success',
      message: "Kanban board retrieved successfully",
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/project-management/projects/:project_id/board
 * Update Kanban board configuration (add/remove/rename columns)
 * Requires: ADMIN, HR
 */
exports.updateKanbanBoard = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { project_id } = req.params;
    const { columns } = req.body;

    const updatedColumns = await service.updateKanbanBoard(tenantId, userId, project_id, columns);

    return res.status(200).json({
      status: 'success',
      message: "Kanban board updated successfully",
      data: updatedColumns
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================================
 * TASK CONTROLLERS
 * ============================================================================
 */

/**
 * POST /api/project-management/tasks
 * Create a new task
 * Requires: ADMIN, HR, MANAGER
 */
exports.createTask = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { project_id, title, description, assigned_to, priority, column_key, due_date, estimated_hours } = req.body;

    const task = await service.createTask(tenantId, userId, {
      project_id,
      title,
      description,
      assigned_to,
      priority,
      column_key,
      due_date,
      estimated_hours,
    });

    return res.status(201).json({
      status: 'success',
      message: "Task created successfully",
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/tasks
 * List tasks with optional filters
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
exports.listTasks = async (req, res, next) => {
  try {
    const { tenantId, role, employeeId } = req.user;
    const { project_id, assigned_to, column_key, priority, search, skip, limit } = req.query;

    const result = await service.listTasks(tenantId, {
      project_id,
      assigned_to,
      column_key,
      priority,
      search,
      skip: skip ? parseInt(skip) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      userPermissions: req.user.permissions,
      userEmployeeId: employeeId,
    });

    return res.status(200).json({
      status: 'success',
      message: "Tasks retrieved successfully",
      data: result.tasks,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/project-management/tasks/:id
 * Update a task
 * Requires: ADMIN, HR, MANAGER
 */
exports.updateTask = async (req, res, next) => {
  try {
    const { tenantId, id: userId, role, employeeId } = req.user;
    const { id } = req.params;
    const { title, description, assigned_to, priority, due_date, estimated_hours } = req.body;

    const task = await service.updateTask(tenantId, userId, id, {
      title,
      description,
      assigned_to,
      priority,
      due_date,
      estimated_hours,
    }, { permissions: req.user.permissions, employeeId });

    return res.status(200).json({
      status: 'success',
      message: "Task updated successfully",
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/project-management/tasks/:id/column
 * Move task to another column
 * Requires: ADMIN, HR, MANAGER
 */
exports.updateTaskColumn = async (req, res, next) => {
  try {
    const { tenantId, id: userId, role, employeeId } = req.user;
    const { id } = req.params;
    const { column_key, order_index } = req.body;

    const task = await service.updateTaskColumn(tenantId, userId, id, column_key, order_index, { permissions: req.user.permissions, employeeId });

    return res.status(200).json({
      status: 'success',
      message: "Task moved to column successfully",
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/project-management/tasks/:id
 * Delete a task
 * Requires: ADMIN, HR, MANAGER, or task creator (EMPLOYEE)
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const { tenantId, id: userId, role } = req.user;
    const { id } = req.params;

    const result = await service.deleteTask(tenantId, id, { permissions: req.user.permissions, userId });

    return res.status(200).json({
      status: 'success',
      message: "Task deleted successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================================
 * TIMESHEET CONTROLLERS
 * ============================================================================
 */

/**
 * POST /api/project-management/timesheets/entry
 * Add or update a timesheet entry
 * Requires: ADMIN, HR, EMPLOYEE
 */
exports.addTimesheetEntry = async (req, res, next) => {
  try {
    const { tenantId, id: userId, employeeId } = req.user;
    const { project_id, task_id, work_date, hours, notes } = req.body;

    const entry = await service.addTimesheetEntry(tenantId, userId, employeeId, {
      project_id,
      task_id,
      work_date,
      hours,
      notes,
    });

    return res.status(201).json({
      status: 'success',
      message: "Timesheet entry logged successfully",
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/timesheets/my-entries
 * Get my timesheet entries (flattened)
 * Requires: ADMIN, HR, EMPLOYEE
 */
exports.getMyTimesheetEntries = async (req, res, next) => {
  try {
    const { tenantId, employeeId } = req.user;
    const { project_id, week_start_date, start_date, end_date, limit, offset } = req.query;

    const result = await service.getMyTimesheetEntries(tenantId, employeeId, {
      project_id,
      week_start_date,
      start_date,
      end_date,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return res.status(200).json({
      status: 'success',
      message: "Timesheet entries retrieved successfully",
      data: result.entries,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/project-management/timesheets
 * Create a new timesheet with entries
 * Requires: ADMIN, HR, EMPLOYEE
 */
exports.createTimesheet = async (req, res, next) => {
  try {
    const { tenantId, id: userId, employeeId } = req.user;
    const { project_id, week_start_date, week_end_date, entries, status } = req.body;

    const timesheet = await service.createTimesheet(tenantId, userId, employeeId, {
      project_id,
      week_start_date,
      week_end_date,
      entries,
      status,
    });

    return res.status(201).json({
      status: 'success',
      message: "Timesheet created successfully",
      data: timesheet
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/timesheets/my
 * Get my timesheets
 * Requires: ADMIN, HR, EMPLOYEE
 */
exports.getMyTimesheets = async (req, res, next) => {
  try {
    const { tenantId, employeeId } = req.user;
    const { project_id, status, week_start_date, skip, limit } = req.query;

    const result = await service.getMyTimesheets(tenantId, employeeId, {
      project_id,
      status,
      week_start_date,
      skip: skip ? parseInt(skip) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return res.status(200).json({
      status: 'success',
      message: "My timesheets retrieved successfully",
      data: result.timesheets,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/timesheets/pending-approvals
 * Get pending timesheet approvals
 * Requires: ADMIN, HR, MANAGER
 */
exports.getPendingApprovals = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { skip, limit } = req.query;

    const result = await service.getPendingApprovals(tenantId, userId, {
      skip: skip ? parseInt(skip) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return res.status(200).json({
      status: 'success',
      message: "Pending approvals retrieved successfully",
      data: result.timesheets,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/timesheets
 * List all timesheets (for managers/admins)
 * Requires: ADMIN, HR, MANAGER
 */
exports.listTimesheets = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { employee_id, project_id, status, week_start_date, skip, limit } = req.query;

    const result = await service.listTimesheets(tenantId, userId, {
      employee_id,
      project_id,
      status,
      week_start_date,
      skip: skip ? parseInt(skip) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return res.status(200).json({
      status: 'success',
      message: "Timesheets retrieved successfully",
      data: result.timesheets,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * POST /api/project-management/timesheets/:id/submit
 * Submit a timesheet
 * Requires: EMPLOYEE
 */
exports.submitTimesheet = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id } = req.params;

    const timesheet = await service.submitTimesheet(tenantId, userId, id);

    // Track in audit log
    await logAudit(req, 'timesheets', id, 'SUBMIT', null, { status: 'SUBMITTED' });

    return res.status(200).json({
      status: 'success',
      message: "Timesheet submitted successfully",
      data: timesheet
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/project-management/timesheets/bulk-approve
 * Bulk approve timesheets
 * Requires: ADMIN, HR, MANAGER
 */
exports.bulkApproveTimesheets = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { timesheetIds } = req.body;

    const result = await service.bulkApproveTimesheets(tenantId, userId, timesheetIds);

    // Filter successful IDs to log
    const successfulIds = result.results;
    for (const id of successfulIds) {
      await logAudit(req, 'timesheets', id, 'APPROVE (BULK)', { status: 'SUBMITTED' }, { status: 'APPROVED' });
    }

    return res.status(200).json({
      status: 'success',
      message: `${successfulIds.length} timesheets approved successfully`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/project-management/timesheets/:id/approve
 * Approve a timesheet
 * Requires: ADMIN, HR, MANAGER
 */
exports.approveTimesheet = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id } = req.params;

    const timesheet = await service.approveTimesheet(tenantId, userId, id);

    // Track in audit log
    await logAudit(req, 'timesheets', id, 'APPROVE', { status: 'SUBMITTED' }, { status: 'APPROVED' });

    return res.status(200).json({
      status: 'success',
      message: "Timesheet approved successfully",
      data: timesheet
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/project-management/timesheets/:id/reject
 * Reject a timesheet
 * Requires: ADMIN, HR, MANAGER
 */
exports.rejectTimesheet = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const timesheet = await service.rejectTimesheet(tenantId, userId, id, rejection_reason);

    // Track in audit log
    await logAudit(req, 'timesheets', id, 'REJECT', { status: 'SUBMITTED' }, { status: 'REJECTED', reason: rejection_reason });

    return res.status(200).json({
      status: 'success',
      message: "Timesheet rejected successfully",
      data: timesheet
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================================
 * REPORT CONTROLLERS
 * ============================================================================
 */

/**
 * GET /api/project-management/reports/project/:project_id
 * Get project-wise hours report
 * Requires: ADMIN, HR, MANAGER
 */
exports.getProjectReport = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { project_id } = req.params;
    const { start_date, end_date } = req.query;

    const report = await service.getProjectReport(tenantId, project_id, {
      start_date,
      end_date,
    });

    return res.status(200).json({
      status: 'success',
      message: "Project report retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/reports/client/:client_id
 * Get client-wise hours report
 * Requires: ADMIN, HR
 */
exports.getClientReport = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { client_id } = req.params;
    const { start_date, end_date } = req.query;

    const report = await service.getClientReport(tenantId, client_id, {
      start_date,
      end_date,
    });

    return res.status(200).json({
      status: 'success',
      message: "Client report retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/reports/utilization
 * Get employee utilization report
 * Requires: ADMIN, HR, MANAGER
 */
exports.getUtilizationReport = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { start_date, end_date, skip, limit } = req.query;

    const result = await service.getUtilizationReport(tenantId, {
      start_date,
      end_date,
      skip: skip ? parseInt(skip) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return res.status(200).json({
      status: 'success',
      message: "Utilization report retrieved successfully",
      data: result.employees,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================================
 * TASK COMMENT CONTROLLERS
 * ============================================================================
 */

/**
 * POST /api/project-management/tasks/:task_id/comments
 * Create a comment on a task
 * Requires: Any authenticated user
 */
exports.createComment = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { task_id } = req.params;
    const { content, mentions } = req.body;

    const comment = await service.createComment(tenantId, userId, task_id, {
      content,
      mentions: mentions || [],
    });

    return res.status(201).json({
      status: 'success',
      message: "Comment added successfully",
      data: comment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/tasks/:task_id/comments
 * List comments for a task
 * Requires: Any authenticated user
 */
exports.listComments = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { task_id } = req.params;

    const comments = await service.listComments(tenantId, task_id);

    return res.status(200).json({
      status: 'success',
      message: "Comments retrieved successfully",
      data: comments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/project-management/tasks/comments/:comment_id
 * Update a comment
 * Requires: Comment creator or ADMIN
 */
exports.updateComment = async (req, res, next) => {
  try {
    const { tenantId, id: userId, role } = req.user;
    const { comment_id } = req.params;
    const { content, mentions } = req.body;

    const comment = await service.updateComment(tenantId, userId, comment_id, {
      content,
      mentions,
    }, { role });

    return res.status(200).json({
      status: 'success',
      message: "Comment updated successfully",
      data: comment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/project-management/tasks/comments/:comment_id
 * Delete a comment
 * Requires: Comment creator or ADMIN
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const { tenantId, id: userId, role } = req.user;
    const { comment_id } = req.params;

    const result = await service.deleteComment(tenantId, userId, comment_id, { role });

    return res.status(200).json({
      status: 'success',
      message: "Comment deleted successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/projects/:project_id/mentionable-users
 * Get users that can be @mentioned in a project
 * Requires: Any authenticated user
 */
exports.getMentionableUsers = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { project_id } = req.params;

    const users = await service.getMentionableUsers(tenantId, project_id);

    return res.status(200).json({
      status: 'success',
      message: "Mentionable users retrieved successfully",
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/project-management/dashboard/stats
 * Get dashboard aggregated stats
 * Requires: ADMIN, HR, EMPLOYEE
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const { tenantId, id: userId, employeeId, role } = req.user;

    const stats = await service.getDashboardStats(tenantId, userId, employeeId, role);

    return res.status(200).json({
      status: 'success',
      message: "Dashboard stats retrieved successfully",
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

