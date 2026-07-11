const pool = require("../../config/db");

const getQuery = (db) => {
    if (db && typeof db.query === "function") return (text, params) => db.query(text, params);
    return pool.query.bind(pool);
};

exports.getReports = async (db, tenantId, type) => {
    const query = getQuery(db);
    let sql = `SELECT * FROM compliance_reports WHERE tenant_id = $1`;
    const params = [tenantId];
    if (type) {
        sql += ` AND type = $2`;
        params.push(type);
    }
    sql += ` ORDER BY generated_at DESC`;
    const res = await query(sql, params);
    return res.rows;
};

exports.generateReport = async (db, tenantId, userId, data) => {
    const query = getQuery(db);
    const res = await query(
        `INSERT INTO compliance_reports (tenant_id, type, title, status, period_month, period_year, generated_by)
         VALUES ($1, $2, $3, 'GENERATING', $4, $5, $6) RETURNING *`,
        [tenantId, data.type, `${data.type} Report - ${data.month}/${data.year}`, data.month, data.year, userId]
    );
    const report = res.rows[0];
    setTimeout(async () => {
        try {
            const countRes = await query(`SELECT COUNT(*) as cnt FROM employees WHERE tenant_id = $1`, [tenantId]);
            const empCount = parseInt(countRes.rows[0].cnt) || 0;
            const totalAmt = data.type === 'PF' ? empCount * 1800 : data.type === 'ESI' ? empCount * 750 : 0;
            await query(
                `UPDATE compliance_reports SET status = 'READY', employee_count = $1, total_amount = $2, updated_at = now() WHERE id = $3`,
                [empCount, totalAmt, report.id]
            );
        } catch {
            await query(`UPDATE compliance_reports SET status = 'FAILED', updated_at = now() WHERE id = $1`, [report.id]);
        }
    }, 100);
    return report;
};

exports.getReportFile = async (db, tenantId, id) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT * FROM compliance_reports WHERE tenant_id = $1 AND id = $2`,
        [tenantId, id]
    );
    return res.rows[0] || null;
};

exports.getSummary = async (db, tenantId) => {
    const query = getQuery(db);
    const types = ['PF', 'ESI', 'PT', 'LWF'];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const results = [];
    for (const type of types) {
        const reportRes = await query(
            `SELECT status, employee_count, total_amount FROM compliance_reports WHERE tenant_id = $1 AND type = $2 AND period_month = $3 AND period_year = $4 ORDER BY generated_at DESC LIMIT 1`,
            [tenantId, type, currentMonth, currentYear]
        );
        results.push({
            type,
            label: `${type} Returns`,
            due_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`,
            status: reportRes.rows.length > 0 && reportRes.rows[0].status === 'READY' ? 'COMPLIED' : 'PENDING',
            month: currentMonth,
            year: currentYear,
            total_employees: reportRes.rows[0]?.employee_count || 0,
            total_amount: reportRes.rows[0]?.total_amount || 0
        });
    }
    return results;
};

exports.getForm16Data = async (db, tenantId, employeeId, year) => {
    const query = getQuery(db);
    const empRes = await query(
        `SELECT id, first_name, last_name, pan, date_of_joining FROM employees WHERE tenant_id = $1 AND id = $2`,
        [tenantId, employeeId]
    );
    if (empRes.rows.length === 0) return null;
    const emp = empRes.rows[0];
    const payslipRes = await query(
        `SELECT SUM(gross_pay) as gross, SUM(total_deductions) as deductions, SUM(net_pay) as net
         FROM payroll_run_items WHERE employee_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
        [employeeId, year]
    );
    return {
        employee: emp,
        financial_year: `${year}-${year + 1}`,
        gross_pay: payslipRes.rows[0]?.gross || 0,
        total_deductions: payslipRes.rows[0]?.deductions || 0,
        net_pay: payslipRes.rows[0]?.net || 0
    };
};
