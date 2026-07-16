const pool = require("../../../config/db");

const getQuery = (db) => {
    if (db && typeof db.query === "function") {
        return (text, params) => db.query(text, params);
    }
    return pool.query.bind(pool);
};

exports.createDelegation = async (db, data, actor) => {
    const query = getQuery(db);

    if (new Date(data.start_date) > new Date(data.end_date)) {
        throw new Error("Start date cannot be after end date");
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (data.start_date < todayStr) {
        throw new Error("Cannot create delegation for past dates");
    }

    const delegateCheck = await query(
        `SELECT id FROM users WHERE id = $1 AND tenant_id = $2`,
        [data.delegate_id, actor.tenantId]
    );

    if (delegateCheck.rowCount === 0) {
        throw new Error("Delegate user not found in your organization");
    }

    const overlap = await query(
        `SELECT id FROM approval_delegations 
         WHERE tenant_id = $1 AND delegator_id = $2 AND is_active = true
         AND start_date <= $4 AND end_date >= $3`,
        [actor.tenantId, actor.id, data.start_date, data.end_date]
    );

    if (overlap.rowCount > 0) {
        throw new Error("Overlapping delegation already exists");
    }

    const res = await query(
        `INSERT INTO approval_delegations 
            (tenant_id, delegator_id, delegate_id, start_date, end_date, reason)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
            actor.tenantId,
            actor.id,
            data.delegate_id,
            data.start_date,
            data.end_date,
            data.reason || null
        ]
    );

    return res.rows[0];
};

exports.getMyDelegations = async (db, actor) => {
    const query = getQuery(db);

    const res = await query(
        `SELECT ad.*, u.email AS delegate_email, 
                e.first_name AS delegate_first_name, e.last_name AS delegate_last_name
         FROM approval_delegations ad
         JOIN users u ON u.id = ad.delegate_id
         LEFT JOIN employees e ON e.user_id = u.id
         WHERE ad.tenant_id = $1 AND ad.delegator_id = $2 AND ad.is_active = true
         ORDER BY ad.start_date DESC`,
        [actor.tenantId, actor.id]
    );

    return res.rows;
};

exports.getDelegationsToMe = async (db, actor) => {
    const query = getQuery(db);
    const today = new Date().toISOString().split('T')[0];

    const res = await query(
        `SELECT ad.*, u.email AS delegator_email,
                e.first_name AS delegator_first_name, e.last_name AS delegator_last_name
         FROM approval_delegations ad
         JOIN users u ON u.id = ad.delegator_id
         LEFT JOIN employees e ON e.user_id = u.id
         WHERE ad.tenant_id = $1 AND ad.delegate_id = $2 AND ad.is_active = true
         AND ad.start_date <= $3 AND ad.end_date >= $3
         ORDER BY ad.start_date DESC`,
        [actor.tenantId, actor.id, today]
    );

    return res.rows;
};

exports.revokeDelegation = async (db, delegationId, actor) => {
    const query = getQuery(db);

    const res = await query(
        `UPDATE approval_delegations 
         SET is_active = false, revoked_at = now(), revoked_by = $1
         WHERE id = $2 AND tenant_id = $3 AND delegator_id = $4 AND is_active = true
         RETURNING *`,
        [actor.id, delegationId, actor.tenantId, actor.id]
    );

    if (res.rowCount === 0) {
        throw new Error("Delegation not found or already revoked");
    }

    return res.rows[0];
};

exports.getEffectiveApprover = async (db, originalApproverId, tenantId) => {
    const query = getQuery(db);
    const today = new Date().toISOString().split('T')[0];

    const delegation = await query(
        `SELECT delegate_id FROM approval_delegations 
         WHERE tenant_id = $1 AND delegator_id = $2 AND is_active = true
         AND start_date <= $3 AND end_date >= $3
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId, originalApproverId, today]
    );

    if (delegation.rowCount > 0) {
        return delegation.rows[0].delegate_id;
    }

    return originalApproverId;
};

exports.canApprove = async (db, userId, originalApproverId, tenantId) => {

    if (userId === originalApproverId) {
        return true;
    }

    const effectiveApprover = await exports.getEffectiveApprover(db, originalApproverId, tenantId);
    return userId === effectiveApprover;
};

exports.getAllActiveDelegations = async (db, tenantId) => {
    const query = getQuery(db);
    const today = new Date().toISOString().split('T')[0];

    const res = await query(
        `SELECT ad.*,
                du.email AS delegator_email, de.first_name AS delegator_first_name,
                deu.email AS delegate_email, dee.first_name AS delegate_first_name
         FROM approval_delegations ad
         JOIN users du ON du.id = ad.delegator_id
         LEFT JOIN employees de ON de.user_id = du.id
         JOIN users deu ON deu.id = ad.delegate_id
         LEFT JOIN employees dee ON dee.user_id = deu.id
         WHERE ad.tenant_id = $1 AND ad.is_active = true
         AND ad.end_date >= $2
         ORDER BY ad.start_date DESC`,
        [tenantId, today]
    );

    return res.rows;
};
