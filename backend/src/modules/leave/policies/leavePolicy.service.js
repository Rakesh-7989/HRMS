const pool = require("../../../config/db");

const getQuery = (db) =>
    db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

/* ========================== CREATE POLICY ========================== */
exports.createPolicy = async (db, data, actor) => {
    const query = getQuery(db);

    const res = await query(
        `INSERT INTO leave_policies 
            (tenant_id, leave_type_id, name, description,
             applicable_roles, employment_types, is_probation_eligible, min_tenure_months,
             accrual_type, accrual_rate, max_balance, year_start_month, priority, 
             carry_forward_enabled, max_carry_forward, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
            actor.tenantId,
            data.leave_type_id,
            data.name,
            data.description || null,
            data.applicable_roles || null,
            data.employment_types || null,
            data.is_probation_eligible || false,
            data.min_tenure_months || 0,
            data.accrual_type || 'MONTHLY',
            data.accrual_rate || 0,
            data.max_balance || null,
            data.year_start_month || 1,
            data.priority || 100,
            data.carry_forward_enabled || false,
            data.max_carry_forward || 0,
            actor.id
        ]
    );

    return res.rows[0];
};

/* ========================== GET POLICIES ========================== */
exports.getPolicies = async (db, tenantId, filters = {}) => {
    const query = getQuery(db);

    const params = [tenantId];
    let where = `WHERE lp.tenant_id = $1`;
    let i = 2;

    if (filters.leave_type_id) {
        where += ` AND lp.leave_type_id = $${i}`;
        params.push(filters.leave_type_id);
        i++;
    }

    if (filters.is_active !== undefined) {
        where += ` AND lp.is_active = $${i}`;
        params.push(filters.is_active);
        i++;
    }

    const res = await query(
        `SELECT lp.*, lt.name AS leave_type_name, lt.code AS leave_type_code
         FROM leave_policies lp
         JOIN leave_types lt ON lt.id = lp.leave_type_id
         ${where}
         ORDER BY lp.priority ASC, lp.name ASC`,
        params
    );

    return res.rows;
};

/* ========================== GET POLICY BY ID ========================== */
exports.getPolicyById = async (db, id, tenantId) => {
    const query = getQuery(db);

    const res = await query(
        `SELECT lp.*, lt.name AS leave_type_name, lt.code AS leave_type_code
         FROM leave_policies lp
         JOIN leave_types lt ON lt.id = lp.leave_type_id
         WHERE lp.id = $1 AND lp.tenant_id = $2`,
        [id, tenantId]
    );

    return res.rows[0] || null;
};

/* ========================== GET APPLICABLE POLICY FOR EMPLOYEE ========================== */
exports.getApplicablePolicy = async (db, employeeId, leaveTypeId, tenantId) => {
    const query = getQuery(db);

    // First check for employee-specific override
    const override = await query(
        `SELECT policy_id FROM employee_leave_policy_overrides
         WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
         AND effective_from <= CURRENT_DATE`,
        [tenantId, employeeId, leaveTypeId]
    );

    if (override.rowCount > 0) {
        return exports.getPolicyById(db, override.rows[0].policy_id, tenantId);
    }

    // Get employee details for matching
    const empRes = await query(
        `SELECT e.*, u.role, 
                EXTRACT(MONTH FROM AGE(NOW(), e.join_date)) + 
                EXTRACT(YEAR FROM AGE(NOW(), e.join_date)) * 12 AS tenure_months
         FROM employees e
         JOIN users u ON u.id = e.user_id
         WHERE e.id = $1 AND e.tenant_id = $2`,
        [employeeId, tenantId]
    );

    if (empRes.rowCount === 0) {
        throw new Error("Employee not found");
    }

    const emp = empRes.rows[0];
    const isProbation = emp.status === 'PROBATION' || emp.status === 'ONBOARDING';

    // Find matching policy based on criteria
    const policyRes = await query(
        `SELECT lp.*, lt.name AS leave_type_name, lt.code AS leave_type_code
         FROM leave_policies lp
         JOIN leave_types lt ON lt.id = lp.leave_type_id
         WHERE lp.tenant_id = $1 
           AND lp.leave_type_id = $2
           AND lp.is_active = true
           AND ($3 = ANY(lp.applicable_roles) OR lp.applicable_roles IS NULL)
           AND ($4 = ANY(lp.employment_types) OR lp.employment_types IS NULL)
           AND (lp.is_probation_eligible = true OR $5 = false)
           AND lp.min_tenure_months <= $6
         ORDER BY lp.priority ASC
         LIMIT 1`,
        [tenantId, leaveTypeId, emp.role, emp.employment_type, isProbation, emp.tenure_months || 0]
    );

    return policyRes.rows[0] || null;
};

/* ========================== UPDATE POLICY ========================== */
exports.updatePolicy = async (db, id, updates, actor) => {
    const query = getQuery(db);

    const allowed = [
        "name", "description", "applicable_roles", "employment_types",
        "is_probation_eligible", "min_tenure_months", "accrual_type",
        "accrual_rate", "max_balance", "year_start_month", "priority", "is_active",
        "carry_forward_enabled", "max_carry_forward"
    ];

    const fields = [];
    const params = [];
    let i = 1;

    for (const key of allowed) {
        if (updates[key] !== undefined) {
            fields.push(`${key} = $${i}`);
            params.push(updates[key]);
            i++;
        }
    }

    if (fields.length === 0) {
        throw new Error("No valid fields to update");
    }

    params.push(id, actor.tenantId);

    const res = await query(
        `UPDATE leave_policies 
         SET ${fields.join(", ")}, updated_at = now()
         WHERE id = $${i} AND tenant_id = $${i + 1}
         RETURNING *`,
        params
    );

    if (res.rowCount === 0) {
        throw new Error("Policy not found");
    }

    return res.rows[0];
};

/* ========================== DELETE POLICY ========================== */
exports.deletePolicy = async (db, id, actor) => {
    const query = getQuery(db);

    await query(
        `UPDATE leave_policies SET is_active = false, updated_at = now() 
         WHERE id = $1 AND tenant_id = $2`,
        [id, actor.tenantId]
    );

    return { success: true };
};

/* ========================== ASSIGN POLICY TO EMPLOYEE ========================== */
exports.assignPolicyToEmployee = async (db, data, actor) => {
    const query = getQuery(db);

    const res = await query(
        `INSERT INTO employee_leave_policy_overrides 
            (tenant_id, employee_id, leave_type_id, policy_id, reason, effective_from, effective_to, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (tenant_id, employee_id, leave_type_id)
         DO UPDATE SET policy_id = $4, reason = $5, effective_from = $6, effective_to = $7
         RETURNING *`,
        [
            actor.tenantId,
            data.employee_id,
            data.leave_type_id,
            data.policy_id,
            data.reason || null,
            data.effective_from || new Date().toISOString().split('T')[0],
            data.effective_to || null,
            actor.id
        ]
    );

    return res.rows[0];
};

/* ========================== RUN MONTHLY ACCRUAL ========================== */
exports.runMonthlyAccrual = async (db, tenantId) => {
    const query = getQuery(db);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const today = new Date().toISOString().split('T')[0];

    // Get all active employees
    const employees = await query(
        `SELECT e.id, e.user_id, u.role, e.employment_type, e.status, e.join_date,
                EXTRACT(MONTH FROM AGE(NOW(), e.join_date)) + 
                EXTRACT(YEAR FROM AGE(NOW(), e.join_date)) * 12 AS tenure_months
         FROM employees e
         JOIN users u ON u.id = e.user_id
         WHERE e.tenant_id = $1 AND e.status = 'ACTIVE' AND e.is_deleted = false`,
        [tenantId]
    );

    // Get all active leave types
    const leaveTypes = await query(
        `SELECT id FROM leave_types WHERE tenant_id = $1 AND is_active = true`,
        [tenantId]
    );

    let accrualCount = 0;

    for (const emp of employees.rows) {
        for (const lt of leaveTypes.rows) {
            const policy = await exports.getApplicablePolicy(db, emp.id, lt.id, tenantId);

            if (!policy || policy.accrual_type !== 'MONTHLY' || policy.accrual_rate <= 0) {
                continue;
            }

            let balance = await query(
                `SELECT * FROM leave_balances 
                 WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4`,
                [tenantId, emp.id, lt.id, currentYear]
            );

            if (balance.rowCount === 0) {
                let carryForwardAmount = 0;

                if (policy.carry_forward_enabled) {
                    const prevYearBalance = await query(
                        `SELECT current_balance FROM leave_balances 
                         WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4`,
                        [tenantId, emp.id, lt.id, currentYear - 1]
                    );

                    if (prevYearBalance.rowCount > 0) {
                        const unused = parseFloat(prevYearBalance.rows[0].current_balance);
                        const maxDays = policy.max_carry_forward * policy.accrual_rate;

                        carryForwardAmount = policy.max_carry_forward > 0
                            ? Math.min(unused, maxDays)
                            : unused;
                    }
                }

                await query(
                    `INSERT INTO leave_balances 
                        (tenant_id, employee_id, leave_type_id, year, opening_balance, carry_forward, accrual_start_date)
                     VALUES ($1, $2, $3, $4, 0, $5, $6)`,
                    [tenantId, emp.id, lt.id, currentYear, carryForwardAmount, emp.join_date || today]
                );

                balance = await query(
                    `SELECT * FROM leave_balances 
                     WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4`,
                    [tenantId, emp.id, lt.id, currentYear]
                );
            }

            const bal = balance.rows[0];

            if (bal.last_accrual_date) {
                const lastAccrualMonth = new Date(bal.last_accrual_date).getMonth() + 1;
                const lastAccrualYear = new Date(bal.last_accrual_date).getFullYear();

                if (lastAccrualMonth === currentMonth && lastAccrualYear === currentYear) {
                    continue;
                }

                // Enforce monthly carry forward limits if it's a new month in the same year
                if (lastAccrualYear === currentYear && policy.accrual_type === 'MONTHLY') {
                    const currentTotalBalance = parseFloat(bal.current_balance);
                    const maxCarryDays = policy.carry_forward_enabled
                        ? (policy.max_carry_forward > 0 ? policy.max_carry_forward * policy.accrual_rate : Infinity)
                        : 0;

                    if (currentTotalBalance > maxCarryDays) {
                        const loss = currentTotalBalance - maxCarryDays;

                        // Adjust balance down to the limit
                        await query(
                            `UPDATE leave_balances SET adjusted = adjusted - $1, updated_at = now() WHERE id = $2`,
                            [loss, bal.id]
                        );

                        // Log the expiry
                        await query(
                            `INSERT INTO leave_balance_adjustments 
                                (tenant_id, balance_id, employee_id, adjustment_type, amount, reason, 
                                 previous_balance, new_balance, created_by)
                             VALUES ($1, $2, $3, 'EXPIRY', $4, $5, $6, $7, $8)`,
                            [
                                tenantId, bal.id, emp.id, -loss,
                                `Monthly carry-forward limit (${policy.max_carry_forward} months) enforced`,
                                currentTotalBalance, maxCarryDays, null
                            ]
                        );

                        // Refresh local bal object for subsequent calculations
                        const refreshed = await query(
                            `SELECT * FROM leave_balances WHERE id = $1`,
                            [bal.id]
                        );
                        Object.assign(bal, refreshed.rows[0]);
                    }
                }
            }

            const newAccrued = parseFloat(bal.accrued) + policy.accrual_rate;
            let actualAccrual = policy.accrual_rate;

            // Pro-rata logic for new joinees
            if (emp.join_date) {
                const joinDate = new Date(emp.join_date);
                const joinMonth = joinDate.getMonth() + 1;
                const joinYear = joinDate.getFullYear();

                if (joinMonth === currentMonth && joinYear === currentYear) {
                    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
                    const joinDay = joinDate.getDate();
                    const workedDays = daysInMonth - joinDay + 1;

                    if (workedDays < daysInMonth) {
                        actualAccrual = Number((policy.accrual_rate * (workedDays / daysInMonth)).toFixed(2));
                    }
                }
            }

            if (policy.max_balance) {
                const projectedBalance = parseFloat(bal.opening_balance) + newAccrued - parseFloat(bal.used) + parseFloat(bal.adjusted);
                // Note: Re-calculating newAccrued with actualAccrual for max balance check might be cleaner, 
                // but let's stick to valid accrual first.
                // If actual accrual is reduced by pro-rata, using it here is correct.

                // Let's assume newAccrued for max balance check should consider pro-rata too? 
                // Yes, logic: (opening + (accrued_so_far) + NEW_ACCRUAL - used + adjusted) <= max
                // But `accrued` in DB is total accrued so far.

                const currentTotalBalance = parseFloat(bal.current_balance);

                // If adding actualAccrual exceeds max balance
                if ((currentTotalBalance + actualAccrual) > policy.max_balance) {
                    actualAccrual = Math.max(0, policy.max_balance - currentTotalBalance);
                }
            }

            if (actualAccrual > 0) {
                await query(
                    `UPDATE leave_balances 
                     SET accrued = accrued + $1, last_accrual_date = $2, updated_at = now()
                     WHERE id = $3`,
                    [actualAccrual, today, bal.id]
                );

                const updatedBal = await query(
                    `SELECT current_balance FROM leave_balances WHERE id = $1`,
                    [bal.id]
                );

                await query(
                    `INSERT INTO leave_balance_adjustments 
                        (tenant_id, balance_id, employee_id, adjustment_type, amount, reason, 
                         previous_balance, new_balance, created_by)
                     VALUES ($1, $2, $3, 'ACCRUAL', $4, $5, $6, $7, $8)`,
                    [
                        tenantId, bal.id, emp.id, actualAccrual,
                        `Monthly accrual for ${currentMonth}/${currentYear}`,
                        bal.current_balance,
                        updatedBal.rows[0].current_balance,
                        null
                    ]
                );

                accrualCount++;
            }
        }
    }

    return { success: true, accruals_processed: accrualCount };
};
