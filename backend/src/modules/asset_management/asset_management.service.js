const pool = require("../../config/db");
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError
} = require("../../utils/customErrors");
const crypto = require("crypto");
const JsBarcode = require("jsbarcode");
const Canvas = require("canvas");
const logger = require("../../config/logger");

/**
 * CREATE ASSET
 * Creates a new asset in the system
 */
exports.createAsset = async (
  tenantId,
  userId,
  {
    asset_code,
    name,
    category,
    description,
    purchase_date,
    purchase_price,
    manufacturer,
    serial_number,
    warranty_expiry,
    status,
    notes,
    operating_system,
    processor_cpu,
    ram,
    storage,
    graphics_gpu,
    display,
    battery,
    model_number
  }
) => {
  // Check if asset_code already exists within this tenant
  const existingAsset = await pool.query(
    `SELECT id FROM assets WHERE tenant_id = $1 AND asset_code = $2`,
    [tenantId, asset_code]
  );

  if (existingAsset.rowCount > 0) {
    throw new ConflictError(`Asset code '${asset_code}' already exists`);
  }

  const assetId = crypto.randomUUID();
  const result = await pool.query(
    `INSERT INTO assets (
      id, tenant_id, asset_code, name, category, description,
      purchase_date, purchase_price, manufacturer, serial_number,
      warranty_expiry, operating_system, processor_cpu, ram, storage,
      graphics_gpu, display, battery, model_number,
      status, notes, created_by, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
    )
    RETURNING *`,
    [
      assetId,
      tenantId,
      asset_code,
      name,
      category,
      description || null,
      purchase_date || null,
      purchase_price || null,
      manufacturer || null,
      serial_number || null,
      warranty_expiry || null,
      operating_system || null,
      processor_cpu || null,
      ram || null,
      storage || null,
      graphics_gpu || null,
      display || null,
      battery || null,
      model_number || null,
      status || "AVAILABLE",
      notes || null,
      userId
    ]
  );

  // Create initial tracking entry
  await pool.query(
    `INSERT INTO asset_tracking (
      id, asset_id, tenant_id, event_type, description, created_by, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, NOW()
    )`,
    [
      crypto.randomUUID(),
      assetId,
      tenantId,
      "CREATED",
      "Asset created in system",
      userId
    ]
  );

  return result.rows[0];
};

/**
 * LIST ASSETS
 * Lists all assets for the tenant with optional filters
 */
