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
// Create new client
router.post(
  "/clients",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(createClientSchema),
  ctrl.createClient
);

// List all clients
router.get(
  "/clients",
  verifyJwt,
  requirePermission("view_projects"),
  validate(listClientsSchema),
  ctrl.listClients
);

// Update a client
router.put(
  "/clients/:id",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(updateClientSchema),
  ctrl.updateClient
);

// Delete a client
router.delete(
  "/clients/:id",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(updateClientSchema),
  ctrl.deleteClient
);

/**
 * ============================================================================
 * PROJECT ROUTES
 * ============================================================================
 */

// Create a new project
router.post(
  "/",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(createProjectSchema),
  ctrl.createProject
);

// List all projects
router.get(
  "/",
  verifyJwt,
  requirePermission("view_projects"),
  validate(listProjectsSchema),
  ctrl.listProjects
);

// Update a project
router.put(
  "/:id",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(updateProjectSchema),
  ctrl.updateProject
);

// Delete a project
router.delete(
  "/:id",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(updateProjectSchema),
  ctrl.deleteProject
);

/**
 * ============================================================================
 * PROJECT MEMBERSHIP ROUTES
 * ============================================================================
 */

// Add a member to project
router.post(
  "/:id/members",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(addProjectMemberSchema),
  ctrl.addProjectMember
);

// List all members of a project
router.get(
  "/:id/members",
  verifyJwt,
  requirePermission("view_projects"),
  validate(listProjectMembersSchema),
  ctrl.listProjectMembers
);

// Remove a member from project
router.delete(
  "/:id/members/:employee_id",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(removeProjectMemberSchema),
  ctrl.removeProjectMember
);

/**
 * ============================================================================
 * KANBAN BOARD ROUTES
 * ============================================================================
 */

// Check if Kanban board exists for a project
router.get(
  "/projects/:project_id/board/exists",
  verifyJwt,
  requirePermission("view_projects"),
  validate(getKanbanBoardSchema),
  ctrl.checkKanbanExists
);

// Create Kanban board for a project (initial setup)
router.post(
  "/projects/:project_id/board/setup",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(createKanbanBoardSchema),
  ctrl.createKanbanBoard
);

// Get Kanban board configuration and tasks
router.get(
  "/projects/:project_id/board",
  verifyJwt,
  requirePermission("view_projects"),
  validate(getKanbanBoardSchema),
  ctrl.getKanbanBoard
);

// Update Kanban board configuration
router.put(
  "/projects/:project_id/board",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(updateKanbanBoardSchema),
  ctrl.updateKanbanBoard
);

/**
 * ============================================================================
 * TASK ROUTES
 * ============================================================================
 */

// Create a new task
router.post(
  "/tasks",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(createTaskSchema),
  ctrl.createTask
);

// List tasks
router.get(
  "/tasks",
  verifyJwt,
  requirePermission("view_projects"),
  validate(listTasksSchema),
  ctrl.listTasks
);

// Update a task
router.put(
  "/tasks/:id",
  verifyJwt,
  requirePermission("view_projects"),
  validate(updateTaskSchema),
  ctrl.updateTask
);

// Move task to another column
router.patch(
  "/tasks/:id/column",
  verifyJwt,
  requirePermission("view_projects"),
  validate(updateTaskColumnSchema),
  ctrl.updateTaskColumn
);

// Delete a task
router.delete(
  "/tasks/:id",
  verifyJwt,
  requirePermission("view_projects"),
  validate(updateTaskSchema),
  ctrl.deleteTask
);

/**
 * ============================================================================
 * TIMESHEET ROUTES
 * ============================================================================
 */

// Add or update a timesheet entry
router.post(
  "/timesheets/entry",
  verifyJwt,
  requirePermission("view_projects"),
  validate(addTimesheetEntrySchema),
  ctrl.addTimesheetEntry
);

// Get my timesheet entries
router.get(
  "/timesheets/my-entries",
  verifyJwt,
  requirePermission("view_projects"),
  validate(listTimesheetEntriesSchema),
  ctrl.getMyTimesheetEntries
);

// Create a new timesheet with entries
router.post(
  "/timesheets",
  verifyJwt,
  requirePermission("view_projects"),
  validate(createTimesheetSchema),
  ctrl.createTimesheet
);

// Get my timesheets
router.get(
  "/timesheets/my",
  verifyJwt,
  requirePermission("view_projects"),
  validate(listTimesheetsSchema),
  ctrl.getMyTimesheets
);

// Get pending timesheet approvals
router.get(
  "/timesheets/pending-approvals",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  ctrl.getPendingApprovals
);

// Bulk approve timesheets
router.post(
  "/timesheets/bulk-approve",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  ctrl.bulkApproveTimesheets
);

// Submit a timesheet
router.put(
  "/timesheets/:id/submit",
  verifyJwt,
  requirePermission("view_projects"),
  validate(submitTimesheetSchema),
  ctrl.submitTimesheet
);

// Approve a timesheet
router.put(
  "/timesheets/:id/approve",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(approveTimesheetSchema),
  ctrl.approveTimesheet
);

// Reject a timesheet
router.put(
  "/timesheets/:id/reject",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(rejectTimesheetSchema),
  ctrl.rejectTimesheet
);

/**
 * ============================================================================
 * REPORT ROUTES
 * ============================================================================
 */

// Get project-wise hours report
router.get(
  "/reports/project/:project_id",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(getProjectReportSchema),
  ctrl.getProjectReport
);

// Get client-wise hours report
router.get(
  "/reports/client/:client_id",
  verifyJwt,
  requirePermission("manage_all_projects"),
  validate(getClientReportSchema),
  ctrl.getClientReport
);

// Get employee utilization report
router.get(
  "/reports/utilization",
  verifyJwt,
  requireAnyPermission(["manage_all_projects", "view_projects"]),
  validate(getUtilizationReportSchema),
  ctrl.getUtilizationReport
);

/**
 * ============================================================================
 * TASK COMMENT ROUTES
 * ============================================================================
 */

// Create a comment on a task
router.post(
  "/tasks/:task_id/comments",
  verifyJwt,
  requirePermission("view_projects"),
  validate(createCommentSchema),
  ctrl.createComment
);

// List comments for a task
router.get(
  "/tasks/:task_id/comments",
  verifyJwt,
  requirePermission("view_projects"),
  validate(listCommentsSchema),
  ctrl.listComments
);

// Update a comment
router.put(
  "/tasks/comments/:comment_id",
  verifyJwt,
  requirePermission("view_projects"),
  validate(updateCommentSchema),
  ctrl.updateComment
);

// Delete a comment
router.delete(
  "/tasks/comments/:comment_id",
  verifyJwt,
  requirePermission("view_projects"),
  validate(deleteCommentSchema),
  ctrl.deleteComment
);

// Get users that can be @mentioned in a project
router.get(
  "/projects/:project_id/mentionable-users",
  verifyJwt,
  requirePermission("view_projects"),
  validate(getMentionableUsersSchema),
  ctrl.getMentionableUsers
);

// Get dashboard aggregated stats
router.get(
  "/dashboard/stats",
  verifyJwt,
  requireAnyPermission(["view_projects", "view_all_projects_summary"]),
  ctrl.getDashboardStats
);

module.exports = router;
