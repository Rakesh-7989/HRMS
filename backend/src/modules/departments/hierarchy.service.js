const pool = require('../../config/db');

/**
 * Default hierarchy positions seeded when a new tenant is created.
 * Admins can fully customize these — add, remove, rename, reorder.
 * The code never checks position names, only uses level for ordering.
 */
const DEFAULT_POSITIONS = [
    { name: 'Chief Executive Officer', short_name: 'CEO', level: 1 },
    { name: 'Chief Operating Officer', short_name: 'COO', level: 2 },
    { name: 'Chief Financial Officer', short_name: 'CFO', level: 2 },
    { name: 'Chief Technology Officer', short_name: 'CTO', level: 2 },
    { name: 'Chief Human Resources Officer', short_name: 'CHRO', level: 2 },
    { name: 'Vice President', short_name: 'VP', level: 3 },
    { name: 'Director', short_name: 'Dir', level: 4 },
    { name: 'Senior Manager', short_name: 'Sr. Mgr', level: 5 },
    { name: 'Manager', short_name: 'Mgr', level: 6 },
    { name: 'Team Lead', short_name: 'TL', level: 7 },
    { name: 'Senior Engineer', short_name: 'Sr.', level: 8 },
    { name: 'Staff / Associate', short_name: 'Staff', level: 9 },
    { name: 'Intern / Trainee', short_name: 'Intern', level: 10 },
];

/**
 * Seed default hierarchy positions for a new organization.
 * Called during tenant onboarding. Admin can then customize.
 */
async function seedDefaultHierarchy(tenantId, client = null) {
    const executor = client || pool;
    const ceoId = null; // CEO is root

    // Build parent references: CEO is root, C-suite reports to CEO, etc.
    const positionIds = {};

    for (const pos of DEFAULT_POSITIONS) {
        let parentId = null;
        if (pos.level === 2) {
            parentId = positionIds['Chief Executive Officer'] || null;
        } else if (pos.level === 3) {
            parentId = positionIds['Chief Operating Officer'] || null;
        } else if (pos.level >= 4) {
            // Find the closest parent at level - 1
            const parentLevel = pos.level - 1;
            const parentEntry = DEFAULT_POSITIONS.find(p => p.level === parentLevel);
            if (parentEntry) {
                parentId = positionIds[parentEntry.name] || null;
            }
        }

        const result = await executor.query(
            `INSERT INTO hierarchy_positions (tenant_id, name, short_name, level, parent_position_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (tenant_id, name) DO NOTHING
             RETURNING id`,
            [tenantId, pos.name, pos.short_name, pos.level, parentId]
        );

        if (result.rows.length > 0) {
            positionIds[pos.name] = result.rows[0].id;
        }
    }

    return positionIds;
}

/**
 * Get the full hierarchy tree for an organization.
 * Returns positions with their employees, structured as a flat list
 * that the frontend can build into a tree using parent_position_id.
 */
async function getHierarchyTree(tenantId) {
    const result = await pool.query(
        `SELECT 
            hp.id,
            hp.name,
            hp.short_name,
            hp.level,
            hp.parent_position_id,
            hp.department_id,
            hp.is_active,
            hp.created_at,
            d.name AS department_name,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', e.id,
                        'first_name', e.first_name,
                        'last_name', e.last_name,
                        'email', u.email,
                        'department', dept.name,
                        'designation', des.name,
                        'is_active', u.is_active,
                        'profile_photo_url', e.profile_photo_url
                    )
                ) FILTER (WHERE e.id IS NOT NULL), '[]'
            ) AS employees,
            (SELECT COUNT(*)::INTEGER FROM employees e2 WHERE e2.hierarchy_position_id = hp.id) AS employee_count
         FROM hierarchy_positions hp
         LEFT JOIN departments d ON hp.department_id = d.id
         LEFT JOIN employees e ON e.hierarchy_position_id = hp.id
         LEFT JOIN users u ON e.user_id = u.id AND u.is_deleted = false
         LEFT JOIN departments dept ON e.department_id = dept.id
         LEFT JOIN designations des ON e.designation_id = des.id
         WHERE hp.tenant_id = $1 AND hp.is_active = true
         GROUP BY hp.id, hp.name, hp.short_name, hp.level, hp.parent_position_id,
                  hp.department_id, hp.is_active, hp.created_at, d.name
         ORDER BY hp.level ASC, hp.name ASC`,
        [tenantId]
    );
    return result.rows;
}

/**
 * Get a single hierarchy position by ID
 */
async function getPosition(positionId) {
    const result = await pool.query(
        `SELECT hp.*, d.name AS department_name
         FROM hierarchy_positions hp
         LEFT JOIN departments d ON hp.department_id = d.id
         WHERE hp.id = $1`,
        [positionId]
    );
    return result.rows[0] || null;
}

/**
 * Create a new hierarchy position
 */
async function createPosition(tenantId, { name, short_name, level, parent_position_id, department_id }) {
    const result = await pool.query(
        `INSERT INTO hierarchy_positions (tenant_id, name, short_name, level, parent_position_id, department_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [tenantId, name, short_name || null, level, parent_position_id || null, department_id || null]
    );
    return result.rows[0];
}

/**
 * Update an existing hierarchy position
 */
async function updatePosition(positionId, { name, short_name, level, parent_position_id, department_id, is_active }) {
    const result = await pool.query(
        `UPDATE hierarchy_positions 
         SET name = COALESCE($2, name),
             short_name = COALESCE($3, short_name),
             level = COALESCE($4, level),
             parent_position_id = $5,
             department_id = $6,
             is_active = COALESCE($7, is_active),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [positionId, name, short_name, level, parent_position_id || null, department_id || null, is_active]
    );
    return result.rows[0];
}

/**
 * Delete a hierarchy position (only if no employees are assigned)
 */
async function deletePosition(positionId) {
    // Check for assigned employees
    const check = await pool.query(
        `SELECT COUNT(*)::INTEGER AS emp_count FROM employees WHERE hierarchy_position_id = $1`,
        [positionId]
    );
    if (parseInt(check.rows[0].emp_count) > 0) {
        throw new Error('Cannot delete position with assigned employees. Reassign employees first.');
    }

    // Reassign children to the parent of this position
    const pos = await pool.query(`SELECT parent_position_id FROM hierarchy_positions WHERE id = $1`, [positionId]);
    if (pos.rows.length > 0) {
        await pool.query(
            `UPDATE hierarchy_positions SET parent_position_id = $2, updated_at = NOW() WHERE parent_position_id = $1`,
            [positionId, pos.rows[0].parent_position_id]
        );
    }

    await pool.query(`DELETE FROM hierarchy_positions WHERE id = $1`, [positionId]);
    return { success: true };
}

/**
 * Assign an employee to a hierarchy position
 */
async function assignEmployeeToPosition(employeeId, positionId) {
    const result = await pool.query(
        `UPDATE employees SET hierarchy_position_id = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
        [employeeId, positionId]
    );
    return result.rows[0];
}

/**
 * Remove an employee from their hierarchy position
 */
async function removeEmployeeFromPosition(employeeId) {
    const result = await pool.query(
        `UPDATE employees SET hierarchy_position_id = NULL, updated_at = NOW() WHERE id = $1 RETURNING id`,
        [employeeId]
    );
    return result.rows[0];
}

module.exports = {
    seedDefaultHierarchy,
    getHierarchyTree,
    getPosition,
    createPosition,
    updatePosition,
    deletePosition,
    assignEmployeeToPosition,
    removeEmployeeFromPosition,
    DEFAULT_POSITIONS,
};
