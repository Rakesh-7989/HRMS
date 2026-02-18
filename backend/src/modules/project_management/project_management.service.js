const pool = require("../../config/db");
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require("../../utils/customErrors");
const crypto = require("crypto");
const logger = require("../../config/logger");
const moment = require("moment");

/**
 * ============================================================================
 * CLIENT MANAGEMENT SERVICES
 * ============================================================================
 */

/**
 * CREATE CLIENT
 */
exports.createClient = async (tenantId, userId, data) => {
  const { name, email, phone, address, city, state, country, zip_code, status, notes } = data;

  // Check if email already exists in tenant
  if (email) {
    const existingClient = await pool.query(
      `SELECT id FROM clients WHERE tenant_id = $1 AND LOWER(email) = LOWER($2)`,
      [tenantId, email]
    );
    if (existingClient.rowCount > 0) {
      throw new ConflictError(`Client with email '${email}' already exists`);
    }
  }

  const clientId = crypto.randomUUID();
  const result = await pool.query(
    `INSERT INTO clients (
      id, tenant_id, name, email, phone, address, city, state, country, zip_code, status, notes, created_by, updated_by, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
    )
    RETURNING *`,
    [clientId, tenantId, name, email || null, phone || null, address || null, city || null, state || null, country || null, zip_code || null, status || "ACTIVE", notes || null, userId, userId]
  );

  return result.rows[0];
};

/**
 * LIST CLIENTS
 */
exports.listClients = async (tenantId, filters = {}) => {
  const { status, search, skip = 0, limit = 20 } = filters;

  let query = `SELECT * FROM clients WHERE tenant_id = $1`;
  const params = [tenantId];
  let paramCount = 1;

  if (status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    params.push(status);
  }

  if (search) {
    paramCount++;
    query += ` AND (LOWER(name) LIKE LOWER($${paramCount}) OR LOWER(email) LIKE LOWER($${paramCount}))`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm);
  }

  const countQuery = query;
  const countResult = await pool.query(countQuery, params);
  const total = countResult.rowCount;

  paramCount++;
  query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
  params.push(limit);

  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(skip);

  const result = await pool.query(query, params);

  return {
    clients: result.rows,
    pagination: {
      total,
      skip,
      limit,
      hasMore: skip + limit < total,
    },
  };
};

/**
 * GET CLIENT BY ID
 */
exports.getClientById = async (tenantId, clientId) => {
  const result = await pool.query(
    `SELECT * FROM clients WHERE id = $1 AND tenant_id = $2`,
    [clientId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError("Client not found");
  }

  return result.rows[0];
};

/**
 * UPDATE CLIENT
 */
exports.updateClient = async (tenantId, userId, clientId, data) => {
  const existingClient = await this.getClientById(tenantId, clientId);

  const {
    name = existingClient.name,
    email = existingClient.email,
    phone = existingClient.phone,
    address = existingClient.address,
    city = existingClient.city,
    state = existingClient.state,
    country = existingClient.country,
    zip_code = existingClient.zip_code,
    status = existingClient.status,
    notes = existingClient.notes,
  } = data;

  // Check if new email conflicts with another client
  if (email && email !== existingClient.email) {
    const conflictingClient = await pool.query(
      `SELECT id FROM clients WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) AND id != $3`,
      [tenantId, email, clientId]
    );
    if (conflictingClient.rowCount > 0) {
      throw new ConflictError(`Client with email '${email}' already exists`);
    }
  }

  const result = await pool.query(
    `UPDATE clients SET
      name = $1, email = $2, phone = $3, address = $4, city = $5,
      state = $6, country = $7, zip_code = $8, status = $9, notes = $10,
      updated_by = $11, updated_at = NOW()
    WHERE id = $12 AND tenant_id = $13
    RETURNING *`,
    [name, email || null, phone || null, address || null, city || null, state || null, country || null, zip_code || null, status, notes || null, userId, clientId, tenantId]
  );

  return result.rows[0];
};

/**
 * DELETE CLIENT
 */
exports.deleteClient = async (tenantId, clientId) => {
  // Check if client exists
  await this.getClientById(tenantId, clientId);

  // Check for linked projects
  const linkedProjects = await pool.query(
    `SELECT id FROM projects WHERE tenant_id = $1 AND client_id = $2`,
    [tenantId, clientId]
  );
  if (linkedProjects.rowCount > 0) {
    throw new BadRequestError("Cannot delete client with linked projects. Delete or reassign projects first.");
  }

  await pool.query(
    `DELETE FROM clients WHERE id = $1 AND tenant_id = $2`,
    [clientId, tenantId]
  );

  return { success: true, message: "Client deleted successfully" };
};

/**
 * ============================================================================
 * PROJECT MANAGEMENT SERVICES
 * ============================================================================
 */

/**
 * CREATE PROJECT
 */
exports.createProject = async (tenantId, userId, data) => {
  const { client_id, name, description, status, start_date, end_date, budget } = data;

  // Verify client exists
  await this.getClientById(tenantId, client_id);

  const projectId = crypto.randomUUID();
  const result = await pool.query(
    `INSERT INTO projects (
      id, tenant_id, client_id, name, description, status, start_date, end_date, budget, created_by, updated_by, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
    )
    RETURNING *`,
    [projectId, tenantId, client_id, name, description || null, status || "PLANNING", start_date || null, end_date || null, budget || null, userId, userId]
  );

  const project = result.rows[0];

  // Note: Kanban columns are NOT auto-created here.
  // Users must explicitly set up the Kanban board via the /board/setup endpoint.

  return await this.getProjectById(tenantId, projectId);
};

/**
 * LIST PROJECTS
 * ADMIN: sees all projects
 * Others: sees only projects they are members of
 */
exports.listProjects = async (tenantId, filters = {}) => {
  const permissions = filters.userPermissions || [];
  const canViewAll = permissions.includes('manage_all_projects') || permissions.includes('platform.manage_tenants');
  const isManager = permissions.includes('manage_all_projects'); // In this context, anyone who can manage all is treated as high-privilege

  let query = `SELECT DISTINCT p.*, c.name as client_name FROM projects p
               LEFT JOIN clients c ON p.client_id = c.id`;

  // Filter for non-privileged users
  if (!canViewAll) {
    // For everyone else, they see projects they are members of
    // Managers (who don't have manage_all but might have view_projects) see their created ones too
    query += ` LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.employee_id = $2
               WHERE p.tenant_id = $1 AND (pm.id IS NOT NULL OR p.created_by = $3)`;
  } else {
    // Admin/Manage-All see all in tenant
    query += ` WHERE p.tenant_id = $1`;
  }

  const params = [tenantId];
  let paramCount = 1;

  if (!canViewAll) {
    params.push(userEmployeeId);
    paramCount++;
    params.push(userId);
    paramCount++;
  }

  if (client_id) {
    paramCount++;
    query += ` AND p.client_id = $${paramCount}`;
    params.push(client_id);
  }

  if (status) {
    paramCount++;
    query += ` AND p.status = $${paramCount}`;
    params.push(status);
  }

  if (search) {
    paramCount++;
    query += ` AND LOWER(p.name) LIKE LOWER($${paramCount})`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm);
  }

  const countQuery = query;
  const countResult = await pool.query(countQuery, params);
  const total = countResult.rowCount;

  paramCount++;
  query += ` ORDER BY p.created_at DESC LIMIT $${paramCount}`;
  params.push(limit);

  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(skip);

  const result = await pool.query(query, params);

  return {
    projects: result.rows.map(row => ({
      ...row,
      client: row.client_name ? { id: row.client_id, name: row.client_name } : null
    })),
    pagination: {
      total,
      skip,
      limit,
      hasMore: skip + limit < total,
    },
  };
};

/**
 * GET PROJECT BY ID
 * @param {string} tenantId
 * @param {string} projectId
 * @param {Object} userContext - Optional. { role, employeeId, userId }. If provided, validates access.
 */
