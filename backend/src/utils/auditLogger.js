const db = require('../config/db'); // Assuming this is your DB connection pool

/**
 * Logs an action to the audit_logs table.
 * @param {Object} req - The express request object (to extract tenant/actor).
 * @param {String} targetTable - The table being modified (e.g., 'users').
 * @param {String} targetId - The ID of the record being modified.
 * @param {String} action - 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
 * @param {Object} [oldData] - JSON of the data before change (optional).
 * @param {Object} [newData] - JSON of the data after change (optional).
 */
const logAudit = async (req, targetTable, targetId, action, oldData = null, newData = null) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.id || req.user?.userId; // The user performing the action

    if (!actorId) {
      console.warn('Audit Log skipped: Missing actorId');
      return;
    }

    // Relax tenant check for Super Admin or system operations
    // If tenantId is null, it just means a system-level action (if DB allows null)


    const query = `
      INSERT INTO audit_logs 
      (tenant_id, actor_id, target_table, target_id, action, old_data, new_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await db.query(query, [
      tenantId,
      actorId,
      targetTable,
      targetId,
      action,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null
    ]);

  } catch (err) {
    // We log the error but do not crash the request 
    // because auditing is a side-effect.
    console.error('FAILED TO WRITE AUDIT LOG:', err.message);
  }
};

module.exports = logAudit;