// src/modules/events/events.service.js
const pool = require("../../config/db");

const getQuery = (db) =>
  db && typeof db.query === "function" ? db.query : pool.query.bind(pool);

/**
 * Get people events (birthdays, anniversaries, joiners) for the organization
 * @param {Object} db - Database connection
 * @param {string} tenantId - Tenant ID
 * @param {string} scope - Scope (organization, team, etc.)
 */
exports.getPeopleEvents = async (db, tenantId, _scope = 'organization') => {
  const query = getQuery(db);

  // Get upcoming birthdays (next 30 days, using date_of_birth field)
  const birthdaysResult = await query(
    `
    SELECT 
      e.id,
      CONCAT(e.first_name, ' ', e.last_name) AS name,
      TO_CHAR(e.date_of_birth, 'Mon DD') AS date,
      e.date_of_birth
    FROM employees e
    JOIN users u ON e.user_id = u.id
    WHERE e.tenant_id = $1
    AND u.is_deleted = false
    AND e.date_of_birth IS NOT NULL
    AND (
      (EXTRACT(MONTH FROM e.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(DAY FROM e.date_of_birth) >= EXTRACT(DAY FROM CURRENT_DATE))
      OR
      (EXTRACT(MONTH FROM e.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '30 days')
       AND EXTRACT(DAY FROM e.date_of_birth) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '30 days'))
    )
    ORDER BY 
      EXTRACT(MONTH FROM e.date_of_birth),
      EXTRACT(DAY FROM e.date_of_birth)
    LIMIT 10
    `,
    [tenantId]
  );

  // Get work anniversaries (next 30 days, using join_date)
  const anniversariesResult = await query(
    `
    SELECT 
      e.id,
      CONCAT(e.first_name, ' ', e.last_name) AS name,
      TO_CHAR(e.join_date, 'Mon DD') AS date,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.join_date)) AS years
    FROM employees e
    JOIN users u ON e.user_id = u.id
    WHERE e.tenant_id = $1
    AND u.is_deleted = false
    AND e.join_date IS NOT NULL
    AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.join_date)) >= 1
    AND (
      (EXTRACT(MONTH FROM e.join_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(DAY FROM e.join_date) >= EXTRACT(DAY FROM CURRENT_DATE))
      OR
      (EXTRACT(MONTH FROM e.join_date) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '30 days')
       AND EXTRACT(DAY FROM e.join_date) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '30 days'))
    )
    ORDER BY 
      EXTRACT(MONTH FROM e.join_date),
      EXTRACT(DAY FROM e.join_date)
    LIMIT 10
    `,
    [tenantId]
  );

  // Get new joiners (last 30 days)
  const joinersResult = await query(
    `
    SELECT 
      e.id,
      CONCAT(e.first_name, ' ', e.last_name) AS name,
      TO_CHAR(e.join_date, 'YYYY-MM-DD') AS date,
      d.name AS department
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    JOIN users u ON e.user_id = u.id
    WHERE e.tenant_id = $1
    AND e.status = 'ACTIVE'
    AND u.is_deleted = false
    AND e.join_date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY e.join_date DESC
    LIMIT 10
    `,
    [tenantId]
  );

  return {
    birthdays: birthdaysResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      date: row.date,
    })),
    anniversaries: anniversariesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      date: row.date,
      note: `${row.years} year${row.years > 1 ? 's' : ''}`,
    })),
    joiners: joinersResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      date: row.date,
      note: row.department || 'New Employee',
    })),
  };
};
