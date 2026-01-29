const pool = require("../../config/db");
const logger = require("../../config/logger");
const geoFencingService = require("../geo_fencing/geoFencing.service");

const getQuery = (db) => {
  if (db && typeof db.query === "function") return db.query;
  return pool.query.bind(pool);
};

const todayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const nowTime = () => new Date().toTimeString().slice(0, 8);

/**
 * CLOCK IN
 * - Blocks if employee has approved FULL-DAY leave today
 */
exports.clockIn = async (db, employeeId, actor, meta) => {
  const query = getQuery(db);
  const today = todayDate();
  const now = nowTime();

  if (!employeeId) {
    throw new Error("Your employee profile is not complete. Please update your profile with personal details before clocking in.");
  }

  // 1) Check APPROVED LEAVE / WFH for today
  // Should happen BEFORE geo-fencing, because WFH bypasses geo-fencing
  const leaveRes = await query(
    `
    SELECT la.id, la.is_half_day, lt.code as leave_code, lt.name as leave_name
    FROM leave_applications la
    LEFT JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.tenant_id = $1
      AND la.employee_id = $2
      AND la.status = 'APPROVED'
      AND $3::date BETWEEN la.start_date AND la.end_date
    LIMIT 1
    `,
    [actor.tenantId, employeeId, today]
  );

  const approvedLeave = leaveRes.rows[0];
  const isWFH = approvedLeave && (approvedLeave.leave_code === 'WFH' || approvedLeave.leave_name === 'Work From Home');

  // If on approved leave that is NOT WFH and NOT Half-Day, block clock-in
  if (approvedLeave && !isWFH && !approvedLeave.is_half_day) {
    throw new Error("You are on approved leave today. Clock-in is blocked.");
  }

  // Check for approved WFH request for today (separate from leave)
  const wfhRes = await query(
    `SELECT id FROM wfh_requests 
     WHERE tenant_id = $1 
       AND employee_id = $2 
       AND request_date = $3 
       AND status = 'APPROVED'
     LIMIT 1`,
    [actor.tenantId, employeeId, today]
  );
  const hasWFHApproval = wfhRes.rowCount > 0;

  // == GEO-FENCING CHECK ==
  // Skip if WFH is approved (either via leave type OR WFH request)
  if (!isWFH && !hasWFHApproval) {
    const geoValidation = await geoFencingService.validateLocation(
      db,
      actor.tenantId,
      meta.latitude,
      meta.longitude
    );

    if (!geoValidation.allowed) {
      // Log violation
      await geoFencingService.logViolation(db, actor.tenantId, employeeId, {
        action_type: 'CLOCK_IN',
        latitude: meta.latitude,
        longitude: meta.longitude,
        nearest_location_id: geoValidation.location?.id,
        distance_meters: geoValidation.distance,
        violation_reason: geoValidation.reason,
        device_type: meta.device
      });

      throw new Error(`Location validation failed: ${geoValidation.reason === 'LOCATION_REQUIRED' ? 'Location access is required for clock-in.' : 'You are outside the allowed zone.'}`);
    }
  }
  // =======================

  // 2) Check if already clocked in
  const existing = await query(
    `
    SELECT id, check_in_time
    FROM attendance
    WHERE employee_id = $1
      AND tenant_id = $2
      AND date = $3
    `,
    [employeeId, actor.tenantId, today]
  );

  if (existing.rowCount > 0) {
    throw new Error(`Already clocked in at ${existing.rows[0].check_in_time}`);
  }

  // Determine status (WFH -> PRESENT, Leave Half Day -> HALF_DAY, else PRESENT)
  let status = "PRESENT";
  if (approvedLeave && !isWFH && approvedLeave.is_half_day) {
    status = "HALF_DAY";
  }

  // 3) Insert attendance
  const result = await query(
    `
    INSERT INTO attendance
      (tenant_id, employee_id, date, check_in_time, check_in_ip, check_in_device, status, created_by, work_mode)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
    `,
    [
      actor.tenantId,
      employeeId,
      today,
      now,
      meta.ip || "Unknown",
      meta.device || "Browser",
      status,
      actor.id,
      isWFH || hasWFHApproval ? 'REMOTE' : 'OFFICE'
    ]
  );

  return result.rows[0];
};

/**
 * CLOCK OUT
 */
