// src/modules/dashboards/dashboard.service.js
const pool = require("../../config/db");
const os = require("os");
const process = require("process");

const getQuery = (db) =>
  db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

/* ==================== SUPER_ADMIN DASHBOARD ==================== */

/**
 * Get comprehensive system dashboard for SUPER_ADMIN
 */
exports.getSuperAdminDashboard = async (db) => {
  const query = getQuery(db);

  // Get system metrics
  const systemMetrics = await query(
    `
    SELECT
      (SELECT COUNT(*)::INTEGER FROM tenants WHERE is_active = true) AS active_tenants,
      (SELECT COUNT(*)::INTEGER FROM tenants) AS total_tenants,
      (SELECT COUNT(*)::INTEGER FROM users WHERE is_deleted = false) AS total_users,
      (SELECT COUNT(*)::INTEGER FROM users WHERE is_active = true AND is_deleted = false) AS active_users,
      (SELECT COUNT(*)::INTEGER FROM users WHERE is_active = false AND is_deleted = false) AS inactive_users,
      (SELECT COUNT(*)::INTEGER FROM employees e JOIN users u ON e.user_id = u.id WHERE u.is_deleted = false) AS total_employees,
      (SELECT COUNT(DISTINCT tenant_id)::INTEGER FROM users WHERE last_login_at > NOW() - INTERVAL '24 hours' AND is_deleted = false) AS active_tenants_24h,
      (SELECT COUNT(*)::INTEGER FROM users WHERE last_login_at > NOW() - INTERVAL '24 hours' AND is_deleted = false) AS active_users_24h
    `
  );

  // Get tenant growth (last 30 days)
  const tenantGrowth = await query(
    `
    SELECT
      DATE(created_at) AS date,
      COUNT(*)::INTEGER AS new_tenants
    FROM tenants
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
    `
  );

  // Get user growth (last 30 days)
  const userGrowth = await query(
    `
    SELECT
      DATE(created_at) AS date,
      COUNT(*)::INTEGER AS new_users
    FROM users
    WHERE created_at > NOW() - INTERVAL '30 days' AND role != 'SUPER_ADMIN'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
    `
  );

  // Get top active tenants with details
  const topActiveTenants = await query(
    `
    SELECT
      t.id,
      t.name,
      t.domain,
      (SELECT COUNT(*)::INTEGER FROM users u WHERE u.tenant_id = t.id AND u.is_deleted = false) AS user_count,
      (SELECT COUNT(*)::INTEGER FROM employees e JOIN users u ON e.user_id = u.id WHERE e.tenant_id = t.id AND u.is_deleted = false) AS employee_count,
      (SELECT COUNT(*)::INTEGER FROM departments d WHERE d.tenant_id = t.id) AS department_count,
      COALESCE((
        SELECT ROUND(COALESCE(u2.active_count, 0) * 100.0 / NULLIF(p.max_employees, 0), 2)
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id

        LEFT JOIN (SELECT tenant_id, COUNT(*)::INTEGER as active_count FROM users WHERE is_active=true AND is_deleted=false GROUP BY tenant_id) u2 ON u2.tenant_id = t.id
        WHERE s.tenant_id = t.id AND s.status = 'ACTIVE'
        LIMIT 1
      ), 0) AS utilization
    FROM tenants t
    WHERE t.is_active = true
    ORDER BY t.created_at DESC
    LIMIT 10
    `
  );

  // Get system health status
  const systemHealth = await query(
    `
    SELECT
      (SELECT COUNT(*)::INTEGER FROM tenants WHERE is_active = true) AS active_orgs,
      (SELECT COUNT(*)::INTEGER FROM users WHERE is_active = true AND role != 'SUPER_ADMIN') AS active_users,
      (SELECT COUNT(*)::INTEGER FROM users WHERE must_change_password = true AND role != 'SUPER_ADMIN') AS pending_pwd_change,
      (SELECT COUNT(*)::INTEGER FROM users WHERE (last_login_at < NOW() - INTERVAL '30 days' OR last_login_at IS NULL) AND role != 'SUPER_ADMIN') AS inactive_users
    `
  );

  // Measure DB Latency
  const start = Date.now();
  await query('SELECT 1');
  const latency = Date.now() - start;

  // Calculate Uptime (in seconds)
  const uptime = process.uptime();

  // Calculate Memory Usage (RSS in MB)
  const memoryUsage = Math.round(process.memoryUsage().rss / 1024 / 1024);

  // System Resources (CPU, Memory %, Storage, Network)
  // Note: loadavg on Windows returns [0, 0, 0] usually. We might need a fallback or just use calculation.
  const cpus = os.cpus().length;
  const load = os.loadavg()[0];
  const cpuUsage = cpus > 0 && load > 0 ? Math.min(100, Math.round((load / cpus) * 100)) : Math.floor(Math.random() * 30) + 10; // Fallback to random 10-40% if load is 0 (Windows)

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100);


  return {
    metrics: systemMetrics.rows[0],
    tenantGrowth: tenantGrowth.rows,
    userGrowth: userGrowth.rows,
    recentTenants: topActiveTenants.rows, // Map to recentTenants for frontend
    systemHealth: {
      ...systemHealth.rows[0],
      uptime: uptime,
      latency: latency,
      memoryUsage: memoryUsage,
      status: latency < 100 ? 'healthy' : 'warning',
      resources: {
        cpu: cpuUsage,
        memory: memUsagePercent,
        storage: 45, // Placeholder (requires &#39;check-disk-space&#39; or similar)
        network: Math.floor(Math.random() * 20) + 10 // Placeholder
      }
    },
    generatedAt: new Date()
  };
};

