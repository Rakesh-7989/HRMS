const { z } = require("zod");

/**
 * ============================================================================
 * CLIENT VALIDATORS
 * ============================================================================
 */

exports.createClientSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Client name must be at least 2 characters")
      .max(255, "Client name must not exceed 255 characters"),
    email: z
      .string()
      .email("Invalid email format"),
    phone: z
      .string()
      .max(20, "Phone must not exceed 20 characters"),
    address: z
      .string()
      .max(500, "Address must not exceed 500 characters")
      .optional(),
    city: z
      .string()
      .max(100, "City must not exceed 100 characters")
      .optional(),
    state: z
      .string()
      .max(100, "State must not exceed 100 characters")
      .optional(),
    country: z
      .string()
      .max(100, "Country must not exceed 100 characters")
      .optional(),
    zip_code: z
      .string()
      .max(20, "Zip code must not exceed 20 characters")
      .optional(),
    status: z
      .enum(["ACTIVE", "INACTIVE"])
      .default("ACTIVE"),
    notes: z
      .string()
      .max(1000, "Notes must not exceed 1000 characters")
      .optional(),
  }),
});

exports.updateClientSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid client ID format"),
  }),
  body: z.object({
    name: z
      .string()
      .min(2, "Client name must be at least 2 characters")
      .max(255, "Client name must not exceed 255 characters")
      .optional(),
    email: z
      .string()
      .email("Invalid email format")
      .optional(),
    phone: z
      .string()
      .max(20, "Phone must not exceed 20 characters")
      .optional(),
    address: z
      .string()
      .max(500, "Address must not exceed 500 characters")
      .optional(),
    city: z
      .string()
      .max(100, "City must not exceed 100 characters")
      .optional(),
    state: z
      .string()
      .max(100, "State must not exceed 100 characters")
      .optional(),
    country: z
      .string()
      .max(100, "Country must not exceed 100 characters")
      .optional(),
    zip_code: z
      .string()
      .max(20, "Zip code must not exceed 20 characters")
      .optional(),
    status: z
      .enum(["ACTIVE", "INACTIVE"])
      .optional(),
    notes: z
      .string()
      .max(1000, "Notes must not exceed 1000 characters")
      .optional(),
  }),
});

exports.getClientSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid client ID format"),
  }),
});

exports.listClientsSchema = z.object({
  query: z.object({
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    search: z.string().optional(),
    skip: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

/**
 * ============================================================================
 * PROJECT VALIDATORS
 * ============================================================================
 */

exports.createProjectSchema = z.object({
  body: z.object({
    client_id: z
      .string()
      .uuid("Invalid client ID format"),
    name: z
      .string()
      .min(2, "Project name must be at least 2 characters")
      .max(255, "Project name must not exceed 255 characters"),
    description: z
      .string()
      .max(2000, "Description must not exceed 2000 characters")
      .optional(),
    status: z
      .enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"])
      .default("PLANNING")
      .optional(),
    start_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format")
      .optional(),
    end_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format")
      .optional(),
    budget: z
      .number()
      .positive("Budget must be positive")
      .optional(),
  }),
});

exports.updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid project ID format"),
  }),
  body: z.object({
    name: z
      .string()
      .min(2, "Project name must be at least 2 characters")
      .max(255, "Project name must not exceed 255 characters"),
    description: z
      .string()
      .max(2000, "Description must not exceed 2000 characters")
      .optional(),
    status: z
      .enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]),
    start_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format")
      .optional(),
    end_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format")
      .optional(),
    budget: z
      .number()
      .positive("Budget must be positive")
      .optional(),
  }),
});

exports.getProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid project ID format"),
  }),
});

exports.listProjectsSchema = z.object({
  query: z.object({
    client_id: z.string().uuid().optional(),
    status: z.enum(["PLANNING", "ACTIVE", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
    search: z.string().optional(),
    skip: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

/**
 * ============================================================================
 * PROJECT MEMBERSHIP VALIDATORS
 * ============================================================================
 */

exports.addProjectMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid project ID format"),
  }),
  body: z.object({
    employee_id: z.string().uuid("Invalid employee ID format"),
    role: z.enum(["LEAD", "MEMBER"]).default("MEMBER").optional(),
  }),
});

exports.listProjectMembersSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid project ID format"),
  }),
});