exports.clockOut = async (db, employeeId, actor, meta) => {
  const query = getQuery(db);
  const today = todayDate();
  const now = nowTime();
  const { calculateHoursDifference } = require('../../utils/dateHelper');
  const { eod_report } = meta; // Extract eod_report from meta

  const existing = await query(
    `
    SELECT *
    FROM attendance
    WHERE employee_id = $1
      AND tenant_id = $2
      AND date = $3
    `,
    [employeeId, actor.tenantId, today]
  );

  if (existing.rowCount === 0) {
    throw new Error("No check-in found for today. Please clock-in first.");
  }

  if (existing.rows[0].check_out_time) {
    throw new Error(`Already clocked out at ${existing.rows[0].check_out_time}`);
  }

  const attendance = existing.rows[0];

  // == GEO-FENCING PRE-CHECK ==
  // Skip if Work Mode is REMOTE (e.g. WFH)
  if (attendance.work_mode !== 'REMOTE') {
    const geoValidation = await geoFencingService.validateLocation(
      db,
      actor.tenantId,
      meta.latitude,
      meta.longitude
    );

    if (!geoValidation.allowed) {
      // Log violation
      await geoFencingService.logViolation(db, actor.tenantId, employeeId, {
        action_type: 'CLOCK_OUT',
        latitude: meta.latitude,
        longitude: meta.longitude,
        nearest_location_id: geoValidation.location?.id,
        distance_meters: geoValidation.distance,
        violation_reason: geoValidation.reason,
        device_type: meta.device
      });

      throw new Error(`Location validation failed: ${geoValidation.reason === 'LOCATION_REQUIRED' ? 'Location access is required for clock-out.' : 'You are outside the allowed zone.'}`);
    }
  } else {
    // == EOD REPORT VALIDATION FOR REMOTE USERS ==
    if (!eod_report || eod_report.trim().length < 10) {
      throw new Error("End of Day Report is mandatory for WFH days. Please describe your accomplishments (min 10 chars).");
    }
  }
  // ===========================

  // Calculate working hours
  const workingHours = calculateHoursDifference(attendance.check_in_time, now);

  // Calculate actual break duration
  const breakRes = await query(
    `SELECT SUM(duration_minutes) as total_break FROM attendance_breaks WHERE attendance_id = $1`,
    [attendance.id]
  );
  const totalBreakMinutes = parseInt(breakRes.rows[0].total_break || 0);
  const totalBreakHours = totalBreakMinutes / 60;

  const actualWorkHours = workingHours - totalBreakHours;

  // Determine status based on 10-hour rule (adjusted for shifts later if needed)
  let finalStatus = attendance.status;
  if (actualWorkHours < 9) { // Assuming 9 hours work + 1 hour break = 10 hours span
    finalStatus = 'INCOMPLETE_HOURS';
  } else {
    finalStatus = 'PRESENT';
  }

  const result = await query(
    `
    UPDATE attendance
    SET check_out_time = $1,
        check_out_ip   = $2,
        check_out_device = $3,
        status         = $4,
        updated_by     = $5,
        eod_report     = $6,
        updated_at     = now()
    WHERE id = $7
      AND tenant_id = $8
    RETURNING *
    `,
    [
      now,
      meta.ip || "Unknown",
      meta.device || "Browser",
      finalStatus,
      actor.id,
      eod_report || null, // Save EOD report
      attendance.id,
      actor.tenantId
    ]
  );

  return result.rows[0];
};

/**
 * START BREAK
 */
exports.startBreak = async (db, employeeId, tenantId) => {
  const query = getQuery(db);

  // Get active attendance
  const today = todayDate();
  const attRes = await query(
    `SELECT id, status FROM attendance WHERE employee_id = $1 AND tenant_id = $2 AND date = $3`,
    [employeeId, tenantId, today]
  );

  if (attRes.rowCount === 0) throw new Error("You are not clocked in.");
  const attendance = attRes.rows[0];
  if (attendance.check_out_time) throw new Error("You have already clocked out.");

  // Check if already on break
  const activeBreak = await query(
    `SELECT id FROM attendance_breaks WHERE attendance_id = $1 AND end_time IS NULL`,
    [attendance.id]
  );
  if (activeBreak.rowCount > 0) throw new Error("You are already on a break.");

  const result = await query(
    `INSERT INTO attendance_breaks (tenant_id, attendance_id, start_time) VALUES ($1, $2, NOW()) RETURNING *`,
    [tenantId, attendance.id]
  );

  // Optionally update status to ON_BREAK? 
  // keeping STATUS as PRESENT/HALF_DAY usually, but maybe a UI status?
  // User asked for "Break In" status.

  return result.rows[0];
};

/**
 * END BREAK
 */
