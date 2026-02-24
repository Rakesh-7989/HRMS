const express = require("express");
const ctrl = require("./project_management.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");

const {
  createClientSchema,
  updateClientSchema,
  listClientsSchema,
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
  addProjectMemberSchema,
  listProjectMembersSchema,
  removeProjectMemberSchema,
  getKanbanBoardSchema,
  createKanbanBoardSchema,
  updateKanbanBoardSchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskColumnSchema,
  listTasksSchema,
  createTimesheetSchema,
  addTimesheetEntrySchema,
  submitTimesheetSchema,
  approveTimesheetSchema,
  rejectTimesheetSchema,
  listTimesheetsSchema,
  listTimesheetEntriesSchema,
  getProjectReportSchema,
  getClientReportSchema,
  getUtilizationReportSchema,
} = require("./project_management.validator");

const router = express.Router();

/**
 * ============================================================================
 * CLIENT ROUTES
 * ============================================================================
 */

/**
 * POST /api/project-management/clients
 * Create a new client
 * Requires: ADMIN, HR
 */
router.post(
  "/clients",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(createClientSchema),
  ctrl.createClient
);

/**
 * GET /api/project-management/clients
 * List all clients with optional filters
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
router.get(
  "/clients",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(listClientsSchema),
  ctrl.listClients
);

/**
 * PUT /api/project-management/clients/:id
 * Update a client
 * Requires: ADMIN, HR
 */
router.put(
  "/clients/:id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(updateClientSchema),
  ctrl.updateClient
);

/**
 * DELETE /api/project-management/clients/:id
 * Delete a client
 * Requires: ADMIN, HR
 */
router.delete(
  "/clients/:id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(updateClientSchema),
  ctrl.deleteClient
);

/**
 * ============================================================================
 * PROJECT ROUTES
 * ============================================================================
 */

/**
 * POST /api/project-management/projects
 * Create a new project
 * Requires: ADMIN, HR
 */
router.post(
  "/",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(createProjectSchema),
  ctrl.createProject
);

/**
 * GET /api/project-management/projects
 * List all projects with optional filters
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
router.get(
  "/",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(listProjectsSchema),
  ctrl.listProjects
);

/**
 * PUT /api/project-management/projects/:id
 * Update a project
 * Requires: ADMIN, HR
 */
router.put(
  "/:id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(updateProjectSchema),
  ctrl.updateProject
);

/**
 * DELETE /api/project-management/projects/:id
 * Delete a project
 * Requires: ADMIN, HR
 */
router.delete(
  "/:id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(updateProjectSchema),
  ctrl.deleteProject
);

/**
 * ============================================================================
 * PROJECT MEMBERSHIP ROUTES
 * ============================================================================
 */

/**
 * POST /api/project-management/projects/:id/members
 * Add a member to project
 * Requires: ADMIN, HR
 */
router.post(
  "/:id/members",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(addProjectMemberSchema),
  ctrl.addProjectMember
);

/**
 * GET /api/project-management/projects/:id/members
 * List all members of a project
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
router.get(
  "/:id/members",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(listProjectMembersSchema),
  ctrl.listProjectMembers
);

/**
 * DELETE /api/project-management/projects/:id/members/:employee_id
 * Remove a member from project
 * Requires: ADMIN, HR
 */
router.delete(
  "/:id/members/:employee_id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(removeProjectMemberSchema),
  ctrl.removeProjectMember
);

/**
 * ============================================================================
 * KANBAN BOARD ROUTES
 * ============================================================================
 */

/**
 * GET /api/project-management/projects/:project_id/board/exists
 * Check if Kanban board exists for a project
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
router.get(
  "/projects/:project_id/board/exists",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(getKanbanBoardSchema),
  ctrl.checkKanbanExists
);

/**
 * POST /api/project-management/projects/:project_id/board/setup
 * Create Kanban board for a project (initial setup)
 * Requires: ADMIN, HR, MANAGER
 */
router.post(
  "/projects/:project_id/board/setup",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(createKanbanBoardSchema),
  ctrl.createKanbanBoard
);

/**
 * GET /api/project-management/projects/:project_id/board
 * Get Kanban board configuration and tasks
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
router.get(
  "/projects/:project_id/board",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(getKanbanBoardSchema),
  ctrl.getKanbanBoard
);

/**
 * PUT /api/project-management/projects/:project_id/board
 * Update Kanban board configuration (add/remove/rename columns)
 * Requires: ADMIN, HR, MANAGER
 */
router.put(
  "/projects/:project_id/board",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(updateKanbanBoardSchema),
  ctrl.updateKanbanBoard
);

/**
 * ============================================================================
 * TASK ROUTES
 * ============================================================================
 */

/**
 * POST /api/project-management/tasks
 * Create a new task
 * Requires: ADMIN, HR, MANAGER
 */
router.post(
  "/tasks",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(createTaskSchema),
  ctrl.createTask
);

/**
 * GET /api/project-management/tasks
 * List tasks with optional filters
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
router.get(
  "/tasks",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(listTasksSchema),
  ctrl.listTasks
);

/**
 * PUT /api/project-management/tasks/:id
 * Update a task
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (creator only - checked in service)
 */
router.put(
  "/tasks/:id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(updateTaskSchema),
  ctrl.updateTask
);

/**
 * PATCH /api/project-management/tasks/:id/column
 * Move task to another column
 * Requires: ADMIN, HR, MANAGER
 */
router.patch(
  "/tasks/:id/column",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(updateTaskColumnSchema),
  ctrl.updateTaskColumn
);

/**
 * DELETE /api/project-management/tasks/:id
 * Delete a task
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (creator only - checked in service)
 */
router.delete(
  "/tasks/:id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(updateTaskSchema),
  ctrl.deleteTask
);

