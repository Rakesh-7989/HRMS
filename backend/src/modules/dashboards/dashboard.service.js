// src/modules/dashboards/dashboard.service.js
const pool = require("../../config/db");

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
      (SELECT COUNT(*) FROM tenants WHERE is_active = true) AS active_tenants,
      (SELECT COUNT(*) FROM tenants) AS total_tenants,
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM employees) AS total_employees,
      (SELECT COUNT(DISTINCT tenant_id) FROM users WHERE last_login_at > NOW() - INTERVAL '24 hours') AS active_tenants_24h,
      (SELECT COUNT(*) FROM users WHERE last_login_at > NOW() - INTERVAL '24 hours') AS active_users_24h
    `
  );

  // Get tenant growth (last 30 days)
  const tenantGrowth = await query(
    `
    SELECT
      DATE(created_at) AS date,
      COUNT(*) AS new_tenants
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
      COUNT(*) AS new_users
    FROM users
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
    `
  );

  // Get top active tenants
  const topActiveTenants = await query(
    `
    SELECT
      t.id,
      t.name,
      COUNT(DISTINCT u.id) AS user_count,
      COUNT(DISTINCT us.id) AS session_count,
      MAX(u.last_login_at) AS last_activity
    FROM tenants t
    LEFT JOIN users u ON u.tenant_id = t.id
    LEFT JOIN user_sessions us ON us.tenant_id = t.id
    WHERE t.is_active = true
    GROUP BY t.id, t.name
    ORDER BY session_count DESC
    LIMIT 10
    `
  );

  // Get system health status
  const systemHealth = await query(
    `
    SELECT
      (SELECT COUNT(*) FROM tenants WHERE is_active = true) AS active_orgs,
      (SELECT COUNT(*) FROM users WHERE is_active = true) AS active_users,
      (SELECT COUNT(*) FROM users WHERE must_change_password = true) AS pending_pwd_change,
      (SELECT COUNT(*) FROM users WHERE last_login_at < NOW() - INTERVAL '30 days' OR last_login_at IS NULL) AS inactive_users
    `
  );

  return {
    metrics: systemMetrics.rows[0],
    tenantGrowth: tenantGrowth.rows,
    userGrowth: userGrowth.rows,
    topActiveTenants: topActiveTenants.rows,
    systemHealth: systemHealth.rows[0],
    generatedAt: new Date()
  };
};

/* ==================== ADMIN DASHBOARD ==================== */

/**
 * Get comprehensive organization dashboard for ADMIN/HR
 */
exports.getAdminDashboard = async (db, tenantId) => {
  const query = getQuery(db);
  console.log("DEBUG: Starting getAdminDashboard for tenant:", tenantId);

  // Get organization metrics
  const orgMetrics = await query(
    `
      SELECT
        (SELECT COUNT(*) FROM users WHERE tenant_id=$1) AS total_users,
        (SELECT COUNT(*) FROM employees WHERE tenant_id=$1) AS total_employees,
        (SELECT COUNT(*) FROM departments WHERE tenant_id=$1) AS total_departments,
        (SELECT COUNT(*) FROM designations WHERE tenant_id=$1) AS total_designations,
        (SELECT COUNT(*) FROM users WHERE tenant_id=$1 AND is_active = true) AS active_users,
        (SELECT COUNT(*) FROM users WHERE tenant_id=$1 AND is_active = false) AS inactive_users
    `,
    [tenantId]
  );

  // Get role distribution
  const roleDistribution = await query(
    `
      SELECT role, COUNT(*) as count
      FROM users
      WHERE tenant_id=$1
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
        COUNT(e.id) AS employee_count,
        COUNT(DISTINCT e.reports_to) AS manager_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.tenant_id=$1
      WHERE d.tenant_id=$1
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
        COUNT(*) AS total_checkins,
        COUNT(CASE WHEN is_late THEN 1 END) AS late_arrivals,
        COUNT(DISTINCT employee_id) AS unique_employees
      FROM attendance
      WHERE tenant_id=$1
      AND date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date DESC
    `,
    [tenantId]
  );

  // Get leave statistics
  const leaveStatistics = await query(
    `
      SELECT
        lt.name AS leave_type,
        COUNT(la.id) AS total_requests,
        COUNT(CASE WHEN la.status = 'APPROVED' THEN 1 END) AS approved,
        COUNT(CASE WHEN la.status = 'REJECTED' THEN 1 END) AS rejected,
        COUNT(CASE WHEN la.status = 'PENDING' THEN 1 END) AS pending
      FROM leave_applications la
      LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
      WHERE la.tenant_id=$1
      AND la.created_at > NOW() - INTERVAL '30 days'
      GROUP BY lt.name
      ORDER BY total_requests DESC
    `,
    [tenantId]
  );

  // Get employee status breakdown
  const employeeStatus = await query(
    `
      SELECT
        SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END) AS inactive,
        SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) AS new_employees
      FROM users
      WHERE tenant_id=$1
    `,
    [tenantId]
  );

  // Get top departments by headcount
  const topDepartments = await query(
    `
      SELECT
        d.id,
        d.name,
        COUNT(e.id) AS headcount
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.tenant_id=$1
      WHERE d.tenant_id=$1
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
exports.getHRDashboard = async (db, tenantId) => {
  const query = getQuery(db);

  // Get leave metrics
  const leaveMetrics = await query(
    `
    SELECT
      COUNT(*) AS total_requests,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) AS approved,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) AS rejected,
      COUNT(DISTINCT employee_id) AS employees_with_requests
    FROM leave_applications
    WHERE tenant_id=$1
    `,
    [tenantId]
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
    WHERE la.tenant_id=$1
    AND la.status = 'PENDING'
    ORDER BY la.created_at DESC
    LIMIT 20
    `,
    [tenantId]
  );

  // Get leave type distribution
  const leaveTypeDistribution = await query(
    `
    SELECT
      lt.name AS leave_type,
      COUNT(la.id) AS count,
      COUNT(CASE WHEN la.status = 'APPROVED' THEN 1 END) AS approved_count,
      AVG(CAST(la.end_date - la.start_date AS INTEGER)) AS avg_duration_days
    FROM leave_applications la
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.tenant_id=$1
    AND la.created_at > NOW() - INTERVAL '90 days'
    GROUP BY lt.name
    ORDER BY count DESC
    `,
    [tenantId]
  );

  // Get attendance overview
  const attendanceOverview = await query(
    `
    SELECT
      CURRENT_DATE AS date,
      COUNT(*) AS total_checkins,
      COUNT(DISTINCT employee_id) AS unique_employees,
      COUNT(CASE WHEN is_late THEN 1 END) AS late_count,
      CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(100.0 * COUNT(CASE WHEN is_late THEN 1 END) / COUNT(*), 2)
      END AS late_percentage
    FROM attendance
    WHERE tenant_id=$1
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
    WHERE la.tenant_id=$1
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
      COUNT(la.id) AS total_leave_days,
      COUNT(CASE WHEN la.status = 'APPROVED' THEN 1 END) AS approved_days
    FROM employees e
    LEFT JOIN leave_applications la ON la.employee_id = e.id AND la.tenant_id=$1
    WHERE e.tenant_id=$1
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
    WHERE la.tenant_id=$1
    AND la.updated_at > NOW() - INTERVAL '7 days'
    AND la.status IN ('APPROVED', 'REJECTED')
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
    AND e.id NOT IN (
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
      COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (CAST(check_out_time AS TEXT)::TIME - CAST(check_in_time AS TEXT)::TIME)) / 3600)::NUMERIC, 2), 0) AS avg_hours_worked
    FROM attendance
    WHERE employee_id=$1
    AND tenant_id=$2
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
    WHERE employee_id=$1
    AND tenant_id=$2
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
    WHERE employee_id=$1
    AND tenant_id=$2
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

  return {
    profile: employeeProfile.rows[0],
    leaveMetrics: leaveMetrics.rows[0],
    leaveHistory: leaveHistory.rows,
    attendanceSummary: attendanceSummary.rows[0],
    todayStatus: todayStatus.rows[0] || { status: 'NOT_CHECKED_IN' },
    monthlyAttendance: monthlyAttendance.rows,
    upcomingLeaves: upcomingEvents.rows,
    generatedAt: new Date()
  };
};