exports.endBreak = async (db, employeeId, tenantId) => {
  const query = getQuery(db);

  // Get active attendance
  const today = todayDate();
  const attRes = await query(
    `SELECT id FROM attendance WHERE employee_id = $1 AND tenant_id = $2 AND date = $3`,
    [employeeId, tenantId, today]
  );

  if (attRes.rowCount === 0) throw new Error("You are not clocked in.");
  const attendance = attRes.rows[0];

  // Find active break
  const activeBreak = await query(
    `SELECT id, start_time FROM attendance_breaks WHERE attendance_id = $1 AND end_time IS NULL`,
    [attendance.id]
  );
  if (activeBreak.rowCount === 0) throw new Error("You are not currently on a break.");

  const breakRecord = activeBreak.rows[0];

  // Calculate duration
  const result = await query(
    `
    UPDATE attendance_breaks
    SET end_time = NOW(),
        duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time))/60,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [breakRecord.id]
  );

  return result.rows[0];
};

/**
 * GET BREAK HISTORY
 */
exports.getBreakHistory = async (db, tenantId, filters) => {
  const query = getQuery(db);
  const params = [tenantId];
  let p = 2;
  let where = `WHERE att.tenant_id = $1`;

  if (filters.employee_id) {
    where += ` AND att.employee_id = $${p} `;
    params.push(filters.employee_id);
    p++;
  }

  if (filters.date) {
    where += ` AND att.date = $${p} `;
    params.push(filters.date);
    p++;
  } else {
    // Optional date range
    if (filters.from_date) {
      where += ` AND att.date >= $${p} `;
      params.push(filters.from_date);
      p++;
    }
    if (filters.to_date) {
      where += ` AND att.date <= $${p} `;
      params.push(filters.to_date);
      p++;
    }
  }

  const result = await query(
    `
  SELECT
  ab.*,
    att.date,
    att.employee_id,
    e.first_name,
    e.last_name
    FROM attendance_breaks ab
    JOIN attendance att ON att.id = ab.attendance_id
    JOIN employees e ON e.id = att.employee_id
    ${where}
    ORDER BY ab.start_time DESC
    `,
    params
  );

  return result.rows;
};

/**
 * GET CURRENTLY ON BREAK
 */
exports.getCurrentBreaks = async (db, tenantId) => {
  const query = getQuery(db);

  const today = todayDate();

  const result = await query(
    `
  SELECT
  ab.start_time,
    att.date,
    e.id as employee_id,
    e.first_name,
    e.last_name,
    u.email,
    d.name as department_name,
    deg.name as designation_name
    FROM attendance_breaks ab
    JOIN attendance att ON att.id = ab.attendance_id
    JOIN employees e ON e.id = att.employee_id
    JOIN users u ON u.id = e.user_id
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN designations deg ON deg.id = e.designation_id
    WHERE att.tenant_id = $1
      AND att.date = $2
      AND ab.end_time IS NULL
    ORDER BY ab.start_time DESC
    `,
    [tenantId, today]
  );

  return result.rows;
};


/**
 * TODAY'S ATTENDANCE
 */
exports.getTodayAttendance = async (db, employeeId, tenantId) => {
  console.log("DEBUG: getTodayAttendance called with:", { employeeId, tenantId });
  const query = getQuery(db);
  const today = todayDate();

  const result = await query(
    `
    SELECT att.*,
    (SELECT json_build_object('id', ab.id, 'start_time', ab.start_time)
       FROM attendance_breaks ab
       WHERE ab.attendance_id = att.id AND ab.end_time IS NULL
       LIMIT 1) as active_break
    FROM attendance att
    WHERE att.employee_id = $1
      AND att.tenant_id = $2
      AND att.date = $3
    `,
    [employeeId, tenantId, today]
  );

  return result.rows[0] || null;
};

/**
 * MY ATTENDANCE HISTORY
 */
exports.getMyAttendance = async (db, employeeId, tenantId, filters) => {
  console.log("DEBUG: getMyAttendance called with:", { employeeId, tenantId });
  const query = getQuery(db);

  const params = [employeeId, tenantId];
  let p = 3;
  let where = `WHERE att.employee_id = $1 AND att.tenant_id = $2`;

  if (filters.from_date) {
    where += ` AND att.date >= $${p} `;
    params.push(filters.from_date);
    p++;
  }

  if (filters.to_date) {
    where += ` AND att.date <= $${p} `;
    params.push(filters.to_date);
    p++;
  }

  const limit = filters.limit || 30;
  const offset = filters.offset || 0;

  const result = await query(
    `
    SELECT att.*
    FROM attendance att
    ${where}
    ORDER BY att.date DESC
    LIMIT $${p} OFFSET $${p + 1}
  `,
    [...params, limit, offset]
  );

  return result.rows;
};

/**
 * MANAGER TEAM ATTENDANCE
 * Direct reports only
 */
exports.getTeamAttendance = async (db, managerEmployeeId, tenantId, filters) => {
  const query = getQuery(db);

  const params = [managerEmployeeId, tenantId];
  let p = 3;
  let where = `
    WHERE e.reports_to = $1
      AND att.tenant_id = $2
    `;

  if (filters.from_date) {
    where += ` AND att.date >= $${p} `;
    params.push(filters.from_date);
    p++;
  }

  if (filters.to_date) {
    where += ` AND att.date <= $${p} `;
    params.push(filters.to_date);
    p++;
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const result = await query(
    `
  SELECT
  att.*,
    e.first_name,
    e.last_name,
    u.email
    FROM attendance att
    JOIN employees e ON e.id = att.employee_id
    JOIN users u     ON u.id = e.user_id
    ${where}
    ORDER BY att.date DESC
    LIMIT $${p} OFFSET $${p + 1}
  `,
    [...params, limit, offset]
  );

  return result.rows;
};

/**
 * ADMIN / HR: ALL ATTENDANCE RECORDS
 */
exports.getAttendanceRecords = async (db, tenantId, filters) => {
  const query = getQuery(db);

  const params = [tenantId];
  let p = 2;
  let where = `WHERE att.tenant_id = $1`;

  if (filters.employee_id) {
    where += ` AND att.employee_id = $${p} `;
    params.push(filters.employee_id);
    p++;
  }

  if (filters.from_date) {
    where += ` AND att.date >= $${p} `;
    params.push(filters.from_date);
    p++;
  }

  if (filters.to_date) {
    where += ` AND att.date <= $${p} `;
    params.push(filters.to_date);
    p++;
  }

  if (filters.status) {
    where += ` AND att.status = $${p} `;
    params.push(filters.status);
    p++;
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const result = await query(
    `
  SELECT
  att.*,
    e.first_name,
    e.last_name,
    u.email
    FROM attendance att
    JOIN employees e ON e.id = att.employee_id
    JOIN users u     ON u.id = e.user_id
    ${where}
    ORDER BY att.date DESC
    LIMIT $${p} OFFSET $${p + 1}
  `,
    [...params, limit, offset]
  );

  return result.rows;
};

/**
 * APPROVE ATTENDANCE
 */
exports.approveAttendance = async (db, attendanceId, tenantId, approverId, reason) => {
  const query = getQuery(db);

  const result = await query(
    `
    UPDATE attendance
    SET status = 'APPROVED',
    approved_by = $1,
    approval_reason = $2,
    updated_at = now()
    WHERE id = $3
      AND tenant_id = $4
  RETURNING *
    `,
    [approverId, reason || null, attendanceId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new Error("Attendance record not found");
  }

  return result.rows[0];
};

/**
 * REJECT ATTENDANCE
 */
exports.rejectAttendance = async (db, attendanceId, tenantId, rejecterId, reason) => {
  const query = getQuery(db);

  const result = await query(
    `
    UPDATE attendance
    SET status = 'REJECTED',
    rejection_reason = $1,
    approved_by = $2,
    updated_at = now()
    WHERE id = $3
      AND tenant_id = $4
  RETURNING *
    `,
    [reason || null, rejecterId, attendanceId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new Error("Attendance record not found");
  }

  return result.rows[0];
};

/**
 * ATTENDANCE SUMMARY PER EMPLOYEE
 * Integrates APPROVED leaves into summary.
 *
 * - present_days: count of days with attendance records
 * - leave_days:   total approved leave days (full + half days as 0.5)
 * - late_days:    based on attendance.is_late
 *
 * You can extend this later to compute ABSENT properly with a calendar.
 */
exports.getAttendanceSummary = async (db, tenantId, filters) => {
  const query = getQuery(db);

  const fromDate = filters.from_date || null;
  const toDate = filters.to_date || null;

  const params = [tenantId];
  let p = 2;
  let attDateFilter = "";
  let leaveDateFilter = "";

  if (fromDate && toDate) {
    attDateFilter = ` AND att.date BETWEEN $${p} AND $${p + 1} `;
    leaveDateFilter = `
      AND la.start_date <= $${p + 1}
      AND la.end_date >= $${p}
  `;
    params.push(fromDate, toDate);
    p += 2;
  }

  const result = await query(
    `
  SELECT
  e.id          AS employee_id,
    e.first_name,
    e.last_name,
    u.email,

    --Attendance - based
  COUNT(DISTINCT att.date) AS present_days,
    SUM(CASE WHEN att.is_late THEN 1 ELSE 0 END) AS late_days,

      --Leave - based(full days + 0.5 for half - days)
    COALESCE(
      SUM(
        CASE
            WHEN la.status = 'APPROVED' AND la.is_half_day = false
              THEN(LEAST(la.end_date, COALESCE($${fromDate ? p - 1 : 1}:: date, la.end_date))
- GREATEST(la.start_date, COALESCE($${fromDate ? p - 2 : 1}:: date, la.start_date))
  + 1)
            WHEN la.status = 'APPROVED' AND la.is_half_day = true
              THEN 0.5
            ELSE 0
END
        ), 0
      ) AS leave_days

    FROM employees e
    JOIN users u ON u.id = e.user_id
    LEFT JOIN attendance att
      ON att.employee_id = e.id
     AND att.tenant_id = e.tenant_id
     ${attDateFilter}
    LEFT JOIN leave_applications la
      ON la.employee_id = e.id
     AND la.tenant_id = e.tenant_id
     ${leaveDateFilter}

    WHERE e.tenant_id = $1
    GROUP BY e.id, e.first_name, e.last_name, u.email
    ORDER BY e.first_name, e.last_name
  `,
    params
  );

  return result.rows;
};

/**
 * GET PENDING CHECKOUTS
 * - Employees see only their own pending checkouts
 * - Managers see their team's pending checkouts
 * - HR/Admin see all pending checkouts
 */
exports.getPendingCheckouts = async (db, actor, filters) => {
  const query = getQuery(db);

  const params = [actor.tenantId];
  let p = 2;
  let where = `WHERE att.tenant_id = $1 AND att.status = 'PENDING_CHECKOUT'`;

  // Role-based filtering
  if (actor.role === "EMPLOYEE") {
    where += ` AND att.employee_id = $${p} `;
    params.push(actor.employeeId);
    p++;
  } else if (actor.role === "MANAGER") {
    where += ` AND e.reports_to = $${p} `;
    params.push(actor.employeeId);
    p++;
  }

  if (filters.employee_id && ["ADMIN", "HR"].includes(actor.role)) {
    where += ` AND att.employee_id = $${p} `;
    params.push(filters.employee_id);
    p++;
  }

  if (filters.from_date) {
    where += ` AND att.date >= $${p} `;
    params.push(filters.from_date);
    p++;
  }

  if (filters.to_date) {
    where += ` AND att.date <= $${p} `;
    params.push(filters.to_date);
    p++;
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const result = await query(
    `
SELECT
att.*,
  e.first_name,
  e.last_name,
  u.email
    FROM attendance att
    JOIN employees e ON e.id = att.employee_id
    JOIN users u ON u.id = e.user_id
    ${where}
    ORDER BY att.date DESC, att.created_at DESC
    LIMIT $${p} OFFSET $${p + 1}
`,
    [...params, limit, offset]
  );

  return result.rows;
};

/**
 * CONFIRM CHECKOUT
 * Employee/Manager confirms the auto-checkout status
 * Changes status from PENDING_CHECKOUT to final status (PRESENT, ABSENT, etc)
 */
exports.confirmCheckout = async (db, attendanceId, tenantId, employeeId, finalStatus, reason) => {
  const query = getQuery(db);

  // Verify ownership (employee can only confirm their own)
  const existing = await query(
    `
    SELECT id, employee_id, status, date
    FROM attendance
    WHERE id = $1 AND tenant_id = $2
  `,
    [attendanceId, tenantId]
  );

  if (existing.rowCount === 0) {
    throw new Error("Attendance record not found");
  }

  const record = existing.rows[0];

  // Only employee or HR/ADMIN can confirm
  if (record.employee_id !== employeeId && !["ADMIN", "HR"].includes(employeeId)) {
    throw new Error("Unauthorized: Can only confirm your own checkout");
  }

  if (record.status !== "PENDING_CHECKOUT") {
    throw new Error("This record is not pending checkout confirmation");
  }

  const result = await query(
    `
    UPDATE attendance
    SET status = $1,
  notes = COALESCE(notes, '') || $2,
  updated_at = now()
    WHERE id = $3 AND tenant_id = $4
RETURNING *
  `,
    [
      finalStatus,
      reason ? ` [Confirmed by employee: ${reason}]` : " [Confirmed by employee]",
      attendanceId,
      tenantId
    ]
  );

  return result.rows[0];
};

/**
 * AUTO-APPROVE PENDING CHECKOUTS
 * HR/Admin can bulk approve all PENDING_CHECKOUT records older than 24 hours
 * Sets them to PRESENT if not explicitly confirmed
 */
exports.autoApprovePendingCheckouts = async (db, tenantId) => {
  const query = getQuery(db);

  // Mark as PRESENT all pending checkouts created more than 24 hours ago
  const result = await query(
    `
    UPDATE attendance
    SET status = 'PRESENT',
  notes = COALESCE(notes, '') || ' Auto-approved after 24h',
  updated_at = now()
    WHERE tenant_id = $1
      AND status = 'PENDING_CHECKOUT'
      AND created_at < (now() - interval '24 hours')
    RETURNING id, employee_id, date
  `,
    [tenantId]
  );

  logger.info(`Auto - approved ${result.rowCount} pending checkouts for tenant ${tenantId}`);

  return {
    count: result.rowCount,
    records: result.rows
  };
};

/* ==================== ROLE-BASED ATTENDANCE ANALYTICS ==================== */

/**
 * Get organization-wide attendance analytics (HR/Admin)
 */
exports.getOrganizationAttendanceAnalytics = async (db, tenantId, filters) => {
  const query = getQuery(db);

  // Overall attendance summary
  const overallSummary = await query(
    `
    SELECT
COUNT(DISTINCT a.employee_id) AS total_employees,
  COUNT(DISTINCT CASE WHEN a.date >= $1 AND a.date <= $2 THEN a.employee_id END) AS active_employees,
    SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS total_present_days,
      SUM(CASE WHEN a.is_late THEN 1 ELSE 0 END) AS total_late_days,
        SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) AS total_absent_days,
          ROUND(AVG(CASE WHEN a.check_in_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM((a.check_out_time:: time - a.check_in_time:: time) + (CASE WHEN a.check_out_time:: time < a.check_in_time:: time THEN INTERVAL '24 hours' ELSE INTERVAL '0' END))) / 3600 END), 2) AS avg_work_hours
    FROM attendance a
    WHERE a.tenant_id = $3
    AND a.date >= $1 AND a.date <= $2
  `,
    [filters.from_date, filters.to_date, tenantId]
  );

  // Daily attendance trends
  const dailyTrends = await query(
    `
SELECT
a.date,
  COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) AS present_count,
    COUNT(CASE WHEN a.is_late THEN 1 END) AS late_count,
      COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) AS absent_count,
        COUNT(DISTINCT a.employee_id) AS total_checkins
    FROM attendance a
    WHERE a.tenant_id = $1
    AND a.date >= $2 AND a.date <= $3
    GROUP BY a.date
    ORDER BY a.date DESC
    LIMIT 30
  `,
    [tenantId, filters.from_date, filters.to_date]
  );

  // Department-wise attendance
  const departmentStats = await query(
    `
SELECT
d.name AS department_name,
  COUNT(DISTINCT e.id) AS total_employees,
    COUNT(DISTINCT CASE WHEN a.date >= $1 AND a.date <= $2 THEN e.id END) AS active_employees,
      SUM(CASE WHEN a.status = 'PRESENT' AND a.date >= $1 AND a.date <= $2 THEN 1 ELSE 0 END) AS present_days,
        SUM(CASE WHEN a.is_late AND a.date >= $1 AND a.date <= $2 THEN 1 ELSE 0 END) AS late_days,
          ROUND(AVG(CASE WHEN a.check_in_time IS NOT NULL AND a.date >= $1 AND a.date <= $2 THEN
        EXTRACT(EPOCH FROM(a.check_out_time:: time - a.check_in_time:: time)) / 3600 END), 2) AS avg_work_hours
    FROM departments d
    LEFT JOIN employees e ON d.id = e.department_id AND e.tenant_id = d.tenant_id
    LEFT JOIN attendance a ON e.id = a.employee_id AND a.tenant_id = d.tenant_id
    WHERE d.tenant_id = $3
    GROUP BY d.id, d.name
    ORDER BY d.name
  `,
    [filters.from_date, filters.to_date, tenantId]
  );

  // Top performers (most consistent attendance)
  const topPerformers = await query(
    `
SELECT
e.first_name,
  e.last_name,
  d.name AS department,
    COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) AS present_days,
      COUNT(CASE WHEN a.is_late THEN 1 END) AS late_days,
        COUNT(a.id) AS total_days,
          ROUND(100.0 * COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) / COUNT(a.id), 2) AS attendance_rate
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN attendance a ON e.id = a.employee_id
    WHERE e.tenant_id = $1
    AND a.date >= $2 AND a.date <= $3
    GROUP BY e.id, e.first_name, e.last_name, d.name
    HAVING COUNT(a.id) > 0
    ORDER BY attendance_rate DESC, present_days DESC
    LIMIT 10
  `,
    [tenantId, filters.from_date, filters.to_date]
  );

  return {
    overallSummary: overallSummary.rows[0],
    dailyTrends: dailyTrends.rows,
    departmentStats: departmentStats.rows,
    topPerformers: topPerformers.rows,
    period: filters
  };
};

/**
 * Get manager attendance analytics (Manager: self + team)
 */
exports.getManagerAttendanceAnalytics = async (db, managerEmployeeId, tenantId, filters) => {
  const query = getQuery(db);

  // Manager's team members including self
  const teamMembers = await query(
    `
    SELECT e.id, e.first_name, e.last_name, d.name AS department
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
WHERE(e.reports_to = $1 OR e.id = $1)
    AND e.tenant_id = $2
  `,
    [managerEmployeeId, tenantId]
  );

  const teamEmployeeIds = teamMembers.rows.map(member => member.id);

  // Team attendance summary
  const teamSummary = await query(
    `