exports.listAssets = async (
  tenantId,
  filters = {},
  userRole,
  employeeId
) => {
  let query = `
    SELECT 
      a.*,
      e.id as assigned_emp_id, e.first_name as assigned_first_name, e.last_name as assigned_last_name,
      ab.id as assigned_by_emp_id, ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name
    FROM assets a
    LEFT JOIN employees e ON a.assigned_to = e.id
    LEFT JOIN employees ab ON a.assigned_by = ab.user_id
    WHERE a.tenant_id = $1
  `;
  const params = [tenantId];
  let paramCount = 1;

  // Role-based filtering
  if (userRole === "EMPLOYEE") {
    // Employees can only see assets assigned to them
    query += ` AND a.assigned_to = $${++paramCount}`;
    params.push(employeeId);
  }

  // Status filter
  if (filters.status) {
    query += ` AND a.status = $${++paramCount}`;
    params.push(filters.status);
  }

  // Category filter
  if (filters.category) {
    query += ` AND a.category = $${++paramCount}`;
    params.push(filters.category);
  }

  // Assigned to filter (for managers/HR)
  if (filters.assigned_to && userRole !== "EMPLOYEE") {
    query += ` AND a.assigned_to = $${++paramCount}`;
    params.push(filters.assigned_to);
  }

  // Add pagination
  const skip = filters.skip || 0;
  const limit = filters.limit || 20;
  query += ` ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${skip}`;

  const result = await pool.query(query, params);

  // Map results to include employee objects
  const assets = result.rows.map(row => {
    const asset = { ...row };

    // Create assigned_employee object if assigned_to exists
    if (row.assigned_emp_id) {
      asset.assigned_employee = {
        id: row.assigned_emp_id,
        first_name: row.assigned_first_name,
        last_name: row.assigned_last_name
      };
    }

    // Create assigned_by_employee object if assigned_by exists
    if (row.assigned_by_emp_id) {
      asset.assigned_by_employee = {
        id: row.assigned_by_emp_id,
        first_name: row.assigned_by_first_name,
        last_name: row.assigned_by_last_name
      };
    }

    // Clean up temporary joined fields
    delete asset.assigned_emp_id;
    delete asset.assigned_first_name;
    delete asset.assigned_last_name;
    delete asset.assigned_by_emp_id;
    delete asset.assigned_by_first_name;
    delete asset.assigned_by_last_name;

    return asset;
  });

  // Get total count for pagination
  let countQuery = `SELECT COUNT(*) as total FROM assets WHERE tenant_id = $1`;
  const countParams = [tenantId];
  let countParamCount = 1;

  if (userRole === "EMPLOYEE") {
    countQuery += ` AND assigned_to = $${++countParamCount}`;
    countParams.push(employeeId);
  }

  if (filters.status) {
    countQuery += ` AND status = $${++countParamCount}`;
    countParams.push(filters.status);
  }

  if (filters.category) {
    countQuery += ` AND category = $${++countParamCount}`;
    countParams.push(filters.category);
  }

  if (filters.assigned_to && userRole !== "EMPLOYEE") {
    countQuery += ` AND assigned_to = $${++countParamCount}`;
    countParams.push(filters.assigned_to);
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total);

  return {
    assets,
    pagination: {
      total,
      skip,
      limit,
      hasMore: skip + limit < total
    }
  };
};

/**
 * GET ASSET BY ID
 * Retrieves a single asset with role-based access control
 */