exports.getProjectById = async (tenantId, projectId, userContext = null) => {
  const result = await pool.query(
    `SELECT p.*, c.name as client_name FROM projects p
     LEFT JOIN clients c ON p.client_id = c.id
     WHERE p.id = $1 AND p.tenant_id = $2`,
    [projectId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError("Project not found");
  }

  const project = result.rows[0];

  // SECURITY FIX: Validate user access if userContext is provided
  if (userContext) {
    const { permissions = [], employeeId, userId } = userContext;
    const canViewAll = permissions.includes('manage_all_projects') || permissions.includes('platform.manage_tenants');

    if (!canViewAll) {
      // Users with manage_all_projects can see everything.
      // Others see projects they created OR are members of.
      const isCreator = project.created_by === userId;
      const isMember = employeeId ? await this.isProjectMember(tenantId, projectId, employeeId) : false;

      if (!isCreator && !isMember) {
        throw new ForbiddenError("You do not have access to this project");
      }
    }
  }

  return {
    ...project,
    client: project.client_name ? { id: project.client_id, name: project.client_name } : null
  };
};


/**
 * UPDATE PROJECT
 */
exports.updateProject = async (tenantId, userId, projectId, data) => {
  const existingProject = await this.getProjectById(tenantId, projectId);

  const {
    name = existingProject.name,
    description = existingProject.description,
    status = existingProject.status,
    start_date = existingProject.start_date,
    end_date = existingProject.end_date,
    budget = existingProject.budget,
  } = data;

  await pool.query(
    `UPDATE projects SET
      name = $1, description = $2, status = $3, start_date = $4, end_date = $5,
      budget = $6, updated_by = $7, updated_at = NOW()
    WHERE id = $8 AND tenant_id = $9`,
    [name, description || null, status, start_date || null, end_date || null, budget || null, userId, projectId, tenantId]
  );

  return await this.getProjectById(tenantId, projectId);
};

/**
 * DELETE PROJECT
 */
exports.deleteProject = async (tenantId, projectId) => {
  // Check if project exists
  await this.getProjectById(tenantId, projectId);

  // Check for linked tasks
  const linkedTasks = await pool.query(
    `SELECT id FROM tasks WHERE tenant_id = $1 AND project_id = $2`,
    [tenantId, projectId]
  );
  if (linkedTasks.rowCount > 0) {
    throw new BadRequestError("Cannot delete project with tasks. Delete tasks first.");
  }

  // Delete project members first
  await pool.query(
    `DELETE FROM project_members WHERE tenant_id = $1 AND project_id = $2`,
    [tenantId, projectId]
  );

  // Delete kanban columns
  await pool.query(
    `DELETE FROM project_kanban_columns WHERE tenant_id = $1 AND project_id = $2`,
    [tenantId, projectId]
  );

  // Delete project
  await pool.query(
    `DELETE FROM projects WHERE id = $1 AND tenant_id = $2`,
    [projectId, tenantId]
  );

  return { success: true, message: "Project deleted successfully" };
};

/**
 * ============================================================================
 * PROJECT MEMBERSHIP SERVICES
 * ============================================================================
 */

/**
 * ADD PROJECT MEMBER
 */
exports.addProjectMember = async (tenantId, userId, projectId, employeeId, role = 'MEMBER') => {
  // Verify project exists
  await this.getProjectById(tenantId, projectId);

  // Check if employee exists
  const employeeCheck = await pool.query(
    `SELECT id FROM employees WHERE id = $1 AND tenant_id = $2`,
    [employeeId, tenantId]
  );
  if (employeeCheck.rowCount === 0) {
    throw new NotFoundError("Employee not found");
  }

  // Check if already a member
  const existingMember = await pool.query(
    `SELECT id FROM project_members WHERE tenant_id = $1 AND project_id = $2 AND employee_id = $3`,
    [tenantId, projectId, employeeId]
  );
  if (existingMember.rowCount > 0) {
    throw new ConflictError("Employee is already a member of this project");
  }

  const memberId = crypto.randomUUID();
  const result = await pool.query(
    `INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [memberId, tenantId, projectId, employeeId, role, userId, userId]
  );

  // Get employee details for response
  const memberWithDetails = await pool.query(
    `SELECT pm.*, e.first_name, e.last_name, e.employee_id as employee_code, u.email
     FROM project_members pm
     JOIN employees e ON pm.employee_id = e.id
     LEFT JOIN users u ON e.user_id = u.id
     WHERE pm.id = $1`,
    [memberId]
  );

  return memberWithDetails.rows[0];
};

/**
 * REMOVE PROJECT MEMBER
 */
exports.removeProjectMember = async (tenantId, projectId, employeeId) => {
  // Verify project exists
  await this.getProjectById(tenantId, projectId);

  // Check if member exists
  const existingMember = await pool.query(
    `SELECT id FROM project_members WHERE tenant_id = $1 AND project_id = $2 AND employee_id = $3`,
    [tenantId, projectId, employeeId]
  );
  if (existingMember.rowCount === 0) {
    throw new NotFoundError("Member not found in this project");
  }

  // Check if member has active tasks assigned
  const activeTasks = await pool.query(
    `SELECT id FROM tasks WHERE tenant_id = $1 AND project_id = $2 AND assigned_to = $3 AND column_key != 'DONE'`,
    [tenantId, projectId, employeeId]
  );
  if (activeTasks.rowCount > 0) {
    throw new BadRequestError("Cannot remove member with active tasks. Reassign or complete their tasks first.");
  }

  await pool.query(
    `DELETE FROM project_members WHERE tenant_id = $1 AND project_id = $2 AND employee_id = $3`,
    [tenantId, projectId, employeeId]
  );

  return { success: true, message: "Member removed from project" };
};

/**
 * LIST PROJECT MEMBERS
 */
exports.listProjectMembers = async (tenantId, projectId) => {
  // Verify project exists
  await this.getProjectById(tenantId, projectId);

  const result = await pool.query(
    `SELECT pm.*, e.first_name, e.last_name, e.employee_id as employee_code, u.email
     FROM project_members pm
     JOIN employees e ON pm.employee_id = e.id
     LEFT JOIN users u ON e.user_id = u.id
     WHERE pm.tenant_id = $1 AND pm.project_id = $2
     ORDER BY pm.created_at ASC`,
    [tenantId, projectId]
  );

  return result.rows.map(row => ({
    id: row.id,
    project_id: row.project_id,
    employee_id: row.employee_id,
    role: row.role,
    created_at: row.created_at,
    employee: {
      id: row.employee_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      employee_code: row.employee_code
    }
  }));
};

/**
 * CHECK IF EMPLOYEE IS PROJECT MEMBER
 */
exports.isProjectMember = async (tenantId, projectId, employeeId) => {
  const result = await pool.query(
    `SELECT id FROM project_members WHERE tenant_id = $1 AND project_id = $2 AND employee_id = $3`,
    [tenantId, projectId, employeeId]
  );
  return result.rowCount > 0;
};

/**
 * GET ENABLED KANBAN COLUMN
 */
exports.getEnabledColumn = async (tenantId, projectId, columnKey) => {
  const result = await pool.query(
    `SELECT id, column_key, is_enabled FROM project_kanban_columns
     WHERE tenant_id = $1 AND project_id = $2 AND column_key = $3`,
    [tenantId, projectId, columnKey]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError(`Column '${columnKey}' not found in project`);
  }

  if (!result.rows[0].is_enabled) {
    throw new BadRequestError(`Column '${columnKey}' is disabled`);
  }

  return result.rows[0];
};

/**
 * CHECK IF KANBAN BOARD EXISTS FOR PROJECT
 */
exports.checkKanbanExists = async (tenantId, projectId, userContext = null) => {
  // Verify project exists and user has access
  await this.getProjectById(tenantId, projectId, userContext);

  const columnsResult = await pool.query(
    `SELECT id, column_key, column_label, order_index, is_enabled FROM project_kanban_columns
     WHERE tenant_id = $1 AND project_id = $2
     ORDER BY order_index ASC`,
    [tenantId, projectId]
  );

  return {
    exists: columnsResult.rowCount > 0,
    columns: columnsResult.rows,
  };
};

/**
 * CREATE KANBAN BOARD FOR PROJECT
 * @param {boolean} useDefault - If true, create default columns. If false, use custom columns.
 * @param {Array} customColumns - Array of custom column definitions (only used if useDefault is false)
 */
exports.createKanbanBoard = async (tenantId, userId, projectId, options = {}) => {
  const { useDefault = true, customColumns = [], forceReset = false } = options;

  logger.debug({ useDefault, customColumnsCount: customColumns.length, forceReset, projectId }, 'createKanbanBoard called');

  // Verify project exists
  await this.getProjectById(tenantId, projectId);

  // Check if Kanban board already exists
  const existingColumns = await pool.query(
    `SELECT id FROM project_kanban_columns WHERE tenant_id = $1 AND project_id = $2`,
    [tenantId, projectId]
  );

  if (existingColumns.rowCount > 0) {
    if (!forceReset) {
      throw new ConflictError("Kanban board already exists for this project");
    }

    // If forceReset, check if there are any tasks first
    const tasksResult = await pool.query(
      `SELECT COUNT(*) as count FROM tasks WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );

    if (parseInt(tasksResult.rows[0].count) > 0) {
      throw new BadRequestError("Cannot reset Kanban board with existing tasks. Please delete or move tasks first.");
    }

    // Delete existing columns
    await pool.query(
      `DELETE FROM project_kanban_columns WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );
  }

  // Define columns to create
  let columnsToCreate = [];

  if (useDefault) {
    columnsToCreate = [
      { column_key: "BACKLOG", column_label: "Backlog", order_index: 0 },
      { column_key: "TODO", column_label: "To Do", order_index: 1 },
      { column_key: "IN_PROGRESS", column_label: "In Progress", order_index: 2 },
      { column_key: "REVIEW", column_label: "Review", order_index: 3 },
      { column_key: "DONE", column_label: "Done", order_index: 4 },
    ];
  } else {
    // Validate custom columns
    if (!customColumns || customColumns.length === 0) {
      throw new BadRequestError("Custom columns are required when useDefault is false");
    }

    // Map custom columns with order_index
    columnsToCreate = customColumns.map((col, index) => ({
      column_key: col.column_key || col.key || col.id,
      column_label: col.column_label || col.label || col.title,
      order_index: col.order_index !== undefined ? col.order_index : index,
    }));
  }

  // Create columns
  const createdColumns = [];
  for (const col of columnsToCreate) {
    const columnId = crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO project_kanban_columns (id, tenant_id, project_id, column_key, column_label, order_index, is_enabled, created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [columnId, tenantId, projectId, col.column_key, col.column_label, col.order_index, true, userId, userId]
    );
    createdColumns.push(result.rows[0]);
  }

  return {
    success: true,
    columns: createdColumns,
  };
};

/**
 * ============================================================================
 * KANBAN BOARD SERVICES
 * ============================================================================
 */

/**
 * GET KANBAN BOARD FOR PROJECT
 */
exports.getKanbanBoard = async (tenantId, projectId, userContext = null) => {
  // Verify project exists and user has access
  await this.getProjectById(tenantId, projectId, userContext);

  const columnsResult = await pool.query(
    `SELECT id, column_key, column_label, order_index, is_enabled FROM project_kanban_columns
     WHERE tenant_id = $1 AND project_id = $2
     ORDER BY order_index ASC`,
    [tenantId, projectId]
  );

  const columns = columnsResult.rows;

  // Get tasks for each column
  const tasksResult = await pool.query(
    `SELECT id, title, assigned_to, priority, column_key, order_index, due_date, estimated_hours
     FROM tasks
     WHERE tenant_id = $1 AND project_id = $2
     ORDER BY column_key, order_index ASC`,
    [tenantId, projectId]
  );

  const tasksByColumn = {};
  columns.forEach(col => {
    tasksByColumn[col.column_key] = [];
  });

  tasksResult.rows.forEach(task => {
    if (tasksByColumn[task.column_key]) {
      tasksByColumn[task.column_key].push(task);
    }
  });

  return {
    columns,
    tasks: tasksByColumn,
  };
};

/**
 * UPDATE KANBAN BOARD (bulk update columns)
 */
exports.updateKanbanBoard = async (tenantId, userId, projectId, columnsData) => {
  // Verify project exists
  await this.getProjectById(tenantId, projectId);

  // Get existing columns
  const existingResult = await pool.query(
    `SELECT id, column_key FROM project_kanban_columns WHERE tenant_id = $1 AND project_id = $2`,
    [tenantId, projectId]
  );

  const existingColumns = new Map(existingResult.rows.map(c => [c.column_key, c.id]));
  const newColumnKeys = new Set(columnsData.map(c => c.column_key));

  // Check for columns with active tasks
  for (const col of columnsData) {
    if (!col.is_enabled && existingColumns.has(col.column_key)) {
      const tasksResult = await pool.query(
        `SELECT COUNT(*) as count FROM tasks WHERE tenant_id = $1 AND column_key = $2`,
        [tenantId, col.column_key]
      );
      if (parseInt(tasksResult.rows[0].count) > 0) {
        throw new BadRequestError(`Cannot disable column "${col.column_label}" with active tasks`);
      }
    }
  }

  // Delete columns that are no longer in the request
  const columnsToDelete = Array.from(existingColumns.keys()).filter(
    key => !newColumnKeys.has(key)
  );

  for (const columnKey of columnsToDelete) {
    // Check for tasks in this column
    const tasksResult = await pool.query(
      `SELECT COUNT(*) as count FROM tasks WHERE tenant_id = $1 AND column_key = $2`,
      [tenantId, columnKey]
    );
    if (parseInt(tasksResult.rows[0].count) > 0) {
      throw new BadRequestError(
        `Cannot delete column with active tasks. Move or delete tasks first.`
      );
    }

    await pool.query(
      `DELETE FROM project_kanban_columns WHERE id = $1`,
      [existingColumns.get(columnKey)]
    );
  }

  // Update or insert columns
  const updatedColumns = [];
  for (const col of columnsData) {
    let result;
    if (existingColumns.has(col.column_key)) {
      // Update existing
      result = await pool.query(
        `UPDATE project_kanban_columns SET
          column_label = $1, order_index = $2, is_enabled = $3, updated_by = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *`,
        [col.column_label, col.order_index, col.is_enabled, userId, existingColumns.get(col.column_key)]
      );
    } else {
      // Insert new
      const columnId = crypto.randomUUID();
      result = await pool.query(
        `INSERT INTO project_kanban_columns (id, tenant_id, project_id, column_key, column_label, order_index, is_enabled, created_by, updated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [columnId, tenantId, projectId, col.column_key, col.column_label, col.order_index, col.is_enabled, userId, userId]
      );
    }
    updatedColumns.push(result.rows[0]);
  }

  return updatedColumns;
};