SELECT
COUNT(DISTINCT a.employee_id) AS total_team_members,
  SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS total_present_days,
    SUM(CASE WHEN a.is_late THEN 1 ELSE 0 END) AS total_late_days,
      SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) AS total_absent_days,
        ROUND(AVG(CASE WHEN a.check_in_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM((a.check_out_time:: time - a.check_in_time:: time) + (CASE WHEN a.check_out_time:: time < a.check_in_time:: time THEN INTERVAL '24 hours' ELSE INTERVAL '0' END))) / 3600 END), 2) AS avg_work_hours
    FROM attendance a
    WHERE a.employee_id = ANY($1)
    AND a.tenant_id = $2
    AND a.date >= $3 AND a.date <= $4
  `,
    [teamEmployeeIds, tenantId, filters.from_date, filters.to_date]
  );

  // Individual team member performance
  const teamMemberStats = await query(
    `
SELECT
e.first_name,
  e.last_name,
  d.name AS department,
    COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) AS present_days,
      COUNT(CASE WHEN a.is_late THEN 1 END) AS late_days,
        COUNT(a.id) AS total_days,
          ROUND(100.0 * COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) / NULLIF(COUNT(a.id), 0), 2) AS attendance_rate
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN attendance a ON e.id = a.employee_id
    WHERE e.id = ANY($1)
    AND a.tenant_id = $2
    AND a.date >= $3 AND a.date <= $4
    GROUP BY e.id, e.first_name, e.last_name, d.name
    ORDER BY attendance_rate DESC, present_days DESC
  `,
    [teamEmployeeIds, tenantId, filters.from_date, filters.to_date]
  );

  // Daily team attendance trends
  const dailyTrends = await query(
    `
SELECT
a.date,
  COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) AS present_count,
    COUNT(CASE WHEN a.is_late THEN 1 END) AS late_count,
      COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) AS absent_count,
        COUNT(DISTINCT a.employee_id) AS active_members
    FROM attendance a
    WHERE a.employee_id = ANY($1)
    AND a.tenant_id = $2
    AND a.date >= $3 AND a.date <= $4
    GROUP BY a.date
    ORDER BY a.date DESC
    LIMIT 30
  `,
    [teamEmployeeIds, tenantId, filters.from_date, filters.to_date]
  );

  return {
    teamSummary: teamSummary.rows[0],
    teamMemberStats: teamMemberStats.rows,
    dailyTrends: dailyTrends.rows,
    teamMembers: teamMembers.rows,
    period: filters
  };
};

/**
 * Get employee attendance analytics (Employee: self only)
 */
exports.getEmployeeAttendanceAnalytics = async (db, employeeId, tenantId, filters) => {
  const query = getQuery(db);

  // Employee's personal attendance summary
  const personalSummary = await query(
    `
SELECT
COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) AS present_days,
  COUNT(CASE WHEN a.is_late THEN 1 END) AS late_days,
    COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) AS absent_days,
      COUNT(a.id) AS total_days,
        ROUND(100.0 * COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) / NULLIF(COUNT(a.id), 0), 2) AS attendance_rate,
          ROUND(AVG(CASE WHEN a.check_in_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM(a.check_out_time:: time - a.check_in_time:: time)) / 3600 END), 2) AS avg_work_hours
    FROM attendance a
    WHERE a.employee_id = $1
    AND a.tenant_id = $2
    AND a.date >= $3 AND a.date <= $4
  `,
    [employeeId, tenantId, filters.from_date, filters.to_date]
  );

  // Monthly attendance breakdown
  const monthlyBreakdown = await query(
    `
SELECT
TO_CHAR(a.date, 'YYYY-MM') AS month,
  COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) AS present_days,
    COUNT(CASE WHEN a.is_late THEN 1 END) AS late_days,
      COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) AS absent_days,
        COUNT(a.id) AS total_days
    FROM attendance a
    WHERE a.employee_id = $1
    AND a.tenant_id = $2
    AND a.date >= $3 AND a.date <= $4
    GROUP BY TO_CHAR(a.date, 'YYYY-MM')
    ORDER BY month DESC
  `,
    [employeeId, tenantId, filters.from_date, filters.to_date]
  );

  // Daily attendance details
  const dailyDetails = await query(
    `
SELECT
a.date,
  a.check_in_time,
  a.check_out_time,
  a.is_late,
  a.status,
  CASE WHEN a.check_in_time IS NOT NULL AND a.check_out_time IS NOT NULL THEN
ROUND(EXTRACT(EPOCH FROM(a.check_out_time:: time - a.check_in_time:: time)) / 3600, 2)
      END AS work_hours
    FROM attendance a
    WHERE a.employee_id = $1
    AND a.tenant_id = $2
    AND a.date >= $3 AND a.date <= $4
    ORDER BY a.date DESC
    LIMIT 30
  `,
    [employeeId, tenantId, filters.from_date, filters.to_date]
  );

  return {
    personalSummary: personalSummary.rows[0],
    monthlyBreakdown: monthlyBreakdown.rows,
    dailyDetails: dailyDetails.rows,
    period: filters
  };
};

/* ==================== ROLE-BASED ATTENDANCE REPORTS ==================== */

/**
 * Get organization-wide attendance reports (HR/Admin)
 */
exports.getOrganizationAttendanceReports = async (db, tenantId, filters) => {
  const query = getQuery(db);

  let baseQuery = `
