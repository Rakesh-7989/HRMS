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
const QRCode = require("qrcode");
const logger = require("../../config/logger");
const inboxService = require("../inbox/inbox.service");

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
    model_number,
    useful_life_years,
    depreciation_method,
    location,
    condition
  }
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if asset_code already exists within this tenant
    const existingAsset = await client.query(
      `SELECT id FROM assets WHERE tenant_id = $1 AND asset_code = $2`,
      [tenantId, asset_code]
    );

    if (existingAsset.rowCount > 0) {
      throw new ConflictError(`Asset code '${asset_code}' already exists`);
    }

    // Check for duplicate serial number within tenant
    if (serial_number) {
      const serialCheck = await client.query(
        `SELECT id FROM assets WHERE tenant_id = $1 AND serial_number = $2`,
        [tenantId, serial_number]
      );
      if (serialCheck.rowCount > 0) {
        throw new ConflictError(`Serial number '${serial_number}' already exists`);
      }
    }

    // Date validations
    if (purchase_date) {
      const pd = new Date(purchase_date);
      if (pd > new Date()) {
        throw new BadRequestError("Purchase date cannot be in the future");
      }
      if (warranty_expiry && new Date(warranty_expiry) < pd) {
        throw new BadRequestError("Warranty expiry cannot be before purchase date");
      }
    }

    const assetId = crypto.randomUUID();
    const bookValue = purchase_price || null;

    const result = await client.query(
      `INSERT INTO assets (
        id, tenant_id, asset_code, name, category, description,
        purchase_date, purchase_price, manufacturer, serial_number,
        warranty_expiry, operating_system, processor_cpu, ram, storage,
        graphics_gpu, display, battery, model_number,
        status, notes, book_value, useful_life_years, depreciation_method,
        location, condition,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW(), NOW()
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
        bookValue,
        useful_life_years || null,
        depreciation_method || "STRAIGHT_LINE",
        location || null,
        condition || "NEW",
        userId
      ]
    );

    // Create initial tracking entry
    await client.query(
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

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
    LEFT JOIN employees e ON a.assigned_to = e.id AND e.tenant_id = a.tenant_id
    LEFT JOIN employees ab ON a.assigned_by = ab.user_id AND ab.tenant_id = a.tenant_id
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
    LEFT JOIN employees e ON a.assigned_to = e.id AND e.tenant_id = a.tenant_id
    LEFT JOIN employees ab ON a.assigned_by = ab.user_id AND ab.tenant_id = a.tenant_id
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

  // Calculate current depreciated value
  if (asset.purchase_price && asset.useful_life_years && asset.purchase_date) {
    const purchaseDate = new Date(asset.purchase_date);
    const now = new Date();
    const yearsElapsed = (now - purchaseDate) / (365.25 * 24 * 60 * 60 * 1000);
    const annualDepreciation = asset.purchase_price / asset.useful_life_years;
    const totalDepreciation = Math.min(annualDepreciation * yearsElapsed, asset.purchase_price);
    asset.current_depreciated_value = Math.max(0, Number((asset.purchase_price - totalDepreciation).toFixed(2)));
  } else {
    asset.current_depreciated_value = asset.book_value || asset.purchase_price || null;
  }

  // Warranty status
  if (asset.warranty_expiry) {
    asset.warranty_expired = new Date(asset.warranty_expiry) < new Date();
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

  // Whitelist of columns that can be updated (prevents SQL injection via dynamic keys)
  const ALLOWED_UPDATE_COLUMNS = [
    'asset_code', 'name', 'category', 'description',
    'purchase_date', 'purchase_price', 'manufacturer', 'serial_number',
    'warranty_expiry', 'status', 'notes', 'condition', 'location',
    'operating_system', 'processor_cpu', 'ram', 'storage',
    'graphics_gpu', 'display', 'battery', 'model_number',
    'useful_life_years', 'depreciation_method', 'book_value'
  ];

  // Build dynamic update query — only allow whitelisted columns
  const updateFields = [];
  const params = [userId, assetId, tenantId];
  let paramCount = 3;

  Object.keys(updates).forEach(key => {
    if (ALLOWED_UPDATE_COLUMNS.includes(key)) {
      updateFields.push(`${key} = $${++paramCount}`);
      params.push(updates[key]);
    }
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if asset exists (with row lock)
    const existingAsset = await client.query(
      `SELECT * FROM assets WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [assetId, tenantId]
    );

    if (existingAsset.rowCount === 0) {
      throw new NotFoundError("Asset not found");
    }

    const asset = existingAsset.rows[0];

    // If asset is currently assigned, unassign first (prevent dangling reference)
    if (asset.assigned_to) {
      // Close open usage history
      const retiredDate = new Date().toISOString().split('T')[0];
      await client.query(
        `UPDATE asset_usage_history SET return_date = $1, description = $2
         WHERE asset_id = $3 AND tenant_id = $4 AND return_date IS NULL`,
        [retiredDate, notes || 'Asset retired while assigned', assetId, tenantId]
      );

      // Deactivate accessories
      await client.query(
        `UPDATE asset_accessories SET is_active = FALSE WHERE asset_id = $1 AND tenant_id = $2 AND is_active = TRUE`,
        [assetId, tenantId]
      );

      // Create return tracking entry
      await client.query(
        `INSERT INTO asset_tracking (
          id, asset_id, tenant_id, event_type, description, related_employee_id, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          crypto.randomUUID(),
          assetId,
          tenantId,
          "RETURNED",
          "Auto-returned before retirement",
          asset.assigned_to,
          userId
        ]
      );
    }

    // Update status to RETIRED, unassign, and zero out book value
    const result = await client.query(
      `UPDATE assets
       SET status = 'RETIRED', book_value = 0,
           assigned_to = NULL, assigned_by = NULL, assigned_date = NULL,
           data_wipe_confirmed = FALSE,
           updated_by = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [userId, assetId, tenantId]
    );

    // Create retirement tracking entry
    await client.query(
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

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
 * GENERATE QR CODE
 * Generates a QR code image from the asset_code
 */
exports.generateQRCode = async (tenantId, assetId) => {
  const result = await pool.query(
    `SELECT asset_code, name FROM assets WHERE id = $1 AND tenant_id = $2`,
    [assetId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError("Asset not found");
  }

  const { asset_code, name } = result.rows[0];

  try {
    const qrData = JSON.stringify({ asset_code, name, id: assetId });
    const qrImage = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    return {
      qrcode: qrImage,
      asset_code,
      format: 'png'
    };
  } catch (error) {
    logger.error("Error generating QR code", { error, asset_code });
    throw new BadRequestError("Failed to generate QR code");
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
  notes,
  accessories
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Row-lock: SELECT FOR UPDATE to prevent double-booking race condition
    const assetResult = await client.query(
      `SELECT * FROM assets WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
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

    // Verify employee exists AND is active (not terminated/offboarded)
    const employeeCheck = await client.query(
      `SELECT e.id, u.is_active, e.first_name, e.last_name 
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = $1 AND e.tenant_id = $2`,
      [employeeId, tenantId]
    );

    if (employeeCheck.rowCount === 0) {
      throw new NotFoundError("Employee not found");
    }

    if (!employeeCheck.rows[0].is_active) {
      throw new BadRequestError("Cannot assign asset to an inactive or terminated employee");
    }

    // Check if employee already has an asset of this category
    const existingCategoryAsset = await client.query(
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
    const updateResult = await client.query(
      `UPDATE assets
       SET assigned_to = $1, status = 'ASSIGNED', assigned_by = $2, assigned_date = NOW(),
           data_wipe_confirmed = FALSE, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [employeeId, userId, assetId, tenantId]
    );

    // Format description with accessories if present
    let description = notes || `Asset assigned to employee ${employeeCheck.rows[0].first_name} ${employeeCheck.rows[0].last_name}`;
    if (accessories && Array.isArray(accessories) && accessories.length > 0) {
      description += ` with accessories: ${accessories.join(', ')}`;
    }

    // Create tracking entry
    await client.query(
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
        description,
        employeeId,
        userId
      ]
    );

    // Automatically create usage history entry when asset is assigned
    await client.query(
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
        description
      ]
    );

    // Store accessories given with this assignment
    if (accessories && Array.isArray(accessories) && accessories.length > 0) {
      // Deactivate any previous accessories for this asset
      await client.query(
        `UPDATE asset_accessories SET is_active = FALSE WHERE asset_id = $1 AND tenant_id = $2`,
        [assetId, tenantId]
      );
      for (const itemName of accessories) {
        await client.query(
          `INSERT INTO asset_accessories (id, asset_id, tenant_id, item_name, is_active, created_at)
           VALUES ($1, $2, $3, $4, TRUE, NOW())`,
          [crypto.randomUUID(), assetId, tenantId, itemName]
        );
      }
    }

    await client.query('COMMIT');

    // Notify employee: asset assigned
    try {
      const empUserRes = await pool.query(`SELECT user_id FROM employees WHERE id = $1`, [employeeId]);
      if (empUserRes.rows[0]) {
        await inboxService.createNotification(pool, {
          tenant_id: tenantId, user_id: empUserRes.rows[0].user_id,
          title: 'Asset Assigned',
          message: `Asset '${asset.name}' (${asset.asset_code}) has been assigned to you.`,
          type: 'info', link: '/assets'
        });
      }
    } catch (notifErr) {
      console.error('Asset assign notification error:', notifErr.message);
    }

    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
  notes,
  checklist
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify asset exists (with row lock)
    const assetResult = await client.query(
      `SELECT a.*, u.first_name, u.last_name 
       FROM assets a
       LEFT JOIN employees e ON a.assigned_to = e.id
       LEFT JOIN users u ON e.user_id = u.id
       WHERE a.id = $1 AND a.tenant_id = $2 FOR UPDATE`,
      [assetId, tenantId]
    );

    if (assetResult.rowCount === 0) {
      throw new NotFoundError("Asset not found");
    }

    const asset = assetResult.rows[0];

    if (!asset.assigned_to) {
      throw new BadRequestError("Asset is not currently assigned");
    }

    const returnedDate = return_date || new Date().toISOString().split('T')[0];

    // Determine status based on condition and checklist
    let newStatus = "AVAILABLE";
    let newCondition = condition || "GOOD";

    if (condition === "DAMAGED" || condition === "WORN") {
      newStatus = "UNDER_REPAIR";
    } else if (condition === "LOST") {
      newStatus = "RETIRED";
    } else if (condition === "DOA") {
      newStatus = "RETIRED";
    }

    // Check if any checklist item is not returned → partial return
    const hasPartialReturn = checklist && Array.isArray(checklist) &&
      checklist.some(item => !item.is_returned);
    if (hasPartialReturn && newStatus === "AVAILABLE") {
      newStatus = "UNDER_REPAIR";
    }

    // Update asset status + reset data wipe + update condition
    const updateResult = await client.query(
      `UPDATE assets
       SET assigned_to = NULL, assigned_by = NULL, assigned_date = NULL,
           status = $1, return_date = $2, condition = $3,
           data_wipe_confirmed = FALSE,
           updated_by = $4, updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6
       RETURNING *`,
      [newStatus, returnedDate, newCondition, userId, assetId, tenantId]
    );

    // Create tracking entry
    const eventType =
      condition === "DAMAGED" ? "DAMAGED" :
        condition === "LOST" ? "LOST" :
          condition === "WORN" ? "WORN" :
            condition === "DOA" ? "DOA" : "RETURNED";

    // Generate robust description
    let description = notes || `Asset returned by ${asset.first_name} ${asset.last_name} in ${condition || "GOOD"} condition`;

    // Check for missing items
    if (checklist && Array.isArray(checklist)) {
      const missingItems = checklist.filter(item => !item.is_returned).map(item => item.item_name);
      if (missingItems.length > 0) {
        description += `. Missing items: ${missingItems.join(', ')}`;
      }
    }

    const trackingId = crypto.randomUUID();
    await client.query(
      `INSERT INTO asset_tracking (
        id, asset_id, tenant_id, event_type, description, related_employee_id, created_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW()
      )`,
      [
        trackingId,
        assetId,
        tenantId,
        eventType,
        description,
        asset.assigned_to,
        userId
      ]
    );

    // Insert return checklist items
    if (checklist && Array.isArray(checklist) && checklist.length > 0) {
      for (const item of checklist) {
        await client.query(
          `INSERT INTO asset_return_checklist (
            id, asset_id, tenant_id, tracking_id, item_name, is_returned, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            crypto.randomUUID(),
            assetId,
            tenantId,
            trackingId,
            item.item_name,
            item.is_returned || false,
            item.notes || null
          ]
        );
      }
    }

    // Update open usage history entry
    await client.query(
      `UPDATE asset_usage_history
       SET return_date = $1, description = $2
       WHERE asset_id = $3 AND tenant_id = $4 AND return_date IS NULL`,
      [
        returnedDate,
        description,
        assetId,
        tenantId
      ]
    );

    // Deactivate accessories on return
    await client.query(
      `UPDATE asset_accessories SET is_active = FALSE WHERE asset_id = $1 AND tenant_id = $2 AND is_active = TRUE`,
      [assetId, tenantId]
    );

    // If asset is lost, zero out book value
    if (condition === "LOST") {
      await client.query(
        `UPDATE assets SET book_value = 0 WHERE id = $1 AND tenant_id = $2`,
        [assetId, tenantId]
      );
    }

    await client.query('COMMIT');

    // Notify admin/HR: asset returned
    try {
      const hrUsers = await pool.query(
        `SELECT id FROM users WHERE tenant_id = $1 AND role IN ('HR','ADMIN')`, [tenantId]
      );
      for (const hr of hrUsers.rows) {
        await inboxService.createNotification(pool, {
          tenant_id: tenantId, user_id: hr.id,
          title: 'Asset Returned',
          message: `${asset.first_name} ${asset.last_name} returned asset '${asset.name}' in ${condition || 'GOOD'} condition.`,
          type: 'info', link: '/assets'
        });
      }
    } catch (notifErr) {
      console.error('Asset return notification error:', notifErr.message);
    }

    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
    `SELECT t.*, 
            COALESCE(ce.first_name || ' ' || ce.last_name, cu.email, 'System') as created_by_name,
            re.first_name || ' ' || re.last_name as related_employee_name
     FROM asset_tracking t
     LEFT JOIN users cu ON t.created_by = cu.id
     LEFT JOIN employees ce ON cu.id = ce.user_id
     LEFT JOIN employees re ON t.related_employee_id = re.id
     WHERE t.asset_id = $1 AND t.tenant_id = $2
     ORDER BY t.created_at DESC`,
    [assetId, tenantId]
  );

  // Post-process: Replace UUIDs in description with names for better display
  return result.rows.map(row => {
    if (row.description && row.related_employee_id && row.related_employee_name) {
      row.description = row.description.replace(row.related_employee_id, row.related_employee_name);
    }
    return row;
  });
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
       e.first_name, e.last_name, d.name as department_name
     FROM asset_usage_history h
     LEFT JOIN employees e ON h.employee_id = e.id
     LEFT JOIN departments d ON e.department_id = d.id
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

  const created = result.rows[0];

  // Notify admin/HR: new asset request
  try {
    const empRes = await pool.query(
      `SELECT first_name, last_name FROM employees WHERE id = $1`, [employeeId]
    );
    const emp = empRes.rows[0];
    const hrUsers = await pool.query(
      `SELECT id FROM users WHERE tenant_id = $1 AND role IN ('HR','ADMIN') AND id != $2`, [tenantId, userId]
    );
    for (const hr of hrUsers.rows) {
      await inboxService.createNotification(pool, {
        tenant_id: tenantId, user_id: hr.id,
        title: 'New Asset Request',
        message: `${emp?.first_name} ${emp?.last_name} requested '${data.asset_name}' (${data.category})`,
        type: 'info', link: '/assets'
      });
    }
  } catch (notifErr) {
    console.error('Asset request notification error:', notifErr.message);
  }

  return created;
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

  const updated = result.rows[0];

  // Notify employee: asset request approved/rejected
  try {
    const empUserRes = await pool.query(
      `SELECT e.user_id FROM employees e WHERE e.id = $1`, [request.employee_id]
    );
    if (empUserRes.rows[0]) {
      const isApproved = data.status === 'APPROVED';
      await inboxService.createNotification(pool, {
        tenant_id: tenantId, user_id: empUserRes.rows[0].user_id,
        title: isApproved ? 'Asset Request Approved ✅' : 'Asset Request Rejected',
        message: isApproved
          ? `Your request for '${request.asset_name}' has been approved.`
          : `Your request for '${request.asset_name}' was rejected.${data.admin_notes ? ' Notes: ' + data.admin_notes : ''}`,
        type: isApproved ? 'success' : 'warning', link: '/assets'
      });
    }
  } catch (notifErr) {
    console.error('Asset request handle notification error:', notifErr.message);
  }

  return updated;
};

/**
 * UPDATE ASSET REQUEST
 * Only allowed if status is PENDING and user owns the request
 */
exports.updateAssetRequest = async (tenantId, requestId, userId, data) => {
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

  // 2. Ownership check
  if (request.user_id !== userId) {
    throw new ForbiddenError("You can only modify your own requests");
  }

  // 3. Status check
  if (request.status !== 'PENDING') {
    throw new BadRequestError("Cannot modify request that is not PENDING");
  }

  // 4. Update request
  const updateFields = [];
  const params = [requestId, tenantId];
  let paramCount = 2;

  // Fields allowed to update
  const allowedFields = ['asset_name', 'category', 'priority', 'reason'];

  Object.keys(data).forEach(key => {
    if (allowedFields.includes(key) && data[key] !== undefined) {
      updateFields.push(`${key} = $${++paramCount}`);
      params.push(data[key]);
    }
  });

  if (updateFields.length === 0) {
    return request;
  }

  const query = `
    UPDATE asset_requests
    SET ${updateFields.join(", ")}, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
  `;

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * DELETE ASSET REQUEST
 * Only allowed if status is PENDING and user owns the request
 */
exports.deleteAssetRequest = async (tenantId, requestId, userId) => {
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

  // 2. Ownership check
  if (request.user_id !== userId) {
    throw new ForbiddenError("You can only delete your own requests");
  }

  // 3. Status check
  if (request.status !== 'PENDING') {
    throw new BadRequestError("Cannot delete request that is not PENDING");
  }

  // 4. Delete request
  await pool.query(
    `DELETE FROM asset_requests WHERE id = $1 AND tenant_id = $2`,
    [requestId, tenantId]
  );

  return { message: "Request deleted successfully" };
};

/**
 * GET ASSET ACCESSORIES
 * Returns active accessories currently assigned with an asset (from DB)
 */
exports.getAssetAccessories = async (tenantId, assetId) => {
  // Verify asset exists
  const assetCheck = await pool.query(
    `SELECT id FROM assets WHERE id = $1 AND tenant_id = $2`,
    [assetId, tenantId]
  );
  if (assetCheck.rowCount === 0) {
    throw new NotFoundError("Asset not found");
  }

  const result = await pool.query(
    `SELECT id, item_name, is_active, created_at
     FROM asset_accessories
     WHERE asset_id = $1 AND tenant_id = $2 AND is_active = TRUE
     ORDER BY created_at ASC`,
    [assetId, tenantId]
  );

  return result.rows;
};

/**
 * SWAP ASSET
 * Atomically returns the old asset and assigns a new one to the same employee.
 * Single transaction — either both succeed or neither does.
 */
exports.swapAsset = async (
  tenantId,
  userId,
  {
    old_asset_id,
    new_asset_id,
    return_condition,
    return_notes,
    checklist,
    new_accessories
  }
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock both assets
    const oldAssetResult = await client.query(
      `SELECT * FROM assets WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [old_asset_id, tenantId]
    );
    if (oldAssetResult.rowCount === 0) {
      throw new NotFoundError("Old asset not found");
    }
    const oldAsset = oldAssetResult.rows[0];

    if (!oldAsset.assigned_to) {
      throw new BadRequestError("Old asset is not currently assigned to anyone");
    }
    const employeeId = oldAsset.assigned_to;

    const newAssetResult = await client.query(
      `SELECT * FROM assets WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [new_asset_id, tenantId]
    );
    if (newAssetResult.rowCount === 0) {
      throw new NotFoundError("New asset not found");
    }
    const newAsset = newAssetResult.rows[0];

    if (newAsset.status !== 'AVAILABLE') {
      throw new ConflictError(`New asset is not available (current status: ${newAsset.status})`);
    }

    // 2. RETURN old asset
    const returnedDate = new Date().toISOString().split('T')[0];
    let returnStatus = 'AVAILABLE';
    const returnCondition = return_condition || 'GOOD';

    if (returnCondition === 'DAMAGED' || returnCondition === 'WORN') {
      returnStatus = 'UNDER_REPAIR';
    } else if (returnCondition === 'LOST' || returnCondition === 'DOA') {
      returnStatus = 'RETIRED';
    }

    const hasPartialReturn = checklist && Array.isArray(checklist) &&
      checklist.some(item => !item.is_returned);
    if (hasPartialReturn && returnStatus === 'AVAILABLE') {
      returnStatus = 'UNDER_REPAIR';
    }

    await client.query(
      `UPDATE assets
       SET assigned_to = NULL, assigned_by = NULL, assigned_date = NULL,
           status = $1, return_date = $2, condition = $3,
           data_wipe_confirmed = FALSE, updated_by = $4, updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6`,
      [returnStatus, returnedDate, returnCondition, userId, old_asset_id, tenantId]
    );

    // Deactivate old accessories
    await client.query(
      `UPDATE asset_accessories SET is_active = FALSE WHERE asset_id = $1 AND tenant_id = $2 AND is_active = TRUE`,
      [old_asset_id, tenantId]
    );

    // Return tracking
    // Generate robust return description
    let returnDescription = `Asset returned for swap/upgrade`;

    // Check for missing items
    if (checklist && Array.isArray(checklist)) {
      const missingItems = checklist.filter(item => !item.is_returned).map(item => item.item_name);
      if (missingItems.length > 0) {
        returnDescription += `. Missing items: ${missingItems.join(', ')}`;
      }
    }
    if (return_notes) {
      returnDescription += ` (Note: ${return_notes})`;
    }

    const returnTrackingId = crypto.randomUUID();
    await client.query(
      `INSERT INTO asset_tracking (id, asset_id, tenant_id, event_type, description, related_employee_id, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [returnTrackingId, old_asset_id, tenantId, 'RETURNED', returnDescription, employeeId, userId]
    );

    // Checklist entries
    if (checklist && Array.isArray(checklist) && checklist.length > 0) {
      for (const item of checklist) {
        await client.query(
          `INSERT INTO asset_return_checklist (id, asset_id, tenant_id, tracking_id, item_name, is_returned, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [crypto.randomUUID(), old_asset_id, tenantId, returnTrackingId, item.item_name, item.is_returned || false, item.notes || null]
        );
      }
    }

    // Close usage history
    await client.query(
      `UPDATE asset_usage_history SET return_date = $1, description = $2
       WHERE asset_id = $3 AND tenant_id = $4 AND return_date IS NULL`,
      [returnedDate, returnDescription, old_asset_id, tenantId]
    );

    if (returnCondition === 'LOST') {
      await client.query(
        `UPDATE assets SET book_value = 0 WHERE id = $1 AND tenant_id = $2`,
        [old_asset_id, tenantId]
      );
    }

    // 3. ASSIGN new asset
    const assignResult = await client.query(
      `UPDATE assets
       SET assigned_to = $1, status = 'ASSIGNED', assigned_by = $2, assigned_date = NOW(),
           data_wipe_confirmed = FALSE, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [employeeId, userId, new_asset_id, tenantId]
    );

    // Format assignment description with accessories
    let assignDescription = `Asset assigned via swap (replacing ${oldAsset.asset_code})`;
    if (new_accessories && Array.isArray(new_accessories) && new_accessories.length > 0) {
      assignDescription += ` with accessories: ${new_accessories.join(', ')}`;
    }

    // Assign tracking
    await client.query(
      `INSERT INTO asset_tracking (id, asset_id, tenant_id, event_type, description, related_employee_id, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [crypto.randomUUID(), new_asset_id, tenantId, 'ASSIGNED', assignDescription, employeeId, userId]
    );

    // Usage history for new asset
    await client.query(
      `INSERT INTO asset_usage_history (id, asset_id, tenant_id, employee_id, assigned_date, description, created_at)
       VALUES ($1, $2, $3, $4, NOW()::DATE, $5, NOW())`,
      [crypto.randomUUID(), new_asset_id, tenantId, employeeId, assignDescription]
    );

    // Store new accessories
    if (new_accessories && Array.isArray(new_accessories) && new_accessories.length > 0) {
      for (const itemName of new_accessories) {
        await client.query(
          `INSERT INTO asset_accessories (id, asset_id, tenant_id, item_name, is_active, created_at)
           VALUES ($1, $2, $3, $4, TRUE, NOW())`,
          [crypto.randomUUID(), new_asset_id, tenantId, itemName]
        );
      }
    }

    // Link old and new assets
    await client.query(
      `INSERT INTO asset_links (id, asset_id, linked_asset_id, tenant_id, link_type, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [crypto.randomUUID(), new_asset_id, old_asset_id, tenantId, 'REPLACEMENT_FOR', `Replaced ${oldAsset.name} (${oldAsset.asset_code})`]
    );

    await client.query('COMMIT');
    return assignResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * GET ASSET DASHBOARD
 * Returns summary stats for asset management dashboard
 */
exports.getAssetDashboard = async (tenantId) => {
  // Status counts
  const statusResult = await pool.query(
    `SELECT status, COUNT(*)::int as count FROM assets WHERE tenant_id = $1 GROUP BY status`,
    [tenantId]
  );

  // Category counts
  const categoryResult = await pool.query(
    `SELECT category, COUNT(*)::int as count FROM assets WHERE tenant_id = $1 GROUP BY category ORDER BY count DESC`,
    [tenantId]
  );

  // Total counts
  const totalResult = await pool.query(
    `SELECT 
       COUNT(*)::int as total_assets,
       COUNT(CASE WHEN status = 'ASSIGNED' THEN 1 END)::int as assigned_count,
       COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END)::int as available_count,
       COUNT(CASE WHEN status = 'UNDER_REPAIR' THEN 1 END)::int as under_repair_count,
       COUNT(CASE WHEN status = 'RETIRED' THEN 1 END)::int as retired_count,
       COALESCE(SUM(purchase_price), 0)::numeric as total_purchase_value,
       COALESCE(SUM(book_value), 0)::numeric as total_book_value
     FROM assets WHERE tenant_id = $1`,
    [tenantId]
  );

  // Warranty expiring in next 30 days
  const warrantyResult = await pool.query(
    `SELECT COUNT(*)::int as expiring_soon
     FROM assets 
     WHERE tenant_id = $1 
       AND warranty_expiry IS NOT NULL 
       AND warranty_expiry BETWEEN NOW() AND NOW() + INTERVAL '30 days'
       AND status != 'RETIRED'`,
    [tenantId]
  );

  // Recent activity (last 10 events)
  const activityResult = await pool.query(
    `SELECT t.event_type, t.description, t.created_at,
            a.name as asset_name, a.asset_code
     FROM asset_tracking t
     JOIN assets a ON t.asset_id = a.id
     WHERE t.tenant_id = $1
     ORDER BY t.created_at DESC
     LIMIT 10`,
    [tenantId]
  );

  return {
    summary: totalResult.rows[0],
    by_status: statusResult.rows,
    by_category: categoryResult.rows,
    warranty_expiring_soon: warrantyResult.rows[0].expiring_soon,
    recent_activity: activityResult.rows,
  };
};

/**
 * EXPORT ASSETS CSV
 * Returns all assets for the tenant as a CSV string
 */
exports.exportAssetsCSV = async (tenantId) => {
  const result = await pool.query(
    `SELECT 
       a.asset_code, a.name, a.category, a.status, a.condition,
       a.serial_number, a.manufacturer, a.model_number,
       a.purchase_date, a.purchase_price, a.book_value,
       a.warranty_expiry, a.location,
       a.assigned_date, a.return_date,
       e.first_name || ' ' || e.last_name as assigned_to_name,
       a.notes,
       a.created_at
     FROM assets a
     LEFT JOIN employees e ON a.assigned_to = e.id AND e.tenant_id = a.tenant_id
     WHERE a.tenant_id = $1
     ORDER BY a.created_at DESC`,
    [tenantId]
  );

  // Build CSV
  const headers = [
    'Asset Code', 'Name', 'Category', 'Status', 'Condition',
    'Serial Number', 'Manufacturer', 'Model', 'Purchase Date',
    'Purchase Price', 'Book Value', 'Warranty Expiry', 'Location',
    'Assigned Date', 'Return Date', 'Assigned To', 'Notes', 'Created At'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = result.rows.map(row => [
    row.asset_code, row.name, row.category, row.status, row.condition,
    row.serial_number, row.manufacturer, row.model_number,
    row.purchase_date, row.purchase_price, row.book_value,
    row.warranty_expiry, row.location,
    row.assigned_date, row.return_date, row.assigned_to_name,
    row.notes, row.created_at
  ].map(escapeCSV).join(','));

  return [headers.join(','), ...rows].join('\n');
};

/**
 * GET WARRANTY ALERTS
 * Returns assets with warranty expiring within N days
 */
exports.getWarrantyAlerts = async (tenantId, daysAhead = 30) => {
  const result = await pool.query(
    `SELECT a.id, a.asset_code, a.name, a.category, a.warranty_expiry, a.status,
            e.first_name || ' ' || e.last_name as assigned_to_name
     FROM assets a
     LEFT JOIN employees e ON a.assigned_to = e.id AND e.tenant_id = a.tenant_id
     WHERE a.tenant_id = $1
       AND a.warranty_expiry IS NOT NULL
       AND a.warranty_expiry BETWEEN NOW() AND NOW() + ($2 || ' days')::INTERVAL
       AND a.status != 'RETIRED'
     ORDER BY a.warranty_expiry ASC`,
    [tenantId, daysAhead]
  );

  return result.rows;
};
