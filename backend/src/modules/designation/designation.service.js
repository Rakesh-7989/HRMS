const pool = require("../../config/db");
const { query: dbQuery } = require("../../middleware/db");
const { BadRequestError, NotFoundError } = require("../../utils/customErrors");

const getQuery = (db) => {
  if (db && typeof db.query === "function") return db.query;
  return dbQuery;
};

exports.createDesignation = async (db, tenantId, data, actor) => {
  const query = getQuery(db);

  const dup = await query(
    `SELECT 1 FROM designations 
     WHERE tenant_id IS NOT DISTINCT FROM $1 AND name = $2 AND is_active = true`,
    [tenantId, data.name]
  );

  if (dup.rowCount > 0) {
    throw new BadRequestError("Designation already exists");
  }

  const res = await query(
    `
    INSERT INTO designations (tenant_id, name, description, is_active, created_by)
    VALUES ($1, $2, $3, true, $4)
    RETURNING id, name, description, is_active
    `,
    [tenantId, data.name, data.description || null, actor.id]
  );

  return res.rows[0];
};

exports.getDesignations = async (db, tenantId, { limit = 50, offset = 0, search }) => {
  const query = getQuery(db);

  const params = [tenantId];
  let i = 2;
  // Removed "AND is_active = true" to allow seeing inactive designations
  let where = `WHERE tenant_id IS NOT DISTINCT FROM $1`;

  if (search) {
    where += ` AND name ILIKE $${i++}`;
    params.push(`%${search}%`);
  }

  const res = await query(
    `
    SELECT id, name, description, is_active, created_at
    FROM designations
    ${where}
    ORDER BY created_at DESC
    LIMIT $${i++} OFFSET $${i++}
    `,
    [...params, limit, offset]
  );

  return res.rows;
};


exports.getDesignationById = async (db, id, tenantId) => {
  const query = getQuery(db);

  const res = await query(
    `
    SELECT id, name, description, is_active
    FROM designations
    WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2
    `,
    [id, tenantId]
  );

  return res.rows[0];
};

exports.updateDesignation = async (db, id, tenantId, data, actor) => {
  const query = getQuery(db);

  // Note: COALESCE doesn't work well for boolean if we pass null for undefined. 
  // We need to construct the query dynamically or handle parameters carefully.
  // Using COALESCE($x, column) works if we pass NULL when we don't want to update.
  // data.is_active can be true, false, or undefined/null.

  const params = [
    data.name || null,        // $1
    data.description || null, // $2
    data.is_active,           // $3 - pass strictly whatever is in data (undefined -> null in pg driver usually?)
    // Actually, explicit checks are safer for booleans in JS -> SQL
    actor.id,                 // $4
    id,                       // $5
    tenantId                  // $6
  ];

  // We use COALESCE for name/desc. 
  // For is_active, COALESCE($3, is_active) works if $3 is NULL. 
  // In JS, if data.is_active is undefined, we should pass NULL.

  const res = await query(
    `
    UPDATE designations
    SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      is_active = COALESCE($3, is_active),
      updated_at = now(),
      updated_by = $4
    WHERE id = $5 AND tenant_id IS NOT DISTINCT FROM $6
    RETURNING id, name, description, is_active
    `,
    [
      data.name ?? null,
      data.description ?? null,
      data.is_active ?? null,
      actor.id,
      id,
      tenantId
    ]
  );

  if (!res.rowCount) throw new NotFoundError("Designation not found");
  return res.rows[0];
};

exports.deleteDesignation = async (db, id, tenantId) => {
  const query = getQuery(db);

  // Prevent delete if employees use this designation
  const using = await query(
    `SELECT 1 FROM employees WHERE designation_id = $1 LIMIT 1`,
    [id]
  );

  if (using.rowCount > 0) {
    throw new BadRequestError("Cannot delete designation. It is assigned to employees.");
  }

  const res = await query(
    `
    DELETE FROM designations
    WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2
    `,
    [id, tenantId]
  );

  if (!res.rowCount) throw new NotFoundError("Designation not found");
  return { deleted: true };
};