/**
 * ============================================================================
 * TASK MANAGEMENT SERVICES
 * ============================================================================
 */

/**
 * CREATE TASK
 * @param {Object} data - Task data with assigned_to as array of employee IDs
 */
exports.createTask = async (tenantId, userId, data) => {
  const { project_id, title, description, assigned_to, priority, column_key, due_date, estimated_hours } = data;

  // Verify project exists
  await this.getProjectById(tenantId, project_id);

  // Verify column exists and is enabled
  const columnResult = await pool.query(
    `SELECT id FROM project_kanban_columns WHERE tenant_id = $1 AND project_id = $2 AND column_key = $3 AND is_enabled = TRUE`,
    [tenantId, project_id, column_key]
  );
  if (columnResult.rowCount === 0) {
    throw new BadRequestError(`Column '${column_key}' does not exist or is disabled`);
  }

  // Normalize assigned_to to array
  const assignees = Array.isArray(assigned_to) ? assigned_to : (assigned_to ? [assigned_to] : []);

  // Verify all assignees are project members
  for (const employeeId of assignees) {
    const isMember = await this.isProjectMember(tenantId, project_id, employeeId);
    if (!isMember) {
      throw new BadRequestError(`Employee ${employeeId} must be a project member to be assigned`);
    }
  }

  // Get creator's employee ID for assigned_by
  const creatorEmployeeResult = await pool.query(
    `SELECT id FROM employees WHERE user_id = $1`,
    [userId]
  );
  const creatorEmployeeId = creatorEmployeeResult.rows[0]?.id || null;

  const taskId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO tasks (id, tenant_id, project_id, title, description, assigned_to, assigned_by, priority, column_key, order_index, due_date, estimated_hours, created_by, updated_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
    [taskId, tenantId, project_id, title, description || null, assignees[0] || null, creatorEmployeeId, priority || "MEDIUM", column_key, 0, due_date || null, estimated_hours || null, userId, userId]
  );

  // Insert into task_assignees junction table
  for (const employeeId of assignees) {
    await pool.query(
      `INSERT INTO task_assignees (tenant_id, task_id, employee_id) VALUES ($1, $2, $3) ON CONFLICT (task_id, employee_id) DO NOTHING`,
      [tenantId, taskId, employeeId]
    );
  }

  return await this.getTaskById(tenantId, taskId);
};

/**
 * LIST TASKS
 * Returns tasks with assignees array from task_assignees table
 */
exports.listTasks = async (tenantId, filters = {}) => {
  const permissions = filters.userPermissions || [];
  const canViewAll = permissions.includes('manage_all_projects') || permissions.includes('platform.manage_tenants');

  let query = `SELECT t.*, p.name as project_name,
               e_by.id as assigned_by_id, e_by.first_name as assigned_by_first_name, e_by.last_name as assigned_by_last_name, u_by.email as assigned_by_email,
               u_creator.role as creator_role
               FROM tasks t
               LEFT JOIN projects p ON t.project_id = p.id
               LEFT JOIN employees e_by ON t.assigned_by = e_by.id
               LEFT JOIN users u_by ON e_by.user_id = u_by.id
               LEFT JOIN users u_creator ON t.created_by = u_creator.id
               WHERE t.tenant_id = $1`;
  const params = [tenantId];
  let paramCount = 1;

  // Enforce isolation for non-privileged users
  if (!canViewAll && userEmployeeId) {
    // Check if user is assigned to the task OR Created the task
    // We need to subquery for created_by check since userEmployeeId is employee ID, created_by is user ID
    // Assuming we can get user_id from employee table subquery
    paramCount++;
    query += ` AND (
        EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.employee_id = $${paramCount})
        OR t.created_by = (SELECT user_id FROM employees WHERE id = $${paramCount})
     )`;
    params.push(userEmployeeId);
  }

  if (project_id) {
    paramCount++;
    query += ` AND t.project_id = $${paramCount}`;
    params.push(project_id);
  }

  // Filter by assignee using junction table
  if (assigned_to) {
    paramCount++;
    query += ` AND EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.employee_id = $${paramCount})`;
    params.push(assigned_to);
  }

  if (column_key) {
    paramCount++;
    query += ` AND t.column_key = $${paramCount}`;
    params.push(column_key);
  }

  if (priority) {
    paramCount++;
    query += ` AND t.priority = $${paramCount}`;
    params.push(priority);
  }

  if (search) {
    paramCount++;
    query += ` AND LOWER(t.title) LIKE LOWER($${paramCount})`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm);
  }

  const countQuery = query;
  const countResult = await pool.query(countQuery, params);
  const total = countResult.rowCount;

  paramCount++;
  query += ` ORDER BY t.column_key, t.order_index ASC LIMIT $${paramCount}`;
  params.push(limit);

  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(skip);

  const result = await pool.query(query, params);

  // Fetch assignees for all tasks in one query
  const taskIds = result.rows.map(row => row.id);
  let assigneesMap = {};

  if (taskIds.length > 0) {
    const assigneesResult = await pool.query(
      `SELECT ta.task_id, ta.employee_id, e.first_name, e.last_name, u.email
       FROM task_assignees ta
       JOIN employees e ON ta.employee_id = e.id
       LEFT JOIN users u ON e.user_id = u.id
       WHERE ta.task_id = ANY($1) AND ta.tenant_id = $2`,
      [taskIds, tenantId]
    );

    for (const row of assigneesResult.rows) {
      if (!assigneesMap[row.task_id]) {
        assigneesMap[row.task_id] = [];
      }
      assigneesMap[row.task_id].push({
        id: row.employee_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email
      });
    }
  }

  return {
    tasks: result.rows.map(row => {
      const assignees = assigneesMap[row.id] || [];
      return {
        ...row,
        project: row.project_name ? { id: row.project_id, name: row.project_name } : null,
        assignees,
        assigned_by: row.assigned_by_id ? {
          id: row.assigned_by_id,
          first_name: row.assigned_by_first_name,
          last_name: row.assigned_by_last_name,
          email: row.assigned_by_email
        } : null,
        // Keep backward compatibility with single assignee
        assignee: assignees.length > 0 ? assignees[0] : null
      };
    }),
    pagination: {
      total,
      skip,
      limit,
      hasMore: skip + limit < total,
    },
  };
};

/**
 * GET TASK BY ID
 * Returns task with assignees array from task_assignees table
 */
exports.getTaskById = async (tenantId, taskId) => {
  const result = await pool.query(
    `SELECT t.*, p.name as project_name,
            e_by.id as assigned_by_id, e_by.first_name as assigned_by_first_name, e_by.last_name as assigned_by_last_name, u_by.email as assigned_by_email,
            u_creator.role as creator_role
     FROM tasks t
     LEFT JOIN projects p ON t.project_id = p.id
     LEFT JOIN employees e_by ON t.assigned_by = e_by.id
     LEFT JOIN users u_by ON e_by.user_id = u_by.id
     LEFT JOIN users u_creator ON t.created_by = u_creator.id
     WHERE t.id = $1 AND t.tenant_id = $2`,
    [taskId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError("Task not found");
  }

  const task = result.rows[0];

  // Fetch all assignees from junction table
  const assigneesResult = await pool.query(
    `SELECT ta.employee_id, e.first_name, e.last_name, u.email
     FROM task_assignees ta
     JOIN employees e ON ta.employee_id = e.id
     LEFT JOIN users u ON e.user_id = u.id
     WHERE ta.task_id = $1 AND ta.tenant_id = $2`,
    [taskId, tenantId]
  );

  const assignees = assigneesResult.rows.map(row => ({
    id: row.employee_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email
  }));

  return {
    ...task,
    project: task.project_name ? { id: task.project_id, name: task.project_name } : null,
    assignees,
    assigned_by: task.assigned_by_id ? {
      id: task.assigned_by_id,
      first_name: task.assigned_by_first_name,
      last_name: task.assigned_by_last_name,
      email: task.assigned_by_email
    } : null,
    // Keep backward compatibility with single assignee
    assignee: assignees.length > 0 ? assignees[0] : null
  };
};

/**
 * UPDATE TASK
 * @param {Object} options - { role, userId } for permission check
 * @param {Object} data - Task data with assigned_to as array of employee IDs
 */
exports.updateTask = async (tenantId, userId, taskId, data, options = {}) => {
  const { role } = options;
  const existingTask = await this.getTaskById(tenantId, taskId);

  // Permission Check:
  // 1. Task creator can edit.
  // 2. Users with 'manage_all_projects' can edit.
  // 3. Assigned employees can update their task (usually status).
  const permissions = options.permissions || [];
  const canManageAll = permissions.includes('manage_all_projects') || permissions.includes('platform.manage_tenants');
  const isCreator = existingTask.created_by === userId;

  // Check if employee is assigned to this task
  const { employeeId } = options;
  const isAssignedEmployee = employeeId &&
    (existingTask.assignees?.some(a => a.id === employeeId) || existingTask.assigned_to === employeeId);

  // Allow if: creator OR manage-all OR assigned employee
  if (!isCreator && !canManageAll && !isAssignedEmployee) {
    throw new ForbiddenError("You don't have permission to edit this task.");
  }

  const {
    title = existingTask.title,
    description = existingTask.description,
    assigned_to,
    priority = existingTask.priority,
    due_date = existingTask.due_date,
    estimated_hours = existingTask.estimated_hours,
  } = data;

  // Normalize assigned_to to array (only if provided in data)
  let assignees = null;
  if (assigned_to !== undefined) {
    assignees = Array.isArray(assigned_to) ? assigned_to : (assigned_to ? [assigned_to] : []);

    // Verify all assignees are project members
    for (const employeeId of assignees) {
      const isMember = await this.isProjectMember(tenantId, existingTask.project_id, employeeId);
      if (!isMember) {
        throw new BadRequestError(`Employee ${employeeId} must be a project member to be assigned`);
      }
    }
  }

  // Update task fields
  await pool.query(
    `UPDATE tasks SET
      title = $1, description = $2, assigned_to = $3, priority = $4, due_date = $5,
      estimated_hours = $6, updated_by = $7, updated_at = NOW()
    WHERE id = $8 AND tenant_id = $9`,
    [title, description || null, assignees ? assignees[0] : existingTask.assigned_to, priority, due_date || null, estimated_hours || null, userId, taskId, tenantId]
  );

  // Sync task_assignees if assignees were provided
  if (assignees !== null) {
    // Remove existing assignees
    await pool.query(
      `DELETE FROM task_assignees WHERE task_id = $1 AND tenant_id = $2`,
      [taskId, tenantId]
    );

    // Add new assignees
    for (const employeeId of assignees) {
      await pool.query(
        `INSERT INTO task_assignees (tenant_id, task_id, employee_id) VALUES ($1, $2, $3) ON CONFLICT (task_id, employee_id) DO NOTHING`,
        [tenantId, taskId, employeeId]
      );
    }
  }

  return await this.getTaskById(tenantId, taskId);
};

/**
 * MOVE TASK TO ANOTHER COLUMN
 */
exports.updateTaskColumn = async (tenantId, userId, taskId, columnKey, orderIndex, options = {}) => {
  const { employeeId } = options;
  const permissions = options.permissions || [];
  const task = await this.getTaskById(tenantId, taskId);

  // Permission Check: Users without manage_all_projects can only move tasks assigned to them
  const canManageAll = permissions.includes('manage_all_projects') || permissions.includes('platform.manage_tenants');
  if (!canManageAll && employeeId) {
    // Check if employee is in the assignees list
    const isAssigned = task.assignees && task.assignees.some(a => a.id === employeeId);

    // Check legacy assigned_to field if no assignees array
    const isLegacyAssigned = task.assigned_to === employeeId;
    const isCreator = task.created_by === userId;

    if (!isAssigned && !isLegacyAssigned && !isCreator) {
      throw new ForbiddenError("You can only move tasks assigned to you.");
    }
  }

  // Verify column exists and is enabled
  const columnResult = await pool.query(
    `SELECT id FROM project_kanban_columns WHERE tenant_id = $1 AND project_id = $2 AND column_key = $3 AND is_enabled = TRUE`,
    [tenantId, task.project_id, columnKey]
  );
  if (columnResult.rowCount === 0) {
    throw new BadRequestError(`Column '${columnKey}' does not exist or is disabled`);
  }

  const result = await pool.query(
    `UPDATE tasks SET
      column_key = $1, order_index = $2, updated_by = $3, updated_at = NOW()
    WHERE id = $4 AND tenant_id = $5
    RETURNING *`,
    [columnKey, orderIndex || 0, userId, taskId, tenantId]
  );

  return result.rows[0];
};

/**
 * DELETE TASK
 * @param {Object} options - { role, userId } for permission check
 */
exports.deleteTask = async (tenantId, taskId, options = {}) => {
  const { role, userId } = options;
  const task = await this.getTaskById(tenantId, taskId);

  const permissions = options.permissions || [];
  const isCreator = task.created_by === userId;

  // Permission Check:
  // 1. Task creator can always delete their own task
  // 2. Users with platform.manage_tenants or projects.manage_tasks (or similar) can delete
  const canDeleteAny = permissions.includes("platform.manage_tenants") || permissions.includes("projects.manage_tasks");

  if (!isCreator && !canDeleteAny) {
    throw new ForbiddenError("You don't have permission to delete this task.");
  }

  // Delete any timesheet entries referencing this task
  await pool.query(
    `DELETE FROM timesheet_entries WHERE tenant_id = $1 AND task_id = $2`,
    [tenantId, taskId]
  );

  // Delete the task
  await pool.query(
    `DELETE FROM tasks WHERE id = $1 AND tenant_id = $2`,
    [taskId, tenantId]
  );

  return { success: true, message: "Task deleted successfully" };
};

/**
 * ============================================================================
 * TIMESHEET SERVICES
 * ============================================================================
 */

/**
 * ADD OR UPDATE TIMESHEET ENTRY
 */
exports.addTimesheetEntry = async (tenantId, userId, employeeId, data) => {
  const { project_id, task_id, work_date, hours, notes } = data;

  // 1. Verify project member
  if (project_id) {
    const isMember = await exports.isProjectMember(tenantId, project_id, employeeId);
    if (!isMember) {
      throw new BadRequestError("Employee must be a project member to log timesheets");
    }
  }

  // 2. Determine Week Start/End (ISO Week: Mon-Sun)
  const dateObj = moment(work_date);
  const weekStart = dateObj.clone().startOf('isoWeek').format('YYYY-MM-DD');
  const weekEnd = dateObj.clone().endOf('isoWeek').format('YYYY-MM-DD');

  // 3. Find or Create Timesheet for this Week AND Project (Optional Project Header)
  let timesheetId;
  let query = `SELECT id, status FROM timesheets WHERE tenant_id = $1 AND employee_id = $2 AND week_start_date = $3`;
  const params = [tenantId, employeeId, weekStart];

  // NOTE: If we use per-project timesheets, we check project_id. 
  // For now, we allow mixed entries, so we don't strict filter by project_id on header unless specific use case.
  // But legacy logic did:
  if (data.timesheet_project_id) { // If explicitly asking for a project-specific sheet
    query += ` AND project_id = $4`;
    params.push(data.timesheet_project_id);
  } else {
    // Allow any sheet for this week? 
    // Safe default: Look for a general sheet (project_id IS NULL)
    query += ` AND project_id IS NULL`;
  }

  const existingSheet = await pool.query(query, params);

  if (existingSheet.rowCount > 0) {
    timesheetId = existingSheet.rows[0].id;
    if (existingSheet.rows[0].status !== 'DRAFT' && existingSheet.rows[0].status !== 'REJECTED') {
      throw new BadRequestError(`Cannot edit timesheet with status ${existingSheet.rows[0].status}`);
    }
  } else {
    // Create new DRAFT timesheet
    timesheetId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO timesheets (id, tenant_id, employee_id, project_id, week_start_date, week_end_date, total_hours, status, created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 'DRAFT', $7, $8, NOW(), NOW())`,
      [timesheetId, tenantId, employeeId, data.timesheet_project_id || null, weekStart, weekEnd, userId, userId]
    );
  }

  // 4. Upsert Entry
  // Check if entry exists for this project/task on this date
  let entryQuery = `SELECT id FROM timesheet_entries WHERE tenant_id = $1 AND timesheet_id = $2 AND work_date = $3`;
  const entryParams = [tenantId, timesheetId, work_date];
  let pCount = 3;

  if (task_id) {
    pCount++;
    entryQuery += ` AND task_id = $${pCount}`;
    entryParams.push(task_id);
  } else if (project_id) {
    // If no task, check by project!
    pCount++;
    entryQuery += ` AND project_id = $${pCount} AND task_id IS NULL`;
    entryParams.push(project_id);
  }

  const existingEntry = await pool.query(entryQuery, entryParams);

  if (existingEntry.rowCount > 0) {
    throw new ConflictError("Time entry already exists for this task/project on this date. Please update the existing entry.");
  } else {
    // Insert new entry with project_id
    await pool.query(
      `INSERT INTO timesheet_entries (id, tenant_id, timesheet_id, task_id, project_id, work_date, hours, notes, created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [crypto.randomUUID(), tenantId, timesheetId, task_id || null, project_id || null, work_date, hours, notes || null, userId, userId]
    );
  }

  // 5. Recalculate Total Hours for Timesheet
  const totalResult = await pool.query(
    `SELECT SUM(hours) as total FROM timesheet_entries WHERE timesheet_id = $1`,
    [timesheetId]
  );
  const totalHours = totalResult.rows[0].total || 0;

  await pool.query(
    `UPDATE timesheets SET total_hours = $1, updated_at = NOW() WHERE id = $2`,
    [totalHours, timesheetId]
  );

  const result = await pool.query(
    `SELECT te.*, t.title as task_title, p.name as project_name, ts.status
     FROM timesheet_entries te
     JOIN timesheets ts ON te.timesheet_id = ts.id
     LEFT JOIN tasks t ON te.task_id = t.id
     LEFT JOIN projects p ON te.project_id = p.id OR t.project_id = p.id OR ts.project_id = p.id
     WHERE te.timesheet_id = $1 AND te.work_date = $2 AND (
        (te.task_id = $3) OR (te.task_id IS NULL AND $3 IS NULL AND te.project_id = $4)
     )`,
    [timesheetId, work_date, task_id || null, project_id || null]
  );
  // Fallback if strict selection misses (simplify return)
  if (result.rowCount === 0) return { id: "new", hours, work_date };

  return {
    ...result.rows[0],
    task: task_id ? { id: task_id, title: result.rows[0].task_title } : null,
    project: result.rows[0].project_name ? { id: project_id, name: result.rows[0].project_name } : null
  };
};

/**
 * GET MY TIMESHEET ENTRIES (Flattened)
 */
exports.getMyTimesheetEntries = async (tenantId, employeeId, filters = {}) => {
  const { project_id, week_start_date, start_date, end_date, limit = 20, offset = 0 } = filters;

  // Updated query to prefer entry project_id, then task project_id, then header project_id
  let query = `SELECT te.*, ts.status, ts.week_start_date, ts.week_end_date,
               ts.approved_at, ts.rejection_reason,
               approver_e.first_name as approver_first_name, approver_e.last_name as approver_last_name,
               t.title as task_title, 
               COALESCE(p_entry.name, p_task.name, p_header.name) as project_name,
               COALESCE(p_entry.id, p_task.id, p_header.id) as real_project_id,
               te.is_billable
               FROM timesheet_entries te
               JOIN timesheets ts ON te.timesheet_id = ts.id
               LEFT JOIN tasks t ON te.task_id = t.id
               LEFT JOIN projects p_entry ON te.project_id = p_entry.id
               LEFT JOIN projects p_task ON t.project_id = p_task.id
               LEFT JOIN projects p_header ON ts.project_id = p_header.id
               LEFT JOIN users approver_u ON ts.approved_by = approver_u.id
               LEFT JOIN employees approver_e ON approver_u.id = approver_e.user_id
               WHERE ts.tenant_id = $1 AND ts.employee_id = $2`;

  const params = [tenantId, employeeId];
  let paramCount = 2;

  if (project_id) {
    paramCount++;
    query += ` AND (p_entry.id = $${paramCount} OR p_task.id = $${paramCount} OR p_header.id = $${paramCount})`;
    params.push(project_id);
  }

  if (week_start_date) {
    paramCount++;
    query += ` AND ts.week_start_date = $${paramCount}`;
    params.push(week_start_date);
  }

  if (start_date) {
    paramCount++;
    query += ` AND te.work_date >= $${paramCount}`;
    params.push(start_date);
  }

  if (end_date) {
    paramCount++;
    query += ` AND te.work_date <= $${paramCount}`;
    params.push(end_date);
  }

  // Count
  const countQuery = `SELECT COUNT(*) as count FROM timesheet_entries te
               JOIN timesheets ts ON te.timesheet_id = ts.id
               LEFT JOIN tasks t ON te.task_id = t.id
               LEFT JOIN projects p_entry ON te.project_id = p_entry.id
               LEFT JOIN projects p_task ON t.project_id = p_task.id
               LEFT JOIN projects p_header ON ts.project_id = p_header.id
               WHERE ts.tenant_id = $1 AND ts.employee_id = $2
               ${project_id ? ` AND (p_entry.id = '${project_id}' OR p_task.id = '${project_id}' OR p_header.id = '${project_id}')` : ''}
               ${week_start_date ? ` AND ts.week_start_date = '${week_start_date}'` : ''}
               ${start_date ? ` AND te.work_date >= '${start_date}'` : ''}
               ${end_date ? ` AND te.work_date <= '${end_date}'` : ''}`;
  const countResult = await pool.query(countQuery, [tenantId, employeeId]);

  // Sorting
  query += ` ORDER BY te.work_date DESC, te.created_at DESC`;

  // Pagination
  query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Need total count (simplified)
  const total = parseInt(countResult?.rows?.[0]?.count || 0);

  return {
    entries: result.rows.map(row => ({
      id: row.id,
      timesheet_id: row.timesheet_id,
      work_date: row.work_date,
      hours: row.hours,
      notes: row.notes,
      status: row.status,
      week_start_date: row.week_start_date,
      week_end_date: row.week_end_date,
      project_id: row.real_project_id || row.project_id || null,
      task_id: row.task_id || null,
      project_name: row.project_name,
      approved_at: row.approved_at,
      rejection_reason: row.rejection_reason,
      approver: row.approver_first_name ? {
        first_name: row.approver_first_name,
        last_name: row.approver_last_name
      } : null,
      project: row.project_name ? { id: row.real_project_id, name: row.project_name } : null,
      task: row.task_id ? { id: row.task_id, title: row.task_title } : null,
      is_billable: row.is_billable !== false
    })),
    pagination: {
      total,
      limit,
      offset
    }
  };
};

/**
 * CREATE TIMESHEET WITH ENTRIES
 * - Reuses existing sheet for the same week (deletes old entries first)
 * - Sets status to SUBMITTED so it enters the approval queue
 */
exports.createTimesheet = async (tenantId, userId, employeeId, data) => {
  const { project_id, week_start_date, week_end_date, entries, status } = data;

  // Validate Project Members for billable entries
  for (const entry of entries) {
    if (entry.project_id) {
      const isMember = await exports.isProjectMember(tenantId, entry.project_id, employeeId);
      if (!isMember) {
        throw new BadRequestError("Employee must be a project member to log billable time");
      }
    }
  }

  // Validate daily hours
  const hoursByDate = {};
  for (const entry of entries) {
    const dateKey = entry.work_date;
    hoursByDate[dateKey] = (hoursByDate[dateKey] || 0) + entry.hours;
    if (hoursByDate[dateKey] > 24) throw new BadRequestError(`Exceeds 24h on ${dateKey}`);
  }

  // Check if a sheet already exists for this week
  const existingSheet = await pool.query(
    `SELECT id, status FROM timesheets WHERE tenant_id = $1 AND employee_id = $2 AND week_start_date = $3 AND (project_id IS NULL OR project_id = $4)`,
    [tenantId, employeeId, week_start_date, project_id || null]
  );

  let timesheetId;
  if (existingSheet.rowCount > 0) {
    const sheet = existingSheet.rows[0];
    // Only allow re-submission for DRAFT or REJECTED sheets
    if (sheet.status === 'APPROVED') {
      throw new BadRequestError('This week\'s timesheet is already approved and cannot be modified');
    }
    // Allow editing SUBMITTED sheets (implicit recall or correction)


    timesheetId = sheet.id;
    // Delete old entries before inserting fresh ones (prevents duplicates)
    await pool.query(
      `DELETE FROM timesheet_entries WHERE timesheet_id = $1 AND tenant_id = $2`,
      [timesheetId, tenantId]
    );
  } else {
    timesheetId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO timesheets (id, tenant_id, employee_id, project_id, week_start_date, week_end_date, total_hours, status, created_by, updated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 0, 'DRAFT', $7, $8, NOW(), NOW())`,
      [timesheetId, tenantId, employeeId, project_id || null, week_start_date, week_end_date, userId, userId]
    );
  }

  // Insert fresh entries
  for (const entry of entries) {
    // Resolve is_billable: entry-level override > project default > true
    let entryBillable = true;
    if (typeof entry.is_billable === 'boolean') {
      entryBillable = entry.is_billable;
    } else if (entry.project_id) {
      const projResult = await pool.query('SELECT is_billable FROM projects WHERE id = $1 AND tenant_id = $2', [entry.project_id, tenantId]);
      if (projResult.rows[0]) entryBillable = projResult.rows[0].is_billable !== false;
    }

    await pool.query(
      `INSERT INTO timesheet_entries (id, tenant_id, timesheet_id, task_id, project_id, work_date, hours, notes, is_billable, created_by, updated_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
      [crypto.randomUUID(), tenantId, timesheetId, entry.task_id || null, entry.project_id || null, entry.work_date, entry.hours, entry.notes || null, entryBillable, userId, userId]
    );
  }

  // Update total hours and set status
  // Default to SUBMITTED if no status provided (legacy behavior), but strictly use passed status if valid.
  const finalStatus = status || 'SUBMITTED';

  await pool.query(
    `UPDATE timesheets SET 
      total_hours = (SELECT COALESCE(SUM(hours), 0) FROM timesheet_entries WHERE timesheet_id = $1), 
      status = $2, 
      submitted_at = ${finalStatus === 'SUBMITTED' ? 'NOW()' : 'submitted_at'}, 
      updated_by = $3, 
      updated_at = NOW() 
    WHERE id = $1`,
    [timesheetId, finalStatus, userId]
  );

  return await exports.getTimesheetById(tenantId, timesheetId);
};

/**
 * GET TIMESHEET BY ID
 */
exports.getTimesheetById = async (tenantId, timesheetId) => {
  const result = await pool.query(
    `SELECT t.*, p.name as project_name, e.first_name, e.last_name
     FROM timesheets t
     LEFT JOIN projects p ON t.project_id = p.id
     LEFT JOIN employees e ON t.employee_id = e.id
     WHERE t.id = $1 AND t.tenant_id = $2`,
    [timesheetId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError("Timesheet not found");
  }

  const timesheet = result.rows[0];
  return {
    ...timesheet,
    project: timesheet.project_name ? { id: timesheet.project_id, name: timesheet.project_name } : null,
    employee: timesheet.first_name ? {
      id: timesheet.employee_id,
      first_name: timesheet.first_name,
      last_name: timesheet.last_name
    } : null
  };
};

/**
 * LIST MY TIMESHEETS
 */
exports.getMyTimesheets = async (tenantId, employeeId, filters = {}) => {
  const { project_id, status, week_start_date, skip = 0, limit = 20 } = filters;

  let query = `SELECT t.*, p.name as project_name, e.first_name, e.last_name FROM timesheets t
               LEFT JOIN projects p ON t.project_id = p.id
               LEFT JOIN employees e ON t.employee_id = e.id
               WHERE t.tenant_id = $1 AND t.employee_id = $2`;
  const params = [tenantId, employeeId];
  let paramCount = 2;

  if (project_id) {
    paramCount++;
    query += ` AND t.project_id = $${paramCount}`;
    params.push(project_id);
  }

  if (status) {
    paramCount++;
    query += ` AND t.status = $${paramCount}`;
    params.push(status);
  }

  if (week_start_date) {
    paramCount++;
    query += ` AND t.week_start_date = $${paramCount}`;
    params.push(week_start_date);
  }

  const countQuery = query;
  const countResult = await pool.query(countQuery, params);
  const total = countResult.rowCount;

  paramCount++;
  query += ` ORDER BY t.week_start_date DESC LIMIT $${paramCount}`;
  params.push(limit);

  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(skip);

  const result = await pool.query(query, params);

  return {
    timesheets: result.rows.map(row => ({
      ...row,
      project: row.project_name ? { id: row.project_id, name: row.project_name } : null,
      employee: row.first_name ? {
        id: row.employee_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email
      } : null
    })),
    pagination: {
      total,
      skip,
      limit,
      hasMore: skip + limit < total,
    },
  };
};

/**
 * LIST PENDING APPROVALS (for managers)
 * Returns week-level timesheets with nested entries for week-wise approval view
 */
exports.getPendingApprovals = async (tenantId, userId, filters = {}) => {
  const { skip = 0, limit = 20 } = filters;

  // Get the user's role and employee ID
  const userResult = await pool.query(
    `SELECT u.role, e.id as employee_id 
     FROM users u 
     LEFT JOIN employees e ON u.id = e.user_id 
     WHERE u.id = $1 AND u.tenant_id = $2`,
    [userId, tenantId]
  );

  if (userResult.rows.length === 0) {
    throw new BadRequestError("User not found");
  }

  const { permissions = [], employee_id: managerEmployeeId } = userResult.rows[0];

  const canApproveAll = permissions.includes('projects.approve_timesheet') || permissions.includes('platform.manage_tenants');
  const canApproveTeam = permissions.includes('projects.approve_timesheet'); // For now, same permission name, we'll check reports_to below

  // First get the submitted timesheets (week-level)
  let tsQuery = `SELECT ts.*, 
                        e.first_name, e.last_name, u.email, u.role as employee_role, sh.week_offs as shift_week_offs,
                        p.name as project_name
                 FROM timesheets ts
                 LEFT JOIN employees e ON ts.employee_id = e.id
                 LEFT JOIN users u ON e.user_id = u.id
                 LEFT JOIN shifts sh ON sh.id = e.shift_id
                 LEFT JOIN projects p ON ts.project_id = p.id
                 WHERE ts.tenant_id = $1 AND ts.status = 'SUBMITTED'`;
  const params = [tenantId];

  // If user can only approve for their team, filter by reports_to
  if (!canApproveAll && canApproveTeam && managerEmployeeId) {
    tsQuery += ` AND e.reports_to = $2`;
    params.push(managerEmployeeId);
  } else if (!canApproveAll) {
    // If no permission to approve, show nothing
    tsQuery += ` AND 1=0`;
  }

  // Count for pagination
  const countResult = await pool.query(
    tsQuery.replace(/SELECT ts\.\*.*?FROM/s, 'SELECT COUNT(*) as count FROM'),
    params
  );
  const total = parseInt(countResult.rows[0]?.count || 0);

  tsQuery += ` ORDER BY ts.submitted_at DESC, ts.week_start_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, skip);

  const tsResult = await pool.query(tsQuery, params);

  // For each timesheet, fetch its entries
  const timesheets = [];
  for (const ts of tsResult.rows) {
    const entriesResult = await pool.query(
      `SELECT te.*, 
              COALESCE(p_entry.name, p_task.name) as project_name,
              tk.title as task_title
       FROM timesheet_entries te
       LEFT JOIN projects p_entry ON te.project_id = p_entry.id
       LEFT JOIN tasks tk ON te.task_id = tk.id
       LEFT JOIN projects p_task ON tk.project_id = p_task.id
       WHERE te.timesheet_id = $1 AND te.tenant_id = $2
       ORDER BY te.work_date ASC`,
      [ts.id, tenantId]
    );

    timesheets.push({
      id: ts.id,
      week_start_date: ts.week_start_date,
      week_end_date: ts.week_end_date,
      total_hours: ts.total_hours,
      status: ts.status,
      submitted_at: ts.submitted_at,
      project_name: ts.project_name,
      employee: {
        id: ts.employee_id,
        first_name: ts.first_name,
        last_name: ts.last_name,
        email: ts.email,
        role: ts.employee_role,
        shift_week_offs: ts.shift_week_offs
      },
      entries: entriesResult.rows.map(e => ({
        id: e.id,
        work_date: e.work_date,
        hours: e.hours,
        notes: e.notes,
        project_id: e.project_id,
        task_id: e.task_id,
        project_name: e.project_name,
        task_title: e.task_title
      }))
    });
  }

  return {
    timesheets,
    pagination: {
      total,
      skip,
      limit,
      hasMore: skip + limit < total,
    },
  };
};

/**
 * SUBMIT TIMESHEET
 */
exports.submitTimesheet = async (tenantId, userId, timesheetId) => {
  const timesheet = await exports.getTimesheetById(tenantId, timesheetId);

  if (timesheet.status !== "DRAFT") {
    throw new BadRequestError("Only draft timesheets can be submitted");
  }

  await pool.query(
    `UPDATE timesheets SET status = $1, submitted_at = NOW(), updated_by = $2, updated_at = NOW()
    WHERE id = $3 AND tenant_id = $4`,
    ["SUBMITTED", userId, timesheetId, tenantId]
  );

  return await exports.getTimesheetById(tenantId, timesheetId);
};

/**
 * BULK APPROVE TIMESHEETS
 */
exports.bulkApproveTimesheets = async (tenantId, userId, timesheetIds) => {
  if (!Array.isArray(timesheetIds) || timesheetIds.length === 0) {
    throw new BadRequestError("No timesheets selected");
  }

  // Get approver's details (role and employee ID)
  const approverResult = await pool.query(
    `SELECT u.role, e.id as employee_id 
     FROM users u 
     LEFT JOIN employees e ON u.id = e.user_id 
     WHERE u.id = $1 AND u.tenant_id = $2`,
    [userId, tenantId]
  );

  if (approverResult.rows.length === 0) {
    throw new BadRequestError("Approver not found");
  }

  const { permissions = [], employee_id: approverEmployeeId } = approverResult.rows[0];

  const results = [];
  const errors = [];

  for (const timesheetId of timesheetIds) {
    try {
      const timesheet = await exports.getTimesheetById(tenantId, timesheetId);

      if (timesheet.status !== "SUBMITTED") {
        errors.push({ id: timesheetId, error: "Only submitted timesheets can be approved" });
        continue;
      }

      // Prevent self-approval
      if (approverEmployeeId && timesheet.employee_id === approverEmployeeId) {
        errors.push({ id: timesheetId, error: "You cannot approve your own timesheet" });
        continue;
      }

      // If approver can only approve for their team, ensure same
      const canApproveAll = permissions.includes('projects.approve_timesheet') || permissions.includes('platform.manage_tenants');
      if (!canApproveAll && approverEmployeeId) {
        const employeeResult = await pool.query(
          `SELECT reports_to FROM employees WHERE id = $1 AND tenant_id = $2`,
          [timesheet.employee_id, tenantId]
        );
        if (employeeResult.rows[0]?.reports_to !== approverEmployeeId) {
          errors.push({ id: timesheetId, error: "Unauthorized for this employee" });
          continue;
        }
      }

      await pool.query(
        `UPDATE timesheets SET status = $1, approved_by = $2, approved_at = NOW(), updated_by = $3, updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5`,
        ["APPROVED", userId, userId, timesheetId, tenantId]
      );
      results.push(timesheetId);
    } catch (error) {
      errors.push({ id: timesheetId, error: error.message });
    }
  }

  return { results, errors };
};

/**
 * APPROVE TIMESHEET
 */
exports.approveTimesheet = async (tenantId, userId, timesheetId) => {
  const timesheet = await exports.getTimesheetById(tenantId, timesheetId);

  if (timesheet.status !== "SUBMITTED") {
    throw new BadRequestError("Only submitted timesheets can be approved");
  }

  // Get approver's details (role and employee ID)
  const approverResult = await pool.query(
    `SELECT u.role, e.id as employee_id 
     FROM users u 
     LEFT JOIN employees e ON u.id = e.user_id 
     WHERE u.id = $1 AND u.tenant_id = $2`,
    [userId, tenantId]
  );

  if (approverResult.rows.length === 0) {
    throw new BadRequestError("Approver not found");
  }

  const { permissions = [], employee_id: approverEmployeeId } = approverResult.rows[0];

  // Prevent self-approval
  if (approverEmployeeId && timesheet.employee_id === approverEmployeeId) {
    throw new BadRequestError("You cannot approve your own timesheet");
  }

  // If approver can only approve for their team, ensure same
  const canApproveAll = permissions.includes('projects.approve_timesheet') || permissions.includes('platform.manage_tenants');
  if (!canApproveAll && approverEmployeeId) {
    const employeeResult = await pool.query(
      `SELECT reports_to FROM employees WHERE id = $1 AND tenant_id = $2`,
      [timesheet.employee_id, tenantId]
    );
    if (employeeResult.rows[0]?.reports_to !== approverEmployeeId) {
      throw new ForbiddenError("You can only approve timesheets of employees who report to you");
    }
  }

  await pool.query(
    `UPDATE timesheets SET status = $1, approved_by = $2, approved_at = NOW(), updated_by = $3, updated_at = NOW()
    WHERE id = $4 AND tenant_id = $5`,
    ["APPROVED", userId, userId, timesheetId, tenantId]
  );

  return await exports.getTimesheetById(tenantId, timesheetId);
};

/**
 * REJECT TIMESHEET
 */
exports.rejectTimesheet = async (tenantId, userId, timesheetId, rejectionReason) => {
  const timesheet = await exports.getTimesheetById(tenantId, timesheetId);

  if (timesheet.status !== "SUBMITTED") {
    throw new BadRequestError("Only submitted timesheets can be rejected");
  }

  // Get processor's details
  const processorResult = await pool.query(
    `SELECT u.role, e.id as employee_id 
     FROM users u 
     LEFT JOIN employees e ON u.id = e.user_id 
     WHERE u.id = $1 AND u.tenant_id = $2`,
    [userId, tenantId]
  );

  const { permissions = [], employee_id: processorEmployeeId } = processorResult.rows[0];

  // If processor can only reject for their team, ensure same
  const canApproveAll = permissions.includes('projects.approve_timesheet') || permissions.includes('platform.manage_tenants');
  if (!canApproveAll && processorEmployeeId) {
    const employeeResult = await pool.query(
      `SELECT reports_to FROM employees WHERE id = $1 AND tenant_id = $2`,
      [timesheet.employee_id, tenantId]
    );
    if (employeeResult.rows[0]?.reports_to !== processorEmployeeId) {
      throw new ForbiddenError("You can only reject timesheets of employees who report to you");
    }
  }

  await pool.query(
    `UPDATE timesheets SET status = $1, rejection_reason = $2, updated_by = $3, updated_at = NOW()
    WHERE id = $4 AND tenant_id = $5`,
    ["REJECTED", rejectionReason, userId, timesheetId, tenantId]
  );

  return await exports.getTimesheetById(tenantId, timesheetId);
};

/**
 * ============================================================================
 * REPORT SERVICES
 * ============================================================================
 */

/**
 * GET PROJECT-WISE HOURS REPORT
 */
exports.getProjectReport = async (tenantId, projectId, filters = {}) => {
  const { start_date, end_date } = filters;

  await this.getProjectById(tenantId, projectId);

  let query = `SELECT
    p.id, p.name as project_name,
    COUNT(DISTINCT ts.id) as total_timesheets,
    SUM(te.hours) as total_hours,
    ARRAY_AGG(DISTINCT e.first_name || ' ' || e.last_name) as employees,
    AVG(ts.total_hours) as avg_hours_per_timesheet
  FROM projects p
  LEFT JOIN timesheets ts ON p.id = ts.project_id AND ts.tenant_id = $1 AND ts.status IN ('APPROVED', 'SUBMITTED')
  LEFT JOIN timesheet_entries te ON ts.id = te.timesheet_id
  LEFT JOIN employees e ON ts.employee_id = e.id
  WHERE p.id = $2 AND p.tenant_id = $1`;
  const params = [tenantId, projectId];
  let paramCount = 2;

  if (start_date) {
    paramCount++;
    query += ` AND ts.week_start_date >= $${paramCount}`;
    params.push(start_date);
  }

  if (end_date) {
    paramCount++;
    query += ` AND ts.week_end_date <= $${paramCount}`;
    params.push(end_date);
  }

  query += ` GROUP BY p.id, p.name`;

  const result = await pool.query(query, params);

  return result.rows[0] || {
    project_id: projectId,
    total_hours: 0,
    total_timesheets: 0,
    employees: [],
  };
};

/**
 * GET CLIENT-WISE HOURS REPORT
 */
exports.getClientReport = async (tenantId, clientId, filters = {}) => {
  const { start_date, end_date } = filters;

  await this.getClientById(tenantId, clientId);

  let query = `SELECT
    c.id, c.name as client_name,
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT ts.id) as total_timesheets,
    SUM(te.hours) as total_hours,
    ARRAY_AGG(DISTINCT p.name) as projects
  FROM clients c
  LEFT JOIN projects p ON c.id = p.client_id
  LEFT JOIN timesheets ts ON p.id = ts.project_id AND ts.tenant_id = $1 AND ts.status IN ('APPROVED', 'SUBMITTED')
  LEFT JOIN timesheet_entries te ON ts.id = te.timesheet_id
  WHERE c.id = $2 AND c.tenant_id = $1`;
  const params = [tenantId, clientId];
  let paramCount = 2;

  if (start_date) {
    paramCount++;
    query += ` AND ts.week_start_date >= $${paramCount}`;
    params.push(start_date);
  }

  if (end_date) {
    paramCount++;
    query += ` AND ts.week_end_date <= $${paramCount}`;
    params.push(end_date);
  }

  query += ` GROUP BY c.id, c.name`;

  const result = await pool.query(query, params);

  return result.rows[0] || {
    client_id: clientId,
    total_hours: 0,
    total_projects: 0,
    total_timesheets: 0,
  };
};

/**
 * GET EMPLOYEE UTILIZATION REPORT
 */
exports.getUtilizationReport = async (tenantId, filters = {}) => {
  const { start_date, end_date, skip = 0, limit = 20 } = filters;

  let query = `SELECT
    e.id, e.first_name, e.last_name, u.email,
    COUNT(DISTINCT ts.id) as timesheets_submitted,
    SUM(te.hours) as total_hours_logged,
    ROUND(SUM(te.hours) / 40.0 * 100, 2) as utilization_percent,
    COUNT(DISTINCT p.id) as projects_assigned
  FROM employees e
  LEFT JOIN users u ON e.user_id = u.id
  LEFT JOIN timesheets ts ON e.id = ts.employee_id AND ts.tenant_id = $1 AND ts.status IN ('APPROVED', 'SUBMITTED')
  LEFT JOIN timesheet_entries te ON ts.id = te.timesheet_id
  LEFT JOIN tasks t ON te.task_id = t.id
  LEFT JOIN projects p ON t.project_id = p.id
  WHERE e.tenant_id = $1`;
  const params = [tenantId];
  let paramCount = 1;

  if (start_date) {
    paramCount++;
    query += ` AND ts.week_start_date >= $${paramCount}`;
    params.push(start_date);
  }

  if (end_date) {
    paramCount++;
    query += ` AND ts.week_end_date <= $${paramCount}`;
    params.push(end_date);
  }

  const countQuery = `SELECT COUNT(DISTINCT e.id) as count FROM employees e
                      LEFT JOIN timesheets ts ON e.id = ts.employee_id AND e.tenant_id = ts.tenant_id
                      WHERE e.tenant_id = $1`;
  const countParams = [tenantId];
  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  query += ` GROUP BY e.id, e.first_name, e.last_name, u.email
             ORDER BY utilization_percent DESC
             LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, skip);

  const result = await pool.query(query, params);

  return {
    employees: result.rows,
    pagination: {
      total,
      skip,
      limit,
      hasMore: skip + limit < total,
    },
  };
};