exports.getAssetById = async (
  tenantId,
  assetId,
  userRole,
  employeeId
) => {
  const result = await pool.query(
    `SELECT 
      a.*,
      e.id as assigned_emp_id, e.first_name as assigned_first_name, e.last_name as assigned_last_name,
      ab.id as assigned_by_emp_id, ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name
    FROM assets a
    LEFT JOIN employees e ON a.assigned_to = e.id
    LEFT JOIN employees ab ON a.assigned_by = ab.user_id
    WHERE a.id = $1 AND a.tenant_id = $2`,
    [assetId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError("Asset not found");
  }

  const row = result.rows[0];
  const asset = { ...row };

  // Create assigned_employee object if assigned_to exists
  if (row.assigned_emp_id) {
    asset.assigned_employee = {
      id: row.assigned_emp_id,
      first_name: row.assigned_first_name,
      last_name: row.assigned_last_name
    };
  }

  // Create assigned_by_employee object if assigned_by exists
  if (row.assigned_by_emp_id) {
    asset.assigned_by_employee = {
      id: row.assigned_by_emp_id,
      first_name: row.assigned_by_first_name,
      last_name: row.assigned_by_last_name
    };
  }

  // Clean up temporary joined fields
  delete asset.assigned_emp_id;
  delete asset.assigned_first_name;
  delete asset.assigned_last_name;
  delete asset.assigned_by_emp_id;
  delete asset.assigned_by_first_name;
  delete asset.assigned_by_last_name;

  // Role-based access control
  if (userRole === "EMPLOYEE" && asset.assigned_to !== employeeId) {
    throw new ForbiddenError(
      "You do not have permission to view this asset"
    );
  }

  return asset;
};

/**
 * UPDATE ASSET
 * Updates asset details (ADMIN only)
 */
exports.updateAsset = async (
  tenantId,
  assetId,
  userId,
  updates
) => {
  // Check if asset exists
  const existingAsset = await pool.query(
    `SELECT * FROM assets WHERE id = $1 AND tenant_id = $2`,
    [assetId, tenantId]
  );

  if (existingAsset.rowCount === 0) {
    throw new NotFoundError("Asset not found");
  }

  // Check for asset_code uniqueness if being updated
  if (updates.asset_code) {
    const codeCheck = await pool.query(
      `SELECT id FROM assets WHERE tenant_id = $1 AND asset_code = $2 AND id != $3`,
      [tenantId, updates.asset_code, assetId]
    );

    if (codeCheck.rowCount > 0) {
      throw new ConflictError(
        `Asset code '${updates.asset_code}' already exists`
      );
    }
  }

  // Build dynamic update query
  const updateFields = [];
  const params = [userId, assetId, tenantId];
  let paramCount = 3;

  Object.keys(updates).forEach(key => {
    updateFields.push(`${key} = $${++paramCount}`);
    params.push(updates[key]);
  });

  if (updateFields.length === 0) {
    return existingAsset.rows[0];
  }

  const query = `
    UPDATE assets
    SET ${updateFields.join(", ")}, updated_by = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3
    RETURNING *
  `;

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * RETIRE ASSET (Soft Delete)
 * Marks asset as RETIRED
 */
exports.retireAsset = async (tenantId, assetId, userId, notes) => {
  // Check if asset exists
  const existingAsset = await pool.query(
    `SELECT * FROM assets WHERE id = $1 AND tenant_id = $2`,
    [assetId, tenantId]
  );

  if (existingAsset.rowCount === 0) {
    throw new NotFoundError("Asset not found");
  }

  // Update status to RETIRED
  const result = await pool.query(
    `UPDATE assets
     SET status = 'RETIRED', updated_by = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3
     RETURNING *`,
    [userId, assetId, tenantId]
  );

  // Create tracking entry
  await pool.query(
    `INSERT INTO asset_tracking (
      id, asset_id, tenant_id, event_type, description, created_by, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, NOW()
    )`,
    [
      crypto.randomUUID(),
      assetId,
      tenantId,
      "RETIRED",
      notes || "Asset retired",
      userId
    ]
  );

  return result.rows[0];
};

/**
 * GENERATE BARCODE
 * Generates barcode in PNG or base64 format for asset_code
 */
exports.generateBarcode = async (tenantId, assetId, format = "base64") => {
  // Get asset to retrieve asset_code
  const result = await pool.query(
    `SELECT asset_code FROM assets WHERE id = $1 AND tenant_id = $2`,
    [assetId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError("Asset not found");
  }

  const { asset_code } = result.rows[0];

  try {
    // Create canvas for barcode
    const canvas = Canvas.createCanvas(200, 100);
    const ctx = canvas.getContext("2d");

    // Generate barcode using jsbarcode with canvas
    JsBarcode(canvas, asset_code, {
      format: "CODE128",
      width: 2,
      height: 70,
      displayValue: true
    });

    if (format === "base64") {
      // Return base64 encoded PNG
      return {
        barcode: canvas.toDataURL("image/png"),
        asset_code,
        format: "png"
      };
    } else if (format === "buffer") {
      // Return buffer
      return {
        barcode: canvas.toBuffer("image/png"),
        asset_code,
        format: "png"
      };
    }

    return {
      barcode: canvas.toDataURL("image/png"),
      asset_code,
      format: "png"
    };
  } catch (error) {
    logger.error("Error generating barcode", { error, asset_code });
    throw new BadRequestError("Failed to generate barcode");
  }
};

/**
 * ASSIGN ASSET
 * Assigns asset to an employee and creates tracking entry
 */
exports.assignAsset = async (
  tenantId,
  assetId,
  userId,
  employeeId,
  notes
) => {
  // Verify asset exists and get current details
  const assetResult = await pool.query(
    `SELECT * FROM assets WHERE id = $1 AND tenant_id = $2`,
    [assetId, tenantId]
  );

  if (assetResult.rowCount === 0) {
    throw new NotFoundError("Asset not found");
  }

  const asset = assetResult.rows[0];

  // Check if asset is already assigned
  if (asset.assigned_to && asset.status === "ASSIGNED") {
    throw new ConflictError(
      "Asset is already assigned. Return it first before reassigning."
    );
  }

  // Verify employee exists within the tenant
  const employeeCheck = await pool.query(
    `SELECT id FROM employees WHERE id = $1 AND tenant_id = $2`,
    [employeeId, tenantId]
  );

  if (employeeCheck.rowCount === 0) {
    throw new NotFoundError("Employee not found");
  }

  // Check if employee already has an asset of this category
  const existingCategoryAsset = await pool.query(
    `SELECT id FROM assets 
     WHERE tenant_id = $1 AND assigned_to = $2 AND category = $3 AND status = 'ASSIGNED'`,
    [tenantId, employeeId, asset.category]
  );

  if (existingCategoryAsset.rowCount > 0) {
    throw new ConflictError(
      `Employee already has a ${asset.category} assigned. Please return it before assigning a new one.`
    );
  }

  // Update asset with assignment

  const updateResult = await pool.query(
    `UPDATE assets
     SET assigned_to = $1, status = 'ASSIGNED', assigned_by = $2, assigned_date = NOW(), updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4
     RETURNING *`,
    [employeeId, userId, assetId, tenantId]
  );

  // Create tracking entry
  await pool.query(
    `INSERT INTO asset_tracking (
      id, asset_id, tenant_id, event_type, description, related_employee_id, created_by, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, NOW()
    )`,
    [
      crypto.randomUUID(),
      assetId,
      tenantId,
      "ASSIGNED",
      notes || `Asset assigned to employee ${employeeId}`,
      employeeId,
      userId
    ]
  );

  // Automatically create usage history entry when asset is assigned
  await pool.query(
    `INSERT INTO asset_usage_history (
      id, asset_id, tenant_id, employee_id, assigned_date, description, created_at
    ) VALUES (
      $1, $2, $3, $4, NOW()::DATE, $5, NOW()
    )`,
    [
      crypto.randomUUID(),
      assetId,
      tenantId,
      employeeId,
      `Asset assigned to employee`
    ]
  );

  return updateResult.rows[0];
};

/**
 * RETURN ASSET
 * Returns asset from employee and creates tracking entry
 */
exports.returnAsset = async (
  tenantId,
  assetId,
  userId,
  return_date,
  condition,
  notes
) => {
  // Verify asset exists
  const assetResult = await pool.query(
    `SELECT * FROM assets WHERE id = $1 AND tenant_id = $2`,
    [assetId, tenantId]
  );

  if (assetResult.rowCount === 0) {
    throw new NotFoundError("Asset not found");
  }

  const asset = assetResult.rows[0];

  if (!asset.assigned_to) {
    throw new BadRequestError("Asset is not currently assigned");
  }

  const returnedDate = return_date;

  // Determine status based on condition
  let newStatus = "AVAILABLE";
  if (condition === "DAMAGED" || condition === "WORN") {
    newStatus = "UNDER_REPAIR";
  } else if (condition === "LOST") {
    newStatus = "RETIRED";
  }

  // Update asset status
  const updateResult = await pool.query(
    `UPDATE assets
     SET assigned_to = NULL, assigned_by = NULL, assigned_date = NULL,
         status = $1, return_date = $2,
         updated_by = $3, updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5
     RETURNING *`,
    [newStatus, returnedDate, userId, assetId, tenantId]
  );

  // Create tracking entry
  const eventType =
    condition === "DAMAGED" ? "DAMAGED" : condition === "LOST" ? "LOST" : condition === "WORN" ? "WORN" : "RETURNED";

  await pool.query(
    `INSERT INTO asset_tracking (
      id, asset_id, tenant_id, event_type, description, related_employee_id, created_by, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, NOW()
    )`,
    [
      crypto.randomUUID(),
      assetId,
      tenantId,
      eventType,
      notes || `Asset returned in ${condition || "GOOD"} condition`,
      asset.assigned_to,
      userId
    ]
  );

  // Update open usage history entry
  await pool.query(
    `UPDATE asset_usage_history
     SET return_date = $1, description = $2
     WHERE asset_id = $3 AND tenant_id = $4 AND return_date IS NULL`,
    [
      returnedDate,
      notes || `Asset returned in ${condition || "GOOD"} condition`,
      assetId,
      tenantId
    ]
  );

  return updateResult.rows[0];
};

/**
 * GET ASSET TRACKING
 * Returns all tracking events for an asset
 */
exports.getAssetTracking = async (tenantId, assetId) => {
  // Verify asset exists
  const assetCheck = await pool.query(
    `SELECT id FROM assets WHERE id = $1 AND tenant_id = $2`,
    [assetId, tenantId]
  );

  if (assetCheck.rowCount === 0) {
    throw new NotFoundError("Asset not found");
  }

  const result = await pool.query(
    `SELECT * FROM asset_tracking
     WHERE asset_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC`,
    [assetId, tenantId]
  );

  return result.rows;
};

/**
 * GET ASSET USAGE HISTORY
 * Returns usage history entries for an asset
 */
exports.getAssetUsageHistory = async (tenantId, assetId) => {
  // Verify asset exists
  const assetCheck = await pool.query(
    `SELECT id FROM assets WHERE id = $1 AND tenant_id = $2`,
    [assetId, tenantId]
  );

  if (assetCheck.rowCount === 0) {
    throw new NotFoundError("Asset not found");
  }

  const result = await pool.query(
    `SELECT 
       h.id, h.asset_id, h.tenant_id, h.employee_id, h.assigned_date, h.return_date,
       h.description, h.created_at,
       e.first_name, e.last_name
     FROM asset_usage_history h
     LEFT JOIN employees e ON h.employee_id = e.id
     WHERE h.asset_id = $1 AND h.tenant_id = $2
     ORDER BY h.assigned_date DESC`,
    [assetId, tenantId]
  );

  return result.rows;
};

/**
 * CREATE ASSET REQUEST
 */
exports.createAssetRequest = async (tenantId, userId, data) => {
  // Get employee ID for the user
  const employeeResult = await pool.query(
    `SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2`,
    [userId, tenantId]
  );

  if (employeeResult.rowCount === 0) {
    throw new BadRequestError("User is not an employee");
  }

  const employeeId = employeeResult.rows[0].id;

  const result = await pool.query(
    `INSERT INTO asset_requests (
      id, tenant_id, employee_id, asset_name, category, priority, reason, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
    ) RETURNING *`,
    [
      crypto.randomUUID(),
      tenantId,
      employeeId,
      data.asset_name,
      data.category,
      data.priority,
      data.reason
    ]
  );

  return result.rows[0];
};

/**
 * LIST ASSET REQUESTS
 */
exports.listAssetRequests = async (tenantId, userId, role) => {
  let query = `
    SELECT 
      r.*,
      e.first_name, e.last_name, e.employee_id as employee_code
    FROM asset_requests r
    JOIN employees e ON r.employee_id = e.id
    WHERE r.tenant_id = $1
  `;
  const params = [tenantId];

  // If not ADMIN/HR, only show personal requests
  if (role !== 'ADMIN' && role !== 'HR') {
    query += ` AND e.user_id = $2`;
    params.push(userId);
  }

  query += ` ORDER BY r.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * HANDLE ASSET REQUEST (Approve/Reject)
 */
exports.handleAssetRequest = async (tenantId, requestId, userId, role, data) => {
  // 1. Get request details
  const requestResult = await pool.query(
    `SELECT r.*, e.user_id 
     FROM asset_requests r
     JOIN employees e ON r.employee_id = e.id
     WHERE r.id = $1 AND r.tenant_id = $2`,
    [requestId, tenantId]
  );

  if (requestResult.rowCount === 0) {
    throw new NotFoundError("Asset request not found");
  }

  const request = requestResult.rows[0];

  // 2. Permission check: HR cannot approve own request
  if (role === 'HR' && request.user_id === userId) {
    throw new ForbiddenError("HR cannot approve or reject their own asset request");
  }

  // 3. Update request
  const result = await pool.query(
    `UPDATE asset_requests
     SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5
     RETURNING *`,
    [data.status, data.admin_notes, userId, requestId, tenantId]
  );

  return result.rows[0];
};
