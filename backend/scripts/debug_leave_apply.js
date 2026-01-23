const pool = require("../src/config/db");
const leaveRequestService = require("../src/modules/leave/requests/leaveRequest.service");

async function debug() {
    try {
        console.log("Starting debug...");

        // 1. Get Tenant and Employee
        const empRes = await pool.query(`SELECT id, tenant_id FROM employees LIMIT 1`);
        if (empRes.rowCount === 0) throw new Error("No employees found");
        const emp = empRes.rows[0];
        console.log("Employee found:", emp);

        // 2. Get Leave Type
        const typeRes = await pool.query(`SELECT id, code, is_paid FROM leave_types WHERE tenant_id = $1 LIMIT 1`, [emp.tenant_id]);
        if (typeRes.rowCount === 0) throw new Error("No leave types found");
        const type = typeRes.rows[0];
        console.log("Leave Type found:", type);

        // 3. Try Apply Leave
        console.log("Applying leave...");
        try {
            const res = await leaveRequestService.applyLeave(null, emp.tenant_id, emp.id, {
                leave_type_id: type.id,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
                is_half_day: false,
                reason: "Debug Test"
            });
            console.log("Success:", res);
        } catch (err) {
            console.error("Apply Leave Failed!");
            console.error(err);
        }

    } catch (err) {
        console.error("Setup Failed:", err);
    } finally {
        pool.end();
    }
}

debug();
