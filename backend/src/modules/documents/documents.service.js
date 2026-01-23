const pool = require("../../config/db");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

/* -------------------------- LIST DOCUMENTS -------------------------- */
exports.getDocuments = async (db, employeeId, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT * FROM employee_documents WHERE employee_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
        [employeeId, tenantId]
    );
    return res.rows;
};

/* -------------------------- UPLOAD DOCUMENT -------------------------- */
exports.uploadDocument = async (db, data, actor) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO employee_documents (tenant_id, employee_id, file_name, file_url, file_type, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [
            actor.tenantId,
            data.employee_id,
            data.file_name,
            data.file_url,
            data.file_type || null,
            actor.id
        ]
    );
    return res.rows[0];
};

/* -------------------------- DELETE DOCUMENT -------------------------- */
exports.deleteDocument = async (db, id, tenantId) => {
    const query = getQuery(db);
    await query(
        `DELETE FROM employee_documents WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
    );
    return { success: true };
};