exports.removeProjectMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid project ID format"),
    employee_id: z.string().uuid("Invalid employee ID format"),
  }),
});

/**
 * ============================================================================
 * KANBAN BOARD VALIDATORS
 * ============================================================================
 */

exports.getKanbanBoardSchema = z.object({
  params: z.object({
    project_id: z.string().uuid("Invalid project ID format"),
  }),
});

exports.createKanbanBoardSchema = z.object({
  params: z.object({
    project_id: z.string().uuid("Invalid project ID format"),
  }),
  body: z.object({
    useDefault: z.boolean().optional(),
    forceReset: z.boolean().optional(),
    columns: z
      .array(
        z.object({
          column_key: z.string().min(2).max(100),
          column_label: z.string().min(1).max(255),
          order_index: z.number().int().min(0).optional(),
        })
      )
      .optional(),
  }),
});

exports.updateKanbanBoardSchema = z.object({
  params: z.object({
    project_id: z.string().uuid("Invalid project ID format"),
  }),
  body: z.object({
    columns: z
      .array(
        z.object({
          id: z.string().uuid().optional(),
          column_key: z
            .string()
            .min(2, "Column key must be at least 2 characters")
            .max(100, "Column key must not exceed 100 characters"),
          column_label: z
            .string()
            .min(1, "Column label must be at least 1 character")
            .max(255, "Column label must not exceed 255 characters"),
          order_index: z.number().int().min(0),
          is_enabled: z.boolean().default(true),
        })
      )
      .min(1, "Must have at least one column")
      .max(20, "Cannot have more than 20 columns"),
  }),
});

exports.addKanbanColumnSchema = z.object({
  params: z.object({
    project_id: z.string().uuid("Invalid project ID format"),
  }),
  body: z.object({
    column_key: z
      .string()
      .min(2, "Column key must be at least 2 characters")
      .max(100, "Column key must not exceed 100 characters"),
    column_label: z
      .string()
      .min(1, "Column label must be at least 1 character")
      .max(255, "Column label must not exceed 255 characters"),
  }),
});

/**
 * ============================================================================
 * TASK VALIDATORS
 * ============================================================================
 */

exports.createTaskSchema = z.object({
  body: z.object({
    project_id: z
      .string()
      .uuid("Invalid project ID format"),
    title: z
      .string()
      .min(2, "Task title must be at least 2 characters")
      .max(255, "Task title must not exceed 255 characters"),
    description: z
      .string()
      .max(2000, "Description must not exceed 2000 characters")
      .optional(),
    assigned_to: z.union([
      z.string().uuid("Invalid employee ID format"),
      z.array(z.string().uuid("Invalid employee ID format"))
    ]).optional(),
    priority: z
      .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
      .default("MEDIUM")
      .optional(),
    column_key: z
      .string()
      .min(2, "Column key must be at least 2 characters")
      .max(100, "Column key must not exceed 100 characters"),
    due_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format")
      .optional(),
    estimated_hours: z
      .number()
      .positive("Estimated hours must be positive")
      .optional(),
  }),
});

exports.updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid task ID format"),
  }),
  body: z.object({
    title: z
      .string()
      .min(2, "Task title must be at least 2 characters")
      .max(255, "Task title must not exceed 255 characters")
      .optional(),
    description: z
      .string()
      .max(2000, "Description must not exceed 2000 characters")
      .optional(),
    assigned_to: z.union([
      z.string().uuid("Invalid employee ID format"),
      z.array(z.string().uuid("Invalid employee ID format"))
    ]).optional(),
    priority: z
      .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
      .optional(),
    due_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format")
      .optional(),
    estimated_hours: z
      .number()
      .positive("Estimated hours must be positive")
      .optional(),
  }),
});

exports.updateTaskColumnSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid task ID format"),
  }),
  body: z.object({
    column_key: z
      .string()
      .min(2, "Column key must be at least 2 characters")
      .max(100, "Column key must not exceed 100 characters"),
    order_index: z.number().int().min(0).optional(),
  }),
});

exports.getTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid task ID format"),
  }),
});