/**
 * ============================================================================
 * TASK COMMENTS SERVICES
 * ============================================================================
 */

/**
 * CREATE COMMENT
 * Anyone can comment on any task
 */
exports.createComment = async (tenantId, userId, taskId, data) => {
  const { content, mentions = [] } = data;

  // Verify task exists
  await this.getTaskById(tenantId, taskId);

  const commentId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO task_comments (id, tenant_id, task_id, user_id, content, mentions, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [commentId, tenantId, taskId, userId, content, mentions]
  );

  return await this.getCommentById(tenantId, commentId);
};

/**
 * GET COMMENT BY ID
 */
exports.getCommentById = async (tenantId, commentId) => {
  const result = await pool.query(
    `SELECT c.*, 
            u.email as user_email,
            COALESCE(e.first_name, u.email) as user_first_name,
            COALESCE(e.last_name, '') as user_last_name
     FROM task_comments c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN employees e ON u.id = e.user_id AND e.tenant_id = c.tenant_id
     WHERE c.id = $1 AND c.tenant_id = $2`,
    [commentId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError("Comment not found");
  }

  const row = result.rows[0];
  return {
    id: row.id,
    task_id: row.task_id,
    user_id: row.user_id,
    content: row.content,
    mentions: row.mentions || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: {
      id: row.user_id,
      email: row.user_email,
      first_name: row.user_first_name,
      last_name: row.user_last_name
    }
  };
};

/**
 * LIST COMMENTS FOR A TASK
 */
exports.listComments = async (tenantId, taskId) => {
  // Verify task exists
  await this.getTaskById(tenantId, taskId);

  const result = await pool.query(
    `SELECT c.*, 
            u.email as user_email,
            COALESCE(e.first_name, u.email) as user_first_name,
            COALESCE(e.last_name, '') as user_last_name
     FROM task_comments c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN employees e ON u.id = e.user_id AND e.tenant_id = c.tenant_id
     WHERE c.task_id = $1 AND c.tenant_id = $2
     ORDER BY c.created_at ASC`,
    [taskId, tenantId]
  );

  return result.rows.map(row => ({
    id: row.id,
    task_id: row.task_id,
    user_id: row.user_id,
    content: row.content,
    mentions: row.mentions || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: {
      id: row.user_id,
      email: row.user_email,
      first_name: row.user_first_name,
      last_name: row.user_last_name
    }
  }));
};

/**
 * UPDATE COMMENT
 * Only comment creator can update
 */
exports.updateComment = async (tenantId, userId, commentId, data, options = {}) => {
  const { role } = options;
  const existingComment = await this.getCommentById(tenantId, commentId);

  // Only creator or ADMIN can update
  if (existingComment.user_id !== userId && role !== 'ADMIN') {
    throw new ForbiddenError("You can only edit your own comments");
  }

  const { content, mentions = existingComment.mentions } = data;

  await pool.query(
    `UPDATE task_comments SET content = $1, mentions = $2, updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4`,
    [content, mentions, commentId, tenantId]
  );

  return await this.getCommentById(tenantId, commentId);
};

/**
 * DELETE COMMENT
 * Creator or ADMIN can delete
 */
exports.deleteComment = async (tenantId, userId, commentId, options = {}) => {
  const { role } = options;
  const existingComment = await this.getCommentById(tenantId, commentId);

  // Only creator or ADMIN can delete
  if (existingComment.user_id !== userId && role !== 'ADMIN') {
    throw new ForbiddenError("You can only delete your own comments");
  }

  await pool.query(
    `DELETE FROM task_comments WHERE id = $1 AND tenant_id = $2`,
    [commentId, tenantId]
  );

  return { success: true, message: "Comment deleted successfully" };
};

/**
 * GET MENTIONABLE USERS FOR A PROJECT
 * Returns project members that can be @mentioned
 */
exports.getMentionableUsers = async (tenantId, projectId) => {
  const result = await pool.query(
    `SELECT DISTINCT u.id, u.email, e.first_name, e.last_name
     FROM project_members pm
     JOIN employees e ON pm.employee_id = e.id
     JOIN users u ON e.user_id = u.id
     WHERE pm.tenant_id = $1 AND pm.project_id = $2
     ORDER BY e.first_name, e.last_name`,
    [tenantId, projectId]
  );

  return result.rows.map(row => ({
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    display_name: `${row.first_name} ${row.last_name}`.trim() || row.email
  }));
};

/**
 * GET DASHBOARD STATS
 * Aggregates data server-side for performance and consistency.
 * Productivity Score Logic: Billable Utilization Rate (Billable Hours / Total Hours * 100)
 */
exports.getDashboardStats = async (tenantId, userId, employeeId, role) => {
  // Determine date range (Last 30 days)
  const endDate = moment();
  const startDate = moment().subtract(30, 'days');

  // Base query conditions
  let query = `
    SELECT 
      te.*,
      p.name as project_name,
      t.title as task_title
    FROM timesheet_entries te
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN tasks t ON te.task_id = t.id
    WHERE te.tenant_id = $1
      AND te.work_date >= $2
      AND te.work_date <= $3
  `;
  const params = [tenantId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')];

  // For "My Dashboard" context (Timesheets page), filter by employee_id unless specifically requesting org-wide
  // Since frontend uses "getMyTimesheetEntries", we assume this is "My Dashboard"
  query += ` AND te.employee_id = $4`;
  params.push(employeeId);

  const result = await pool.query(query, params);
  const entries = result.rows;

  // --- Stats Calculation ---
  const totalHours = entries.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
  // Respect is_billable flag from DB
  const billableHours = entries.reduce((acc, curr) => acc + (curr.is_billable !== false ? (Number(curr.hours) || 0) : 0), 0);

  const totalWholeHours = Math.floor(totalHours);
  const totalMinutes = Math.round((totalHours - totalWholeHours) * 60);

  const billableWholeHours = Math.floor(billableHours);
  const billableMinutes = Math.round((billableHours - billableWholeHours) * 60);

  // --- Charts Calculation (Last 7 Days) ---
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    last7Days.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
  }

  const timeLogged = last7Days.map(date => {
    // Match date string from DB (YYYY-MM-DD)
    const daysEntries = entries.filter(e => moment(e.work_date).format('YYYY-MM-DD') === date);
    const hours = daysEntries.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
    const dateObj = moment(date);
    return {
      date: `${dateObj.date()} ${dateObj.format('MMM')}`,
      time: hours
    };
  });

  const billableVsNonBillable = last7Days.map(date => {
    const daysEntries = entries.filter(e => moment(e.work_date).format('YYYY-MM-DD') === date);
    const billable = daysEntries.filter(e => e.is_billable !== false).reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
    const nonBillable = daysEntries.filter(e => e.is_billable === false).reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
    return {
      date: moment(date).date().toString(),
      billable,
      nonBillable
    };
  });

  // --- Breakdown Calculation ---
  const projectMap = {};
  const taskMap = {};

  entries.forEach(e => {
    const pName = e.project_name || 'Unassigned';
    projectMap[pName] = (projectMap[pName] || 0) + (Number(e.hours) || 0);

    const tName = e.task_title || (e.project_name ? `${e.project_name} Task` : 'Unknown Task');
    taskMap[tName] = (taskMap[tName] || 0) + (Number(e.hours) || 0);
  });

  const projects = Object.keys(projectMap).map((name, i) => ({
    name,
    time: `${Math.round(projectMap[name] * 10) / 10}h`,
    color: ['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-blue-500'][i % 4]
  }));

  const task_types = Object.keys(taskMap).slice(0, 5).map((name, i) => ({
    name,
    time: `${Math.round(taskMap[name] * 10) / 10}h`,
    color: ['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-blue-500'][i % 4]
  }));

  return {
    stats: {
      total_time: {
        hours: totalWholeHours,
        minutes: totalMinutes,
        trend: 0
      },
      billable_hours: {
        hours: billableWholeHours,
        minutes: billableMinutes,
        trend: 0,
        label: `${billableWholeHours}h${billableMinutes.toString().padStart(2, '0')}`
      },
      productivity_score: {
        value: totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0,
        trend: 0
      }
    },
    charts: {
      time_logged: timeLogged,
      billable_vs_non_billable: billableVsNonBillable
    },
    breakdown: {
      task_types,
      projects,
      plans: projects // Match frontend expectation
    }
  };
};