/**
 * ============================================================================
 * TIMESHEET ROUTES
 * ============================================================================
 */

/**
 * POST /api/project-management/timesheets/entry
 * Add or update a timesheet entry
 * Requires: ADMIN, HR, EMPLOYEE
 */
router.post(
  "/timesheets/entry",
  verifyJwt,
  requireRole(["HR", "EMPLOYEE", "MANAGER"]),
  validate(addTimesheetEntrySchema),
  ctrl.addTimesheetEntry
);

/**
 * GET /api/project-management/timesheets/my-entries
 * Get my timesheet entries
 * Requires: ADMIN, HR, EMPLOYEE, MANAGER
 */
router.get(
  "/timesheets/my-entries",
  verifyJwt,
  requireRole(["ADMIN", "HR", "EMPLOYEE", "MANAGER"]),
  validate(listTimesheetEntriesSchema),
  ctrl.getMyTimesheetEntries
);

/**
 * POST /api/project-management/timesheets
 * Create a new timesheet with entries
 * Requires: ADMIN, HR, EMPLOYEE
 */
router.post(
  "/timesheets",
  verifyJwt,
  requireRole(["MANAGER", "HR", "EMPLOYEE"]),
  validate(createTimesheetSchema),
  ctrl.createTimesheet
);

/**
 * GET /api/project-management/timesheets
 * List all timesheets (for managers/admins)
 * Requires: ADMIN, HR, MANAGER
 * Note: This route must be before /:id routes
 */
router.get(
  "/timesheets",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(listTimesheetsSchema),
  ctrl.listTimesheets
);


/**
 * GET /api/project-management/timesheets/my
 * Get my timesheets
 * Requires: ADMIN, HR, EMPLOYEE, MANAGER
 * Note: This route must be before /:id routes
 */
router.get(
  "/timesheets/my",
  verifyJwt,
  requireRole(["ADMIN", "HR", "EMPLOYEE", "MANAGER"]),
  validate(listTimesheetsSchema),
  ctrl.getMyTimesheets
);

/**
 * GET /api/project-management/timesheets/pending-approvals
 * Get pending timesheet approvals
 * Requires: ADMIN, HR, MANAGER
 * Note: This route must be before /:id routes
 */
router.get(
  "/timesheets/pending-approvals",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  ctrl.getPendingApprovals
);

/**
 * POST /api/project-management/timesheets/bulk-approve
 * Bulk approve timesheets
 * Requires: ADMIN, HR, MANAGER
 */
router.post(
  "/timesheets/bulk-approve",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  ctrl.bulkApproveTimesheets
);

/**
 * PUT /api/project-management/timesheets/:id/submit
 * Submit a timesheet
 * Requires: ADMIN, HR, EMPLOYEE
 */
router.put(
  "/timesheets/:id/submit",
  verifyJwt,
  requireRole(["HR", "EMPLOYEE", "MANAGER"]),
  validate(submitTimesheetSchema),
  ctrl.submitTimesheet
);

/**
 * PUT /api/project-management/timesheets/:id/approve
 * Approve a timesheet
 * Requires: ADMIN, HR, MANAGER
 */
router.put(
  "/timesheets/:id/approve",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(approveTimesheetSchema),
  ctrl.approveTimesheet
);

/**
 * PUT /api/project-management/timesheets/:id/reject
 * Reject a timesheet
 * Requires: ADMIN, HR, MANAGER
 */
router.put(
  "/timesheets/:id/reject",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(rejectTimesheetSchema),
  ctrl.rejectTimesheet
);

/**
 * ============================================================================
 * REPORT ROUTES
 * ============================================================================
 */

/**
 * GET /api/project-management/reports/project/:project_id
 * Get project-wise hours report
 * Requires: ADMIN, HR, MANAGER
 */
router.get(
  "/reports/project/:project_id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(getProjectReportSchema),
  ctrl.getProjectReport
);

/**
 * GET /api/project-management/reports/client/:client_id
 * Get client-wise hours report
 * Requires: ADMIN, HR, MANAGER
 */
router.get(
  "/reports/client/:client_id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(getClientReportSchema),
  ctrl.getClientReport
);

/**
 * GET /api/project-management/reports/utilization
 * Get employee utilization report
 * Requires: ADMIN, HR, MANAGER
 */
router.get(
  "/reports/utilization",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER"]),
  validate(getUtilizationReportSchema),
  ctrl.getUtilizationReport
);

/**
 * ============================================================================
 * TASK COMMENT ROUTES
 * ============================================================================
 */

/**
 * POST /api/project-management/tasks/:task_id/comments
 * Create a comment on a task
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
router.post(
  "/tasks/:task_id/comments",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  ctrl.createComment
);

/**
 * GET /api/project-management/tasks/:task_id/comments
 * List comments for a task
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
router.get(
  "/tasks/:task_id/comments",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  ctrl.listComments
);

/**
 * PUT /api/project-management/tasks/comments/:comment_id
 * Update a comment
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (creator only - checked in service)
 */
router.put(
  "/tasks/comments/:comment_id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  ctrl.updateComment
);

/**
 * DELETE /api/project-management/tasks/comments/:comment_id
 * Delete a comment
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (creator only - checked in service)
 */
router.delete(
  "/tasks/comments/:comment_id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  ctrl.deleteComment
);

/**
 * GET /api/project-management/projects/:project_id/mentionable-users
 * Get users that can be @mentioned in a project
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
router.get(
  "/projects/:project_id/mentionable-users",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  ctrl.getMentionableUsers
);

/**
 * GET /api/project-management/dashboard/stats
 * Get dashboard aggregated stats
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
router.get(
  "/dashboard/stats",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  ctrl.getDashboardStats
);

module.exports = router;
