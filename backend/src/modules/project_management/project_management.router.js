const express = require("express");
const ctrl = require("./project_management.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const requirePermission = require("../../middleware/requirePermission");
const planGuard = require("../../middleware/planGuard");

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
 * CLIENT ROUTES (Elite Only)
 * ============================================================================
 */
router.use('/clients', planGuard('project.client_management'));

/**
 * POST /api/project-management/clients
 * Create a new client
 */
router.post(
  "/clients",
  verifyJwt,
  requirePermission("projects", "create"),
  validate(createClientSchema),
  ctrl.createClient
);

/**
 * GET /api/project-management/clients
 * List all clients
 */
router.get(
  "/clients",
  verifyJwt,
  requirePermission("projects", "view"),
  validate(listClientsSchema),
  ctrl.listClients
);

/**
 * PUT /api/project-management/clients/:id
 * Update a client
 */
router.put(
  "/clients/:id",
  verifyJwt,
  requirePermission("projects", "update"),
  validate(updateClientSchema),
  ctrl.updateClient
);

/**
 * DELETE /api/project-management/clients/:id
 * Delete a client
 */
router.delete(
  "/clients/:id",
  verifyJwt,
  requirePermission("projects", "delete"),
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
 */
router.post(
  "/",
  verifyJwt,
  requirePermission("projects", "create"),
  validate(createProjectSchema),
  ctrl.createProject
);

/**
 * GET /api/project-management/projects
 * List all projects
 */
router.get(
  "/",
  verifyJwt,
  requirePermission("projects", "view"),
  validate(listProjectsSchema),
  ctrl.listProjects
);

/**
 * PUT /api/project-management/projects/:id
 * Update a project
 */
router.put(
  "/:id",
  verifyJwt,
  requirePermission("projects", "update"),
  validate(updateProjectSchema),
  ctrl.updateProject
);

/**
 * DELETE /api/project-management/projects/:id
 * Delete a project
 */
router.delete(
  "/:id",
  verifyJwt,
  requirePermission("projects", "delete"),
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
 */
router.post(
  "/:id/members",
  verifyJwt,
  requirePermission("projects", "manage_members"),
  validate(addProjectMemberSchema),
  ctrl.addProjectMember
);

/**
 * GET /api/project-management/projects/:id/members
 * List all members of a project
 */
router.get(
  "/:id/members",
  verifyJwt,
  requirePermission("projects", "view"),
  validate(listProjectMembersSchema),
  ctrl.listProjectMembers
);

/**
 * DELETE /api/project-management/projects/:id/members/:employee_id
 * Remove a member from project
 */
router.delete(
  "/:id/members/:employee_id",
  verifyJwt,
  requirePermission("projects", "manage_members"),
  validate(removeProjectMemberSchema),
  ctrl.removeProjectMember
);

/**
 * ============================================================================
 * KANBAN BOARD ROUTES (Premium+)
 * ============================================================================
 */
router.use('/projects/:project_id/board', planGuard('project.task_board'));

/**
 * GET /api/project-management/projects/:project_id/board/exists
 * Check if Kanban board exists for a project
 */
router.get(
  "/projects/:project_id/board/exists",
  verifyJwt,
  requirePermission("projects", "view_kanban"),
  validate(getKanbanBoardSchema),
  ctrl.checkKanbanExists
);

/**
 * POST /api/project-management/projects/:project_id/board/setup
 * Create Kanban board for a project (initial setup)
 */
router.post(
  "/projects/:project_id/board/setup",
  verifyJwt,
  requirePermission("projects", "manage_kanban"),
  validate(createKanbanBoardSchema),
  ctrl.createKanbanBoard
);

/**
 * GET /api/project-management/projects/:project_id/board
 * Get Kanban board configuration and tasks
 */
router.get(
  "/projects/:project_id/board",
  verifyJwt,
  requirePermission("projects", "view_kanban"),
  validate(getKanbanBoardSchema),
  ctrl.getKanbanBoard
);

/**
 * PUT /api/project-management/projects/:project_id/board
 * Update Kanban board configuration (add/remove/rename columns)
 */
router.put(
  "/projects/:project_id/board",
  verifyJwt,
  requirePermission("projects", "manage_kanban"),
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
 */
router.post(
  "/tasks",
  verifyJwt,
  requirePermission("projects", "create"),
  validate(createTaskSchema),
  ctrl.createTask
);

/**
 * GET /api/project-management/tasks
 * List tasks with optional filters
 */
router.get(
  "/tasks",
  verifyJwt,
  requirePermission("projects", "view"),
  validate(listTasksSchema),
  ctrl.listTasks
);

/**
 * PUT /api/project-management/tasks/:id
 * Update a task
 */
router.put(
  "/tasks/:id",
  verifyJwt,
  requirePermission("projects", "view"),
  validate(updateTaskSchema),
  ctrl.updateTask
);

/**
 * PATCH /api/project-management/tasks/:id/column
 * Move task to another column
 */
router.patch(
  "/tasks/:id/column",
  verifyJwt,
  requirePermission("projects", "view_kanban"),
  validate(updateTaskColumnSchema),
  ctrl.updateTaskColumn
);

/**
 * DELETE /api/project-management/tasks/:id
 * Delete a task
 */
router.delete(
  "/tasks/:id",
  verifyJwt,
  requirePermission("projects", "view"),
  validate(updateTaskSchema),
  ctrl.deleteTask
);

/**
 * ============================================================================
 * TIMESHEET ROUTES (Premium+)
 * ============================================================================
 */
router.use('/timesheets', planGuard('project.timesheets'));

/**
 * POST /api/project-management/timesheets/entry
 * Add or update a timesheet entry (EMPLOYEE/MANAGER/HR/ADMIN)
 */
router.post(
  "/timesheets/entry",
  verifyJwt,
  requirePermission("projects", "view"),
  validate(addTimesheetEntrySchema),
  ctrl.addTimesheetEntry
);

/**
 * GET /api/project-management/timesheets/my-entries
 * Get my timesheet entries
 */
router.get(
  "/timesheets/my-entries",
  verifyJwt,
  requirePermission("projects", "view"),
  validate(listTimesheetEntriesSchema),
  ctrl.getMyTimesheetEntries
);

/**
 * POST /api/project-management/timesheets
 * Create a new timesheet with entries
 */
router.post(
  "/timesheets",
  verifyJwt,
  requirePermission("projects", "view"),
  validate(createTimesheetSchema),
  ctrl.createTimesheet
);

/**
 * GET /api/project-management/timesheets
 * List all timesheets (for managers/admins)
 */
router.get(
  "/timesheets",
  verifyJwt,
  requirePermission("projects", "manage_timesheets"),
  validate(listTimesheetsSchema),
  ctrl.listTimesheets
);


/**
 * GET /api/project-management/timesheets/my
 * Get my timesheets
 */
router.get(
  "/timesheets/my",
  verifyJwt,
  requirePermission("projects", "view"),
  validate(listTimesheetsSchema),
  ctrl.getMyTimesheets
);

/**
 * GET /api/project-management/timesheets/pending-approvals
 * Get pending timesheet approvals
 */
router.get(
  "/timesheets/pending-approvals",
  verifyJwt,
  requirePermission("projects", "approve_timesheets"),
  ctrl.getPendingApprovals
);

/**
 * POST /api/project-management/timesheets/bulk-approve
 * Bulk approve timesheets
 */
router.post(
  "/timesheets/bulk-approve",
  verifyJwt,
  requirePermission("projects", "approve_timesheets"),
  ctrl.bulkApproveTimesheets
);

/**
 * PUT /api/project-management/timesheets/:id/submit
 * Submit a timesheet
 */
router.put(
  "/timesheets/:id/submit",
  verifyJwt,
  requirePermission("projects", "view"),
  validate(submitTimesheetSchema),
  ctrl.submitTimesheet
);

/**
 * PUT /api/project-management/timesheets/:id/approve
 * Approve a timesheet
 */
router.put(
  "/timesheets/:id/approve",
  verifyJwt,
  requirePermission("projects", "approve_timesheets"),
  validate(approveTimesheetSchema),
  ctrl.approveTimesheet
);

/**
 * PUT /api/project-management/timesheets/:id/reject
 * Reject a timesheet
 */
router.put(
  "/timesheets/:id/reject",
  verifyJwt,
  requirePermission("projects", "approve_timesheets"),
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
 */
router.get(
  "/reports/project/:project_id",
  verifyJwt,
  requirePermission("projects", "view_reports"),
  validate(getProjectReportSchema),
  ctrl.getProjectReport
);

/**
 * GET /api/project-management/reports/client/:client_id
 * Get client-wise hours report
 */
router.get(
  "/reports/client/:client_id",
  verifyJwt,
  requirePermission("projects", "view_reports"),
  validate(getClientReportSchema),
  ctrl.getClientReport
);

/**
 * GET /api/project-management/reports/utilization
 * Get employee utilization report
 */
router.get(
  "/reports/utilization",
  verifyJwt,
  requirePermission("projects", "view_reports"),
  validate(getUtilizationReportSchema),
  ctrl.getUtilizationReport
);

/**
 * ============================================================================
 * TASK COMMENT ROUTES (Viewable by anyone with project view access)
 * ============================================================================
 */

/**
 * POST /api/project-management/tasks/:task_id/comments
 * Create a comment on a task
 */
router.post(
  "/tasks/:task_id/comments",
  verifyJwt,
  requirePermission("projects", "view"),
  ctrl.createComment
);

/**
 * GET /api/project-management/tasks/:task_id/comments
 * List comments for a task
 */
router.get(
  "/tasks/:task_id/comments",
  verifyJwt,
  requirePermission("projects", "view"),
  ctrl.listComments
);

/**
 * PUT /api/project-management/tasks/comments/:comment_id
 * Update a comment
 */
router.put(
  "/tasks/comments/:comment_id",
  verifyJwt,
  requirePermission("projects", "view"),
  ctrl.updateComment
);

/**
 * DELETE /api/project-management/tasks/comments/:comment_id
 * Delete a comment
 */
router.delete(
  "/tasks/comments/:comment_id",
  verifyJwt,
  requirePermission("projects", "view"),
  ctrl.deleteComment
);

/**
 * GET /api/project-management/projects/:project_id/mentionable-users
 * Get users that can be @mentioned in a project
 */
router.get(
  "/projects/:project_id/mentionable-users",
  verifyJwt,
  requirePermission("projects", "view"),
  ctrl.getMentionableUsers
);

/**
 * GET /api/project-management/dashboard/stats
 * Get dashboard aggregated stats
 */
router.get(
  "/dashboard/stats",
  verifyJwt,
  requirePermission("projects", "view"),
  ctrl.getDashboardStats
);

module.exports = router;