SELECT
e.first_name,
  e.last_name,
  u.email,
  d.name AS department,
    des.name AS designation,
      a.date,
      a.check_in_time,
      a.check_out_time,
      a.is_late,
      a.status,
      CASE WHEN a.check_in_time IS NOT NULL AND a.check_out_time IS NOT NULL THEN
ROUND(EXTRACT(EPOCH FROM(a.check_out_time:: time - a.check_in_time:: time)) / 3600, 2)
      END AS work_hours
    FROM employees e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    LEFT JOIN attendance a ON e.id = a.employee_id
    WHERE e.tenant_id = $1
    AND a.date >= $2 AND a.date <= $3
  `;

  const params = [tenantId, filters.from_date, filters.to_date];

  // Add report type filtering
  if (filters.report_type === 'compliance') {
    baseQuery += ` AND(a.is_late = true OR a.status = 'ABSENT')`;
  } else if (filters.report_type === 'trends') {
    baseQuery += ` ORDER BY a.date DESC, e.first_name`;
  } else {
    baseQuery += ` ORDER BY e.first_name, a.date DESC`;
  }

  baseQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2} `;
  params.push(filters.limit, filters.offset);

  const reports = await query(baseQuery, params);

  // Get summary stats
  const summaryStats = await query(
    `
SELECT
COUNT(DISTINCT e.id) AS total_employees,
  COUNT(a.id) AS total_records,
    COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) AS present_count,
      COUNT(CASE WHEN a.is_late THEN 1 END) AS late_count,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) AS absent_count
    FROM employees e
    LEFT JOIN attendance a ON e.id = a.employee_id
    WHERE e.tenant_id = $1
    AND a.date >= $2 AND a.date <= $3
  `,
    [tenantId, filters.from_date, filters.to_date]
  );

  return {
    reports: reports.rows,
    summary: summaryStats.rows[0],
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      report_type: filters.report_type
    }
  };
};

/**
 * Get manager attendance reports (Manager: self + team)
 */
exports.getManagerAttendanceReports = async (db, managerEmployeeId, tenantId, filters) => {
  const query = getQuery(db);

  // Get team member IDs
  const teamMembers = await query(
    `
    SELECT e.id
    FROM employees e
WHERE(e.reports_to = $1 OR e.id = $1)
    AND e.tenant_id = $2
  `,
    [managerEmployeeId, tenantId]
  );

  const teamEmployeeIds = teamMembers.rows.map(member => member.id);

  let baseQuery = `
SELECT
e.first_name,
  e.last_name,
  d.name AS department,
    a.date,
    a.check_in_time,
    a.check_out_time,
    a.is_late,
    a.status,
    CASE WHEN a.check_in_time IS NOT NULL AND a.check_out_time IS NOT NULL THEN
ROUND(EXTRACT(EPOCH FROM(a.check_out_time:: time - a.check_in_time:: time)) / 3600, 2)
      END AS work_hours
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN attendance a ON e.id = a.employee_id
    WHERE e.id = ANY($1)
    AND a.tenant_id = $2
    AND a.date >= $3 AND a.date <= $4
  `;

  const params = [teamEmployeeIds, tenantId, filters.from_date, filters.to_date];

  // Add report type filtering
  if (filters.report_type === 'compliance') {
    baseQuery += ` AND(a.is_late = true OR a.status = 'ABSENT')`;
  }

  baseQuery += ` ORDER BY e.first_name, a.date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2} `;
  params.push(filters.limit, filters.offset);

  const reports = await query(baseQuery, params);

  // Get team summary stats
  const summaryStats = await query(
    `
SELECT
COUNT(DISTINCT e.id) AS total_team_members,
  COUNT(a.id) AS total_records,
    COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) AS present_count,
      COUNT(CASE WHEN a.is_late THEN 1 END) AS late_count,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) AS absent_count
    FROM employees e
    LEFT JOIN attendance a ON e.id = a.employee_id
    WHERE e.id = ANY($1)
    AND a.tenant_id = $2
    AND a.date >= $3 AND a.date <= $4
  `,
    [teamEmployeeIds, tenantId, filters.from_date, filters.to_date]
  );

  return {
    reports: reports.rows,
    summary: summaryStats.rows[0],
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      report_type: filters.report_type
    }
  };
};

/**
 * Get employee attendance reports (Employee: self only)
 */
exports.getEmployeeAttendanceReports = async (db, employeeId, tenantId, filters) => {
  const query = getQuery(db);

  let baseQuery = `
SELECT
a.date,
  a.check_in_time,
  a.check_out_time,
  a.is_late,
  a.status,
  CASE WHEN a.check_in_time IS NOT NULL AND a.check_out_time IS NOT NULL THEN
ROUND(EXTRACT(EPOCH FROM(a.check_out_time:: time - a.check_in_time:: time)) / 3600, 2)
      END AS work_hours
    FROM attendance a
    WHERE a.employee_id = $1
    AND a.tenant_id = $2
    AND a.date >= $3 AND a.date <= $4
  `;

  const params = [employeeId, tenantId, filters.from_date, filters.to_date];

  // Add report type filtering
  if (filters.report_type === 'compliance') {
    baseQuery += ` AND(a.is_late = true OR a.status = 'ABSENT')`;
  }

  baseQuery += ` ORDER BY a.date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2} `;
  params.push(filters.limit, filters.offset);

  const reports = await query(baseQuery, params);

  // Get personal summary stats
  const summaryStats = await query(
    `
SELECT
COUNT(a.id) AS total_records,
  COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) AS present_count,
    COUNT(CASE WHEN a.is_late THEN 1 END) AS late_count,
      COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) AS absent_count
    FROM attendance a
    WHERE a.employee_id = $1
    AND a.tenant_id = $2
    AND a.date >= $3 AND a.date <= $4
  `,
    [employeeId, tenantId, filters.from_date, filters.to_date]
  );

  return {
    reports: reports.rows,
    summary: summaryStats.rows[0],
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      report_type: filters.report_type
    }
  };
};