exports.listTasksSchema = z.object({
  query: z.object({
    project_id: z.string().uuid().optional(),
    assigned_to: z.string().uuid().optional(),
    column_key: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    search: z.string().optional(),
    skip: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

/**
 * ============================================================================
 * TIMESHEET VALIDATORS
 * ============================================================================
 */

exports.createTimesheetSchema = z.object({
  body: z.object({
    project_id: z
      .string()
      .uuid("Invalid project ID format")
      .optional(),
    week_start_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format"),
    week_end_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format"),
    entries: z
      .array(
        z.object({
          task_id: z.string().uuid().optional(),
          work_date: z
            .string()
            .refine(val => !isNaN(Date.parse(val)), "Invalid date format"),
          hours: z
            .number()
            .positive("Hours must be positive")
            .max(24, "Hours cannot exceed 24"),
          notes: z.string().max(500).optional(),
        })
      )
      .min(1, "Must have at least one entry"),
    status: z
      .enum(["DRAFT", "SUBMITTED"])
      .optional(),
  }),
});

exports.addTimesheetEntrySchema = z.object({
  body: z.object({
    project_id: z
      .string()
      .uuid("Invalid project ID format")
      .optional(), // Optional because it might be inferred from task or context, but usually required. Let's make it optional here as we can validate in logic or if it's not strictly needed for update. But for creation it's needed. Let's keep optional in schema but logic will enforce.
    task_id: z
      .string()
      .uuid("Invalid task ID format"),
    work_date: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format"),
    hours: z
      .number()
      .positive("Hours must be positive")
      .max(24, "Hours cannot exceed 24"),
    notes: z.string().max(500).optional(),
  }),
});

exports.listTimesheetEntriesSchema = z.object({
  query: z.object({
    project_id: z.string().uuid().optional(),
    week_start_date: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    limit: z.string().transform(Number).optional(),
    offset: z.string().transform(Number).optional(),
  }),
});

exports.submitTimesheetSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid timesheet ID format"),
  }),
});

exports.approveTimesheetSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid timesheet ID format"),
  }),
  body: z.object({
    notes: z.string().max(500).optional(),
  }),
});

exports.rejectTimesheetSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid timesheet ID format"),
  }),
  body: z.object({
    rejection_reason: z
      .string()
      .min(10, "Rejection reason must be at least 10 characters")
      .max(1000, "Rejection reason must not exceed 1000 characters"),
  }),
});

exports.listTimesheetsSchema = z.object({
  query: z.object({
    employee_id: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(),
    status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]).optional(),
    week_start_date: z.string().optional(),
    skip: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

exports.getTimesheetSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid timesheet ID format"),
  }),
});

/**
 * ============================================================================
 * REPORT VALIDATORS
 * ============================================================================
 */

exports.getProjectReportSchema = z.object({
  params: z.object({
    project_id: z.string().uuid("Invalid project ID format"),
  }),
  query: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  }),
});

exports.getClientReportSchema = z.object({
  params: z.object({
    client_id: z.string().uuid("Invalid client ID format"),
  }),
  query: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  }),
});

exports.getUtilizationReportSchema = z.object({
  query: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    skip: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

/**
 * ============================================================================
 * COMMENT VALIDATORS
 * ============================================================================
 */

exports.createCommentSchema = z.object({
  params: z.object({
    task_id: z.string().uuid("Invalid task ID format"),
  }),
  body: z.object({
    content: z
      .string()
      .min(1, "Comment content cannot be empty")
      .max(2000, "Comment must not exceed 2000 characters"),
    parent_id: z.string().uuid().optional(),
  }),
});

exports.listCommentsSchema = z.object({
  params: z.object({
    task_id: z.string().uuid("Invalid task ID format"),
  }),
});

exports.updateCommentSchema = z.object({
  params: z.object({
    comment_id: z.string().uuid("Invalid comment ID format"),
  }),
  body: z.object({
    content: z
      .string()
      .min(1, "Comment content cannot be empty")
      .max(2000, "Comment must not exceed 2000 characters"),
  }),
});

exports.deleteCommentSchema = z.object({
  params: z.object({
    comment_id: z.string().uuid("Invalid comment ID format"),
  }),
});

exports.getMentionableUsersSchema = z.object({
  params: z.object({
    project_id: z.string().uuid("Invalid project ID format"),
  }),
});