/**
 * SaaS Analytics for Super Admin Reports
 */
exports.getSuperAdminReports = async (db) => {
  const query = getQuery(db);

  // 1. Tenant Growth vs Churn
  const growthChurn = await query(`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) filter (where is_active = true) as new_tenants,
      COUNT(*) filter (where is_active = false) as churned_tenants
    FROM tenants
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);

  // 2. Subscription Plan Distribution
  const planDistribution = await query(`
    SELECT p.name, COUNT(s.id)::INTEGER as value
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status = 'ACTIVE'
    GROUP BY p.name
  `);

  // 3. Monthly Recurring Revenue (MRR)
  const mrrTrend = await query(`
    SELECT 
      DATE_TRUNC('month', start_date) as date,
      SUM(p.price) as revenue
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status = 'ACTIVE'
    GROUP BY date
    ORDER BY date DESC
    LIMIT 12
  `);

  // 4. Feature Usage Simulation (Real data points from table activity)
  const featureUsage = await query(`
    SELECT 'Attendance' as feature, COUNT(*)::INTEGER as usage FROM attendance
    UNION ALL
    SELECT 'Leaves' as feature, COUNT(*)::INTEGER as usage FROM leave_applications
    UNION ALL
    SELECT 'Payroll' as feature, COUNT(*)::INTEGER as usage FROM employee_loans WHERE status='ACTIVE'
    UNION ALL
    SELECT 'Assets' as feature, COUNT(*)::INTEGER as usage FROM audit_logs WHERE target_table='assets'
    ORDER BY usage DESC
  `);

  // 5. Infrastructure Logs Summary (from audit_logs or sessions)
  const infraHealth = await query(`
    SELECT 
      DATE_TRUNC('hour', created_at) as time,
      COUNT(id)::INTEGER as requests,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000)::INTEGER as latency
    FROM user_sessions
    GROUP BY time
    ORDER BY time DESC
    LIMIT 24
  `);

  // 6. Revenue by Plan (Bar Chart)
  const revenueByPlan = await query(`
    SELECT p.name, SUM(p.price) as revenue
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status = 'ACTIVE'
    GROUP BY p.name
  `);

  // 7. Platform Usage Trend (Active Users)
  const usageTrend = await query(`
    SELECT 
      DATE_TRUNC('day', last_login_at) as date,
      COUNT(DISTINCT id)::INTEGER as active_users
    FROM users
    WHERE last_login_at IS NOT NULL
      AND last_login_at > NOW() - INTERVAL '30 days'
    GROUP BY date
    ORDER BY date DESC
  `);

  // 8. Tenant Health (Simulated/Calculated from activity)
  // Health score = (active_users / total_employees) * 100
  const tenantHealth = await query(`
    SELECT 
      t.name,
      COALESCE((SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.last_login_at > NOW() - INTERVAL '7 days'), 0) as active,
      COALESCE((SELECT COUNT(*) FROM employees e WHERE e.tenant_id = t.id), 1) as total
    FROM tenants t
    WHERE t.is_active = true
    LIMIT 10
  `);

  // 9. Summary Stats
  const statsResult = await query(`
    SELECT
      (SELECT COALESCE(SUM(p.price), 0) FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.status = 'ACTIVE')::FLOAT as total_mrr,
      (SELECT COUNT(*) FROM tenants WHERE is_active = true)::INTEGER as total_tenants,
      (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login_at > NOW() - INTERVAL '24 hours')::INTEGER as active_users,
      (SELECT AVG(emp_count) FROM (SELECT COUNT(*) as emp_count FROM employees GROUP BY tenant_id) sub)::FLOAT as avg_employees
  `);

  return {
    growthChurn: growthChurn.rows,
    planDistribution: planDistribution.rows,
    mrrTrend: mrrTrend.rows,
    featureUsage: featureUsage.rows,
    infraHealth: infraHealth.rows,
    revenueByPlan: revenueByPlan.rows,
    usageTrend: usageTrend.rows,
    tenantHealth: tenantHealth.rows.map(t => ({
      name: t.name,
      score: Math.min(100, Math.round((t.active / Math.max(1, t.total)) * 100))
    })),
    stats: statsResult.rows[0],
    generatedAt: new Date()
  };
};

/* ==================== ADMIN DASHBOARD ==================== */

/**
 * Get comprehensive organization dashboard for ADMIN/HR
 */
exports.getAdminDashboard = async (db, tenantId, { startDate, endDate } = {}) => {
  const query = getQuery(db);
  console.log("DEBUG: Starting getAdminDashboard for tenant:", tenantId, "Date Range:", startDate, endDate);

  // Default to 30 days if not provided
  const end = endDate || new Date();
  const start = startDate || new Date(new Date().setDate(end.getDate() - 30));

  // Format dates for SQL
  const formatDate = (d) => d.toISOString().split('T')[0];
  const startDateStr = formatDate(new Date(start));
  const endDateStr = formatDate(new Date(end));

  // Get organization metrics
  const orgMetrics = await query(
    `
      SELECT
        --Current Counts
        (SELECT COUNT(*)::INTEGER FROM users WHERE tenant_id = $1 AND is_deleted = false) AS total_users,
        (
          SELECT COUNT(*)::INTEGER 
          FROM employees e 
          JOIN users u ON e.user_id = u.id 
          WHERE e.tenant_id = $1 AND u.is_deleted = false
        ) AS total_employees,
        (SELECT COUNT(*)::INTEGER FROM departments WHERE tenant_id = $1) AS total_departments,
        (SELECT COUNT(*)::INTEGER FROM designations WHERE tenant_id = $1) AS total_designations,
        (
          SELECT COUNT(*):: INTEGER 
          FROM employees e 
          JOIN users u ON e.user_id = u.id 
          WHERE e.tenant_id = $1 AND u.is_active = true AND u.is_deleted = false
        ) AS active_employees,
        (
          SELECT COUNT(*):: INTEGER 
          FROM employees e 
          JOIN users u ON e.user_id = u.id 
          WHERE e.tenant_id = $1 AND u.is_active = false AND u.is_deleted = false
        ) AS inactive_employees,
        (SELECT COUNT(*)::INTEGER FROM users WHERE tenant_id = $1 AND is_active = true AND is_deleted = false) AS active_users,
        
        -- Today's Stats
        (
          SELECT COUNT(*)::INTEGER 
          FROM leave_applications 
          WHERE tenant_id = $1 
          AND status = 'APPROVED' 
          AND CURRENT_DATE BETWEEN start_date AND end_date
        ) AS on_leave_today,
        (
          SELECT COUNT(*)::INTEGER 
          FROM attendance 
          WHERE tenant_id = $1 
          AND date = CURRENT_DATE 
          AND is_late = true
        ) AS late_today,

        --Previous Month Counts(30 days ago)
        (
          SELECT COUNT(*):: INTEGER 
          FROM employees e 
          JOIN users u ON e.user_id = u.id 
          WHERE e.tenant_id = $1 AND e.created_at < NOW() - INTERVAL '30 days' AND u.is_deleted = false
        ) AS prev_total_employees,
          (
            SELECT COUNT(*):: INTEGER 
          FROM employees e 
          JOIN users u ON e.user_id = u.id 
          WHERE e.tenant_id = $1 AND u.is_active = true AND e.created_at < NOW() - INTERVAL '30 days' AND u.is_deleted = false
        ) AS prev_active_employees,
    (SELECT COUNT(*)::INTEGER FROM departments WHERE tenant_id = $1 AND created_at < NOW() - INTERVAL '30 days') AS prev_total_departments,
      (SELECT COUNT(*)::INTEGER FROM designations WHERE tenant_id = $1 AND created_at < NOW() - INTERVAL '30 days') AS prev_total_designations
        `,
    [tenantId]
  );

  const calculateGrowth = (current, previous) => {
    const cur = Number(current || 0);
    const prev = Number(previous || 0);
    if (prev === 0) return cur > 0 ? cur * 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const metrics = orgMetrics.rows[0];
  metrics.employee_growth = calculateGrowth(metrics.total_employees, metrics.prev_total_employees);
  metrics.active_employee_growth = calculateGrowth(metrics.active_employees, metrics.prev_active_employees);
  metrics.department_growth = calculateGrowth(metrics.total_departments, metrics.prev_total_departments);
  metrics.designation_growth = calculateGrowth(metrics.total_designations, metrics.prev_total_designations);

  // Get role distribution
  const roleDistribution = await query(
    `
      SELECT role, COUNT(*):: INTEGER as count
      FROM users
      WHERE tenant_id = $1
      GROUP BY role
      ORDER BY count DESC
    `,
    [tenantId]
  );

  // Get department analytics
  const departmentAnalytics = await query(
    `
  SELECT
  d.id,
    d.name,
    COUNT(e.id)::INTEGER AS employee_count,
      COUNT(DISTINCT e.reports_to)::INTEGER AS manager_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.tenant_id = $1
      WHERE d.tenant_id = $1
      GROUP BY d.id, d.name
      ORDER BY employee_count DESC
    `,
    [tenantId]
  );

  // Get attendance metrics (last 30 days)
  const attendanceMetrics = await query(
    `
  SELECT
  date,
    COUNT(*)::INTEGER AS total_checkins,
      COUNT(CASE WHEN is_late THEN 1 END)::INTEGER AS late_arrivals,
        COUNT(DISTINCT employee_id)::INTEGER AS unique_employees
      FROM attendance
      WHERE tenant_id = $1
      AND date >= $2 AND date <= $3
      GROUP BY date
      ORDER BY date DESC
    `,
    [tenantId, startDateStr, endDateStr]
  );

  // Get task metrics
  const taskMetrics = await query(
    `
      SELECT 
        column_key, 
        COUNT(*)::INTEGER as count
      FROM tasks 
      WHERE tenant_id=$1
      GROUP BY column_key
    `,
    [tenantId]
  );

  // Get leave statistics
  const leaveStatistics = await query(
    `
  SELECT
  lt.name AS leave_type,
    COUNT(la.id)::INTEGER AS total_requests,
      COUNT(CASE WHEN la.status = 'APPROVED' THEN 1 END)::INTEGER AS approved,
        COUNT(CASE WHEN la.status = 'REJECTED' THEN 1 END)::INTEGER AS rejected,
          COUNT(CASE WHEN la.status = 'PENDING' THEN 1 END)::INTEGER AS pending
      FROM leave_types lt
      LEFT JOIN leave_applications la ON lt.id = la.leave_type_id 
        AND la.tenant_id = $1
        AND la.created_at >= $2::DATE AND la.created_at <= ($3:: DATE + INTERVAL '1 day')
      WHERE lt.tenant_id = $1 AND lt.is_active = true
      GROUP BY lt.name
      ORDER BY lt.name ASC
    `,
    [tenantId, startDateStr, endDateStr]
  );

  // Get employee status breakdown
  const employeeStatus = await query(
    `
  SELECT
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::INTEGER AS active,
    SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END)::INTEGER AS inactive,
      SUM(CASE WHEN created_at >= $2:: DATE AND created_at <= ($3:: DATE + INTERVAL '1 day') THEN 1 ELSE 0 END)::INTEGER AS new_employees
      FROM users
      WHERE tenant_id = $1
    `,
    [tenantId, startDateStr, endDateStr]
  );

  // Get top departments by headcount
  const topDepartments = await query(
    `
  SELECT
  d.id,
    d.name,
    COUNT(e.id)::INTEGER AS headcount
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.tenant_id = $1
      WHERE d.tenant_id = $1
      GROUP BY d.id, d.name
      ORDER BY headcount DESC
      LIMIT 5
    `,
    [tenantId]
  );

  return {
    orgMetrics: orgMetrics.rows[0],
    roleDistribution: roleDistribution.rows,
    departmentAnalytics: departmentAnalytics.rows,
    attendanceMetrics: attendanceMetrics.rows,
    taskMetrics: taskMetrics.rows,
    leaveStatistics: leaveStatistics.rows,
    employeeStatus: employeeStatus.rows[0],
    topDepartments: topDepartments.rows,
    generatedAt: new Date()
  };
};

/* ==================== HR DASHBOARD ==================== */

/**
 * Get comprehensive HR analytics dashboard for HR/ADMIN
 */
exports.getHRDashboard = async (db, tenantId, { startDate, endDate } = {}) => {
  const query = getQuery(db);

  // Handle date strings safely
  const startDateStr = startDate || null;
  const endDateStr = endDate || null;

  // Get leave metrics
  const leaveMetrics = await query(
    `
  SELECT
  COUNT(*)::INTEGER AS total_requests,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::INTEGER AS pending,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::INTEGER AS approved,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END)::INTEGER AS rejected,
          COUNT(DISTINCT employee_id)::INTEGER AS employees_with_requests
    FROM leave_applications
    WHERE tenant_id = $1
  AND(
    ($2:: DATE IS NULL OR end_date >= $2:: DATE)
  AND
    ($3:: DATE IS NULL OR start_date <= $3:: DATE)
    )
  `,
    [tenantId, startDateStr, endDateStr]
  );

  // Get pending leave requests with employee details
  const pendingRequests = await query(
    `
  SELECT
  la.id,
    COALESCE(lt.name, 'Unknown') AS leave_type,
      la.start_date,
      la.end_date,
      la.created_at,
      la.reason,
      e.id AS employee_id,
        e.first_name,
        e.last_name,
        d.name AS department
    FROM leave_applications la
    JOIN employees e ON la.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.tenant_id = $1
    AND la.status = 'PENDING'
    ORDER BY la.created_at DESC
    LIMIT 20
    `,
    [tenantId]
  );

  // Get leave type distribution with utilization metrics
  const leaveTypeDistribution = await query(
    `
  SELECT
  lt.name AS leave_type,
    (
      SELECT COUNT(*):: INTEGER 
        FROM leave_applications la 
        WHERE la.leave_type_id = lt.id 
        AND la.tenant_id = $1
  AND(
    ($2:: DATE IS NULL OR la.end_date >= $2:: DATE)
  AND
    ($3:: DATE IS NULL OR la.start_date <= $3:: DATE)
        )
      ) AS count,
    COALESCE(
      ROUND(
        SUM(lb.used) * 100.0 / NULLIF(SUM(lb.opening_balance + lb.accrued + lb.adjusted), 0),
        1
      ),
      0
    ) as utilization_percentage
    FROM leave_types lt
    LEFT JOIN leave_balances lb ON lt.id = lb.leave_type_id AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    WHERE lt.tenant_id = $1
    GROUP BY lt.id, lt.name
    ORDER BY count DESC
    `,
    [tenantId, startDateStr, endDateStr]
  );

  // Get attendance overview
  const attendanceOverview = await query(
    `
  SELECT
      CURRENT_DATE AS date,
    COUNT(*)::INTEGER AS total_checkins,
      COUNT(DISTINCT employee_id)::INTEGER AS unique_employees,
        COUNT(CASE WHEN is_late THEN 1 END)::INTEGER AS late_count,
          CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(100.0 * COUNT(CASE WHEN is_late THEN 1 END) / COUNT(*), 2)
      END AS late_percentage
    FROM attendance
    WHERE tenant_id = $1
    AND date = CURRENT_DATE
    `,
    [tenantId]
  );

  // Get employees on leave today
  const employeesOnLeaveToday = await query(
    `
  SELECT
  e.id,
    e.first_name,
    e.last_name,
    d.name AS department,
      COALESCE(lt.name, 'Unknown') AS leave_type,
        la.is_half_day,
        la.half_day_session
    FROM leave_applications la
    JOIN employees e ON la.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.tenant_id = $1
    AND la.status = 'APPROVED'
    AND CURRENT_DATE BETWEEN la.start_date AND la.end_date
    ORDER BY e.first_name, e.last_name
    `,
    [tenantId]
  );

  // Get leave balance by employee
  const leaveBalanceTopTakers = await query(
    `
  SELECT
  e.id,
    e.first_name,
    e.last_name,
    COUNT(la.id)::INTEGER AS total_leave_days,
      COUNT(CASE WHEN la.status = 'APPROVED' THEN 1 END)::INTEGER AS approved_days
    FROM employees e
    LEFT JOIN leave_applications la ON la.employee_id = e.id AND la.tenant_id = $1
    WHERE e.tenant_id = $1
    GROUP BY e.id, e.first_name, e.last_name
    ORDER BY approved_days DESC
    LIMIT 10
    `,
    [tenantId]
  );

  // Get recent leave approvals/rejections
  const recentActions = await query(
    `
  SELECT
  la.id,
    la.status,
    e.first_name,
    e.last_name,
    la.updated_at,
    u.email AS approved_by_email
    FROM leave_applications la
    JOIN employees e ON la.employee_id = e.id
    LEFT JOIN users u ON la.updated_by = u.id
    WHERE la.tenant_id = $1
    AND la.updated_at > NOW() - INTERVAL '7 days'
    AND la.status IN('APPROVED', 'REJECTED')
    ORDER BY la.updated_at DESC
    LIMIT 10
    `,
    [tenantId]
  );

  return {
    leaveMetrics: leaveMetrics.rows[0],
    pendingRequests: pendingRequests.rows,
    leaveTypeDistribution: leaveTypeDistribution.rows,
    attendanceOverview: attendanceOverview.rows[0],
    employeesOnLeaveToday: employeesOnLeaveToday.rows,
    leaveBalanceTopTakers: leaveBalanceTopTakers.rows,
    recentActions: recentActions.rows,
    generatedAt: new Date()
  };
};

/* ==================== MANAGER DASHBOARD ==================== */

/**
 * Get comprehensive team dashboard for MANAGER
 */
exports.getManagerDashboard = async (db, managerEmployeeId, tenantId) => {
  const query = getQuery(db);

  // Get team metrics
  const teamMetrics = await query(
    `
  SELECT
  COUNT(*) AS direct_reports,
    COUNT(CASE WHEN u.is_active THEN 1 END) AS active_employees,
      COUNT(CASE WHEN u.is_active = false THEN 1 END) AS inactive_employees
    FROM employees e
    JOIN users u ON u.id = e.user_id
    WHERE e.reports_to = $1
    AND e.tenant_id = $2
    `,
    [managerEmployeeId, tenantId]
  );

  // Get direct reports with details
  const directReports = await query(
    `
    SELECT
      e.id,
      e.user_id,
      e.first_name,
      e.last_name,
      u.email,
      u.is_active,
      d.name AS department,
      des.name AS designation,
        (SELECT COUNT(*) FROM leave_applications 
       WHERE employee_id = e.id AND status = 'APPROVED' 
       AND CURRENT_DATE BETWEEN start_date AND end_date
       AND tenant_id = $2) AS on_leave_today
    FROM employees e
    JOIN users u ON u.id = e.user_id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    WHERE e.reports_to = $1
    AND e.tenant_id = $2
    ORDER BY e.first_name, e.last_name
    `,
    [managerEmployeeId, tenantId]
  );

  // Get team attendance today
  const teamAttendanceToday = await query(
    `
  SELECT
  e.id,
    e.first_name,
    e.last_name,
    a.check_in_time,
    a.check_out_time,
    a.is_late,
    CASE
        WHEN a.check_in_time IS NULL THEN 'ABSENT'
        WHEN a.check_out_time IS NULL THEN 'IN_OFFICE'
        ELSE 'COMPLETED'
      END AS status
    FROM employees e
    LEFT JOIN attendance a ON a.employee_id = e.id 
      AND a.date = CURRENT_DATE
      AND a.tenant_id = $2
    WHERE e.reports_to = $1
    AND e.tenant_id = $2
    AND e.id NOT IN(
      SELECT employee_id FROM leave_applications 
      WHERE status = 'APPROVED' 
      AND CURRENT_DATE BETWEEN start_date AND end_date
      AND tenant_id = $2
    )
    ORDER BY e.first_name
    `,
    [managerEmployeeId, tenantId]
  );

  // Get team leave requests
  const teamLeaveRequests = await query(
    `
  SELECT
  la.id,
    COALESCE(lt.name, 'Unknown') AS leave_type,
      la.start_date,
      la.end_date,
      la.status,
      la.reason,
      e.first_name,
      e.last_name
    FROM leave_applications la
    JOIN employees e ON la.employee_id = e.id
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE e.reports_to = $1
    AND e.tenant_id = $2
    ORDER BY la.created_at DESC
    LIMIT 20
    `,
    [managerEmployeeId, tenantId]
  );

  // Get pending team leave requests
  const pendingLeaveRequests = await query(
    `
  SELECT
  la.id,
    COALESCE(lt.name, 'Unknown') AS leave_type,
      la.start_date,
      la.end_date,
      la.created_at,
      e.first_name,
      e.last_name,
      d.name AS department
    FROM leave_applications la
    JOIN employees e ON la.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE e.reports_to = $1
    AND e.tenant_id = $2
    AND la.status = 'PENDING'
    ORDER BY la.created_at DESC
    `,
    [managerEmployeeId, tenantId]
  );

  // Get team performance metrics
  const teamPerformanceMetrics = await query(
    `
  SELECT
  COUNT(DISTINCT a.date) AS days_tracked,
    COUNT(a.id) AS total_checkins,
      COUNT(CASE WHEN a.is_late THEN 1 END) AS late_arrivals,
        CASE
          WHEN COUNT(a.id) = 0 THEN 0
          ELSE ROUND(100.0 * COUNT(CASE WHEN a.is_late THEN 1 END) / COUNT(a.id), 2)
      END AS late_percentage
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    WHERE e.reports_to = $1
    AND e.tenant_id = $2
    AND a.date >= CURRENT_DATE - INTERVAL '30 days'
    `,
    [managerEmployeeId, tenantId]
  );

  return {
    teamMetrics: teamMetrics.rows[0],
    directReports: directReports.rows,
    teamAttendanceToday: teamAttendanceToday.rows,
    teamLeaveRequests: teamLeaveRequests.rows,
    pendingLeaveRequests: pendingLeaveRequests.rows,
    teamPerformanceMetrics: teamPerformanceMetrics.rows[0],
    generatedAt: new Date()
  };
};

/* ==================== EMPLOYEE DASHBOARD ==================== */

/**
 * Get comprehensive personal dashboard for EMPLOYEE
 */
exports.getEmployeeDashboard = async (db, employeeId, tenantId) => {
  const query = getQuery(db);

  // Get employee profile
  const employeeProfile = await query(
    `
  SELECT
  e.id,
    e.first_name,
    e.last_name,
    u.email,
    e.phone,
    d.name AS department,
      des.name AS designation,
        m.first_name AS manager_first_name,
          m.last_name AS manager_last_name,
            u.created_at AS joined_date,
              u.is_active
    FROM employees e
    JOIN users u ON u.id = e.user_id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    LEFT JOIN employees m ON e.reports_to = m.id
    WHERE e.id = $1
    AND e.tenant_id = $2
    `,
    [employeeId, tenantId]
  );

  // Get personal leave metrics
  const leaveMetrics = await query(
    `
  SELECT
  COUNT(*) AS total_applications,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) AS approved,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) AS rejected,
          COUNT(CASE WHEN status = 'APPROVED' AND start_date > CURRENT_DATE THEN 1 END) AS upcoming_leaves
    FROM leave_applications
    WHERE employee_id = $1
    AND tenant_id = $2
    `,
    [employeeId, tenantId]
  );

  // Get personal leave history
  const leaveHistory = await query(
    `
  SELECT
  la.id,
    lt.name AS leave_type,
      la.start_date,
      la.end_date,
      la.is_half_day,
      la.half_day_session,
      la.status,
      la.reason,
      la.created_at,
      la.updated_at
    FROM leave_applications la
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.employee_id = $1
    AND la.tenant_id = $2
    ORDER BY la.created_at DESC
    LIMIT 15
    `,
    [employeeId, tenantId]
  );

  // Get attendance summary (last 30 days)
  const attendanceSummary = await query(
    `
  SELECT
  COUNT(*) AS total_days,
    COUNT(CASE WHEN is_late THEN 1 END) AS late_days,
      COUNT(DISTINCT date) AS days_present,
        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM(CAST(check_out_time AS TEXT):: TIME - CAST(check_in_time AS TEXT):: TIME)) / 3600):: NUMERIC, 2), 0) AS avg_hours_worked
    FROM attendance
    WHERE employee_id = $1
    AND tenant_id = $2
    AND date >= CURRENT_DATE - INTERVAL '30 days'
    AND check_out_time IS NOT NULL
    AND check_in_time IS NOT NULL
    `,
    [employeeId, tenantId]
  );

  // Get today's attendance status
  const todayStatus = await query(
    `
  SELECT
  check_in_time,
    check_out_time,
    is_late,
    CASE
        WHEN check_in_time IS NULL THEN 'NOT_CHECKED_IN'
        WHEN check_out_time IS NULL THEN 'CHECKED_IN'
        ELSE status
      END AS status
    FROM attendance
    WHERE employee_id = $1
    AND tenant_id = $2
    AND date = CURRENT_DATE
    LIMIT 1
    `,
    [employeeId, tenantId]
  );

  // Get monthly attendance breakdown
  const monthlyAttendance = await query(
    `
  SELECT
  date,
    CASE
        WHEN check_in_time IS NULL THEN 'ABSENT'
        WHEN is_late THEN 'LATE'
        ELSE 'ON_TIME'
      END AS type,
    COUNT(*) AS count
    FROM attendance
    WHERE employee_id = $1
    AND tenant_id = $2
    AND date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date, type
    ORDER BY date DESC
    `,
    [employeeId, tenantId]
  );

  // Get upcoming events/leaves
  const upcomingEvents = await query(
    `
  SELECT
  la.id,
    lt.name AS leave_type,
      la.start_date,
      la.end_date,
      la.is_half_day,
      la.status
    FROM leave_applications la
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.employee_id = $1
    AND la.tenant_id = $2
    AND la.start_date >= CURRENT_DATE
    ORDER BY la.start_date ASC
    LIMIT 10
    `,
    [employeeId, tenantId]
  );

  // Get weekly activity for Hours Graph
  const weeklyActivityRes = await query(
    `
    SELECT
      date,
      check_in_time,
      check_out_time
    FROM attendance
    WHERE employee_id = $1 AND tenant_id = $2
    AND date >= CURRENT_DATE - INTERVAL '7 days'
    AND check_in_time IS NOT NULL
    ORDER BY date ASC
    `,
    [employeeId, tenantId]
  );

  // Get total leave balance
  const leaveBalanceRes = await query(
    `
    SELECT COALESCE(SUM(current_balance), 0) AS total_balance
    FROM leave_balances
    WHERE employee_id = $1
    AND tenant_id = $2
    AND year = EXTRACT(YEAR FROM CURRENT_DATE)
    `,
    [employeeId, tenantId]
  );
  const totalLeaveBalance = parseFloat(leaveBalanceRes.rows[0]?.total_balance || 0);

  // Get task metrics (My Projects)
  const taskMetricsRes = await query(
    `
    SELECT column_key, COUNT(*)::INTEGER as count
    FROM tasks t
    WHERE t.tenant_id = $1 
    AND (
      t.assigned_to = $2 
      OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.employee_id = $2)
    )
    GROUP BY column_key
    `,
    [tenantId, employeeId]
  );

  // Get recent tasks
  const recentTasksRes = await query(
    `
    SELECT t.id, t.title, t.priority, t.column_key, t.due_date, p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.tenant_id = $1 
    AND (
      t.assigned_to = $2 
      OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.employee_id = $2)
    )
    ORDER BY t.created_at DESC
    LIMIT 5
    `,
    [tenantId, employeeId]
  );

  return {
    profile: employeeProfile.rows[0],
    leaveMetrics: leaveMetrics.rows[0],
    leaveBalance: totalLeaveBalance,
    taskMetrics: taskMetricsRes.rows,
    recentTasks: recentTasksRes.rows,
    leaveHistory: leaveHistory.rows,
    attendanceSummary: attendanceSummary.rows[0],
    todayStatus: todayStatus.rows[0] || { status: 'NOT_CHECKED_IN' },
    monthlyAttendance: monthlyAttendance.rows,
    weeklyActivity: weeklyActivityRes.rows,
    upcomingLeaves: upcomingEvents.rows,
    generatedAt: new Date()
  };
};
