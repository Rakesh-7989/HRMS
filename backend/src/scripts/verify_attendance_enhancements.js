const pool = require('../config/db');
const shiftService = require('../modules/shifts/shift.service');
const attendanceService = require('../modules/attendance/attendance.service');
const { v4: uuidv4 } = require('uuid');

async function testAttendanceLogic() {
    const client = await pool.connect();
    try {
        console.log("Starting Attendance Enhancement Verification...");

        // 1. Setup Test Data
        const tenantId = 'd0c9f8a0-2e4d-4b8a-9c7e-1a2b3c4d5e6f'; // Use an existing tenant ID from seed? Or create new?
        // Let's try to query an existing tenant first to be safe
        const tenantRes = await client.query("SELECT id FROM tenants LIMIT 1");
        if (tenantRes.rowCount === 0) throw new Error("No tenants found in DB. Run seed first.");
        const testTenantId = tenantRes.rows[0].id;

        const actor = { id: uuidv4(), tenantId: testTenantId, role: 'ADMIN' }; // Mock actor

        console.log(`Using Tenant: ${testTenantId}`);

        // 2. Create a Shift with OT Enabled
        console.log("Creating Test Shift...");
        const shiftData = {
            name: `Test Shift ${Date.now()}`,
            code: `TS-${Date.now()}`,
            start_time: '09:00',
            end_time: '18:00',
            break_start_time: '13:00',
            break_end_time: '14:00',
            grace_period_minutes: 15,
            work_hours: 8.0, // 8 hours required
            half_day_threshold_hours: 4.0,
            overtime_enabled: true
        };

        // Mock user for creation
        const userRes = await client.query("SELECT id FROM users WHERE tenant_id = $1 LIMIT 1", [testTenantId]);
        const creatorId = userRes.rows[0]?.id || actor.id;

        const shift = await shiftService.createShift(client, testTenantId, shiftData, creatorId);
        console.log("Shift Created:", shift.id);

        // 3. Create Test Employee
        console.log("Creating Test Employee...");
        const userId = uuidv4();
        const employeeId = uuidv4();
        await client.query(`
        INSERT INTO users (id, tenant_id, email, password_hash, role) 
        VALUES ($1, $2, $3, 'hash', 'EMPLOYEE')
    `, [userId, testTenantId, `test.emp.${Date.now()}@example.com`]);

        await client.query(`
        INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, shift_id)
        VALUES ($1, $2, $3, 'Test', 'Employee', $4)
    `, [employeeId, testTenantId, userId, shift.id]);

        // 4. Simulate Clock In
        console.log("Simulating Clock In...");
        const today = new Date().toISOString().split('T')[0];
        await client.query("DELETE FROM attendance WHERE employee_id = $1 AND date = $2", [employeeId, today]);

        const clockInRes = await attendanceService.clockIn(client, employeeId, { tenantId: testTenantId, id: userId }, { ip: '127.0.0.1', device: 'Test' });
        console.log("Clocked In:", clockInRes.check_in_time);

        // Manually backdate check-in to 10 hours ago
        await client.query(`UPDATE attendance SET check_in_time = NOW() - INTERVAL '10 hours' WHERE id = $1`, [clockInRes.id]);

        // Add a 1 hour break
        await client.query(`
        INSERT INTO attendance_breaks (attendance_id, tenant_id, start_time, end_time, duration_minutes)
        VALUES ($1, $2, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours', 60)
    `, [clockInRes.id, testTenantId]);

        // 5. Simulate Clock Out
        console.log("Simulating Clock Out...");
        const clockOutRes = await attendanceService.clockOut(client, employeeId, { tenantId: testTenantId, id: userId }, { ip: '127.0.0.1', device: 'Test', eod_report: 'Test work' });

        console.log("Clock Out Result:");
        console.log("Status:", clockOutRes.status);
        console.log("Effective Work Hours:", clockOutRes.effective_work_hours);
        console.log("Overtime Hours:", clockOutRes.overtime_hours);

        // Verification
        // Worked 10 hours (backdated clock in) - 1 hour break = 9 Effective Hours
        // Required 8 hours
        // Expected OT = 1 hour

        if (parseFloat(clockOutRes.effective_work_hours) >= 8.9 && parseFloat(clockOutRes.effective_work_hours) <= 9.1) {
            console.log("✅ Effective Hours Calculation Correct (~9.0)");
        } else {
            console.error("❌ Effective Hours Calculation Failed", clockOutRes.effective_work_hours);
        }

        if (parseFloat(clockOutRes.overtime_hours) >= 0.9 && parseFloat(clockOutRes.overtime_hours) <= 1.1) {
            console.log("✅ Overtime Calculation Correct (~1.0)");
        } else {
            console.error("❌ Overtime Calculation Failed", clockOutRes.overtime_hours);
        }

        // 6. Test Individual Report
        console.log("Testing Individual Report...");
        const report = await attendanceService.getIndividualEmployeeReport(client, testTenantId, employeeId, { from_date: today, to_date: today });
        if (report.daily_report.length > 0 && report.daily_report[0].status === 'PRESENT') {
            console.log("✅ Individual Report Generated Successfully");
        } else {
            console.error("❌ Report Generation Failed");
        }

        // Clean up
        await client.query("DELETE FROM employees WHERE id = $1", [employeeId]);
        await client.query("DELETE FROM users WHERE id = $1", [userId]);
        await client.query("DELETE FROM shifts WHERE id = $1", [shift.id]);

    } catch (error) {
        console.error("Verification Failed:", error);
    } finally {
        client.release();
    }
}

testAttendanceLogic();