/* ==================== ATTENDANCE REGULARIZATION ==================== */

/**
 * Create a Regularization Request
 */
exports.createRegularizationRequest = async (db, employeeId, tenantId, data) => {
  const query = getQuery(db);

  // Check if a pending request already exists for this date
  const pending = await query(
    `SELECT id FROM attendance_regularizations 
     WHERE employee_id = $1 AND tenant_id = $2 AND date = $3 AND status = 'PENDING'`,
    [employeeId, tenantId, data.date]
  );

  if (pending.rowCount > 0) {
    throw new Error("A pending regularization request already exists for this date.");
  }

  const result = await query(
    `
    INSERT INTO attendance_regularizations
  (tenant_id, employee_id, date, check_in_time, check_out_time, reason, status)
VALUES($1, $2, $3, $4, $5, $6, 'PENDING')
RETURNING *
  `,
    [
      tenantId,
      employeeId,
      data.date,
      data.check_in_time,
      data.check_out_time || null,
      data.reason
    ]
  );

  return result.rows[0];
};

/**
 * Get My Regularization Requests
 */
exports.getMyRegularizations = async (db, employeeId, tenantId) => {
  const query = getQuery(db);
  const result = await query(
    `
SELECT * FROM attendance_regularizations
    WHERE employee_id = $1 AND tenant_id = $2
    ORDER BY created_at DESC
    LIMIT 50
    `,
    [employeeId, tenantId]
  );
  return result.rows;
};

/**
 * Get Pending Regularization Requests (for Manager/HR)
 */
exports.getPendingRegularizations = async (db, viewerId, viewerRole, tenantId, { limit, offset }) => {
  const query = getQuery(db);

  let whereClause = `WHERE ar.tenant_id = $1 AND ar.status = 'PENDING'`;
  const params = [tenantId];

  // Managers see only their team's requests
  if (viewerRole === 'MANAGER') {
    whereClause += ` AND(e.reports_to = $2)`; // Assuming Manager only sees direct reports
    params.push(viewerId);
  } else if (['HR', 'ADMIN'].includes(viewerRole)) {
    // HR/Admin sees all
    // No additional filter needed
  } else {
    return []; // Employees shouldn't call this
  }

  // Adjust params index for limit/offset
  const pLimit = params.length + 1;
  const pOffset = params.length + 2;

  const result = await query(
    `
SELECT
ar.*,
  e.first_name,
  e.last_name,
  u.email,
  d.name as department_name,
  des.name as designation_name
    FROM attendance_regularizations ar
    JOIN employees e ON e.id = ar.employee_id
    JOIN users u ON u.id = e.user_id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    ${whereClause}
    ORDER BY ar.created_at ASC
    LIMIT $${pLimit} OFFSET $${pOffset}
`,
    [...params, limit, offset]
  );

  return result.rows;
};

/**
 * Approve Regularization
 * - Updates status to APPROVED
 * - Updates/Inserts into attendance table
 */
exports.approveRegularization = async (db, requestId, approverUserId, tenantId) => {
  const query = getQuery(db);
  const { calculateHoursDifference } = require('../../utils/dateHelper');

  // 1. Get the request
  const reqRes = await query(
    `SELECT * FROM attendance_regularizations WHERE id = $1 AND tenant_id = $2`,
    [requestId, tenantId]
  );

  if (reqRes.rowCount === 0) throw new Error("Request not found");
  const request = reqRes.rows[0];

  if (request.status !== 'PENDING') throw new Error("Request is not pending");

  // 2. Mark as APPROVED
  await query(
    `UPDATE attendance_regularizations 
     SET status = 'APPROVED', approver_id = $1, updated_at = now() 
     WHERE id = $2`,
    [approverUserId, requestId]
  );

  // 3. Upsert into Attendance Table
  const attRes = await query(
    `SELECT id FROM attendance WHERE employee_id = $1 AND date = $2 AND tenant_id = $3`,
    [request.employee_id, request.date, tenantId]
  );

  if (attRes.rowCount > 0) {
    // Update existing
    await query(
      `
      UPDATE attendance
      SET check_in_time = $1,
  check_out_time = $2,
  status = 'APPROVED',
  notes = COALESCE(notes, '') || ' [Regularized]',
  updated_at = now()
      WHERE id = $3
  `,
      [request.check_in_time, request.check_out_time, attRes.rows[0].id]
    );
  } else {
    // Insert new
    await query(
      `
      INSERT INTO attendance
  (tenant_id, employee_id, date, check_in_time, check_out_time, status, notes, created_by)
VALUES($1, $2, $3, $4, $5, 'APPROVED', $6, $7)
  `,
      [
        tenantId,
        request.employee_id,
        request.date,
        request.check_in_time,
        request.check_out_time,
        'Regularized entry',
        approverUserId
      ]
    );
  }

  return request;
};

/**
 * Reject Regularization
 */
exports.rejectRegularization = async (db, requestId, rejecterUserId, tenantId, reason) => {
  const query = getQuery(db);

  const result = await query(
    `
    UPDATE attendance_regularizations
    SET status = 'REJECTED',
  approver_id = $1,
  rejection_reason = $2,
  updated_at = now()
    WHERE id = $3 AND tenant_id = $4
RETURNING *
  `,
    [rejecterUserId, reason, requestId, tenantId]
  );

  if (result.rowCount === 0) throw new Error("Request not found");

  return result.rows[0];
};
