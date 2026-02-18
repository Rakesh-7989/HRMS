const express = require("express");
const ctrl = require("./project_management.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");
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
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
  listCommentsSchema,
  getMentionableUsersSchema,
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requirePermission("projects.view"),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requirePermission("projects.view"),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requirePermission("projects.view"),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requirePermission("projects.view"),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requirePermission("projects.view"),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requirePermission("projects.view"),
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
  requirePermission("projects.view"),
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
  requirePermission("projects.view"),
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
  requirePermission("projects.view"),
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
  requirePermission("projects.view"),
  validate(addTimesheetEntrySchema),
  ctrl.addTimesheetEntry
);

/**
 * GET /api/project-management/timesheets/my-entries
 * Get my timesheet entries
 * Requires: ADMIN, HR, EMPLOYEE
 */
router.get(
  "/timesheets/my-entries",
  verifyJwt,
  requirePermission("projects.view"),
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
  requirePermission("projects.view"),
  validate(createTimesheetSchema),
  ctrl.createTimesheet
);

/**
 * GET /api/project-management/timesheets/my
 * Get my timesheets
 * Requires: ADMIN, HR, EMPLOYEE
 * Note: This route must be before /:id routes
 */
router.get(
  "/timesheets/my",
  verifyJwt,
  requirePermission("projects.view"),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requirePermission("projects.view"),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
  validate(getProjectReportSchema),
  ctrl.getProjectReport
);

/**
 * GET /api/project-management/reports/client/:client_id
 * Get client-wise hours report
 * Requires: ADMIN, HR
 */
router.get(
  "/reports/client/:client_id",
  verifyJwt,
  requirePermission("projects.manage"),
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
  requireAnyPermission(["projects.manage", "projects.view"]),
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
  requirePermission("projects.view"),
  validate(createCommentSchema),
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
  requirePermission("projects.view"),
  validate(listCommentsSchema),
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
  requirePermission("projects.view"),
  validate(updateCommentSchema),
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
  requirePermission("projects.view"),
  validate(deleteCommentSchema),
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
  requirePermission("projects.view"),
  validate(getMentionableUsersSchema),
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
