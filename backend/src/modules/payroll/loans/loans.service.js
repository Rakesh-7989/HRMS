const db = require("../../../config/db.js");
const { ConflictError, BadRequestError } = require("../../../utils/customErrors.js");
const inboxService = require("../../inbox/inbox.service");

const createLoan = async (tenantId, userId, payload) => {
  // Fetch loan type and validate constraints
  const loanTypeRes = await db.query(
    `SELECT * FROM loan_types WHERE tenant_id = $1 AND id = $2`,
    [tenantId, payload.loanTypeId]
  );

  if (!loanTypeRes.rows.length) {
    throw new Error("Invalid loan type");
  }

  const type = loanTypeRes.rows[0];

  // Enforce configured limits (DB numeric fields may be strings)
  if (type.max_amount && Number(payload.principalAmount) > Number(type.max_amount)) {
    throw new Error("Loan amount exceeds allowed limit");
  }

  if (type.max_tenure_months && Number(payload.tenureMonths) > Number(type.max_tenure_months)) {
    throw new Error("Loan tenure exceeds allowed limit");
  }

  // Salary Advance specific rules
  if (type.name === "Salary Advance") {
    if (Number(payload.interestRate) !== 0) {
      throw new Error("Salary advance must have zero interest");
    }
    if (Number(payload.tenureMonths) > 3) {
      throw new Error("Salary advance tenure max is 3 months");
    }
  }

  const query = `
    INSERT INTO employee_loans (
      tenant_id,
      employee_id,
      loan_type_id,
      principal_amount,
      interest_rate,
      interest_type,
      tenure_months,
      emi_amount,
      total_payable_amount,
      outstanding_amount,
      start_date,
      status,
      created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PENDING',$12)
    RETURNING *;
  `;

  const values = [
    tenantId,
    payload.employeeId,
    payload.loanTypeId,
    payload.principalAmount,
    payload.interestRate,
    payload.interestType,
    payload.tenureMonths,
    payload.emiAmount,
    payload.totalPayableAmount,
    payload.outstandingAmount,
    payload.startDate,
    userId
  ];

  const created = (await db.query(query, values)).rows[0];

  // Notify admin/HR: new loan application
  try {
    const empRes = await db.query(
      `SELECT first_name, last_name, user_id FROM employees WHERE id = $1`, [payload.employeeId]
    );
    const emp = empRes.rows[0];
    const hrUsers = await db.query(
      `SELECT id FROM users WHERE tenant_id = $1 AND role IN ('HR','ADMIN') AND id != $2`, [tenantId, userId]
    );
    for (const hr of hrUsers.rows) {
      await inboxService.createNotification(db, {
        tenant_id: tenantId, user_id: hr.id,
        title: 'New Loan Application',
        message: `${emp?.first_name} ${emp?.last_name} applied for a loan of ₹${payload.principalAmount}`,
        type: 'info', link: '/payroll/loans'
      });
    }
  } catch (notifErr) {
    console.error('Loan create notification error:', notifErr.message);
  }

  return created;
};

/* ADMIN/HR create loan with simplified payload from frontend */
const createLoanAdmin = async (tenantId, createdBy, payload) => {
  // If frontend provides employee_name instead of employee_id, try to resolve it.
  let resolvedEmployeeId = payload.employee_id || null;
  if (!resolvedEmployeeId && payload.employee_name) {
    const name = payload.employee_name.trim();
    // try exact full name, employee_id, or partial matches (case-insensitive)
    const empRes = await db.query(
      `SELECT id FROM employees WHERE tenant_id = $1 AND (LOWER(first_name || ' ' || COALESCE(last_name,'')) = LOWER($2) OR employee_id = $3 OR first_name ILIKE $4 OR last_name ILIKE $4) LIMIT 1`,
      [tenantId, name, name, `%${name}%`]
    );
    if (empRes.rows.length) resolvedEmployeeId = empRes.rows[0].id;
  }

  // employee_id is required by the schema; if we couldn't resolve from name, return a clear error
  if (!resolvedEmployeeId) {
    throw new BadRequestError('employee not found: provide a valid employee_id or matching employee_name');
  }

  const query = `
    INSERT INTO employee_loans (
      tenant_id,
      employee_id,
      loan_type_id,
      principal_amount,
      interest_rate,
      interest_type,
      tenure_months,
      emi_amount,
      total_payable_amount,
      outstanding_amount,
      start_date,
      status,
      created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PENDING',$12)
    RETURNING *;
  `;

  const values = [
    tenantId,
    resolvedEmployeeId,
    payload.loan_type_id || null,
    payload.amount,
    payload.interest_rate ?? 0,
    payload.interest_type ?? 'REDUCING',
    payload.tenure_months ?? null,
    payload.emi_amount ?? null,
    payload.total_payable_amount ?? null,
    payload.outstanding ?? payload.amount,
    payload.start_date ?? new Date().toISOString().slice(0, 10),
    createdBy
  ];

  return (await db.query(query, values)).rows[0];
};

const getLoans = async (tenantId) => {
  return (
    await db.query(
      `SELECT l.*, e.first_name, e.last_name, e.employee_id as emp_code, lt.name as loan_type_name
       FROM employee_loans l
       JOIN employees e ON e.id = l.employee_id
       JOIN loan_types lt ON lt.id = l.loan_type_id
       WHERE l.tenant_id = $1
       ORDER BY l.created_at DESC`,
      [tenantId]
    )
  ).rows;
};

const getLoansByEmployee = async (tenantId, employeeId) => {
  return (
    await db.query(
      `SELECT l.*, lt.name as loan_type_name
       FROM employee_loans l
       JOIN loan_types lt ON lt.id = l.loan_type_id
       WHERE l.tenant_id = $1 AND l.employee_id = $2
       ORDER BY l.created_at DESC`,
      [tenantId, employeeId]
    )
  ).rows;
};

const getLoansByManager = async (tenantId, managerId) => {
  return (
    await db.query(
      `SELECT l.*, e.first_name, e.last_name, e.employee_id as emp_code, lt.name as loan_type_name
       FROM employee_loans l
       JOIN employees e ON e.id = l.employee_id
       JOIN loan_types lt ON lt.id = l.loan_type_id
       WHERE l.tenant_id = $1 AND e.reporting_manager_id = $2
       ORDER BY l.created_at DESC`,
      [tenantId, managerId]
    )
  ).rows;
};

const getLoanById = async (tenantId, loanId) => {
  return (
    await db.query(
      `SELECT * FROM employee_loans
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, loanId]
    )
  ).rows[0];
};

const approveOrRejectLoan = async (
  tenantId,
  loanId,
  status,
  userId,
  remarks
) => {
  // SECURITY FIX: Validate status is only APPROVED or REJECTED
  const validStatuses = ['APPROVED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    throw new BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // SECURITY FIX: Only allow approving PENDING loans
    const updateRes = await client.query(
      `
      UPDATE employee_loans
      SET status = $1,
          approved_by = $2,
          approved_at = now(),
          remarks = $3
      WHERE tenant_id = $4 
        AND id = $5
        AND status = 'PENDING'
      RETURNING *;
      `,
      [status, userId, remarks, tenantId, loanId]
    );

    if (updateRes.rowCount === 0) {
      await client.query("ROLLBACK");
      throw new Error("Loan not found or already processed");
    }

    const updatedLoan = updateRes.rows[0];

    if (status === "APPROVED" && updatedLoan) {
      // avoid creating installments twice
      const existsRes = await client.query(
        `SELECT 1 FROM employee_loan_installments WHERE loan_id = $1 LIMIT 1`,
        [loanId]
      );

      if (existsRes.rowCount === 0) {
        const {
          tenure_months,
          emi_amount,
          employee_id,
          start_date
        } = updatedLoan;

        // helper to add months to a date and return ISO date string
        const addMonths = (d, m) => {
          const date = d ? new Date(d) : new Date();
          const day = date.getDate();
          date.setMonth(date.getMonth() + m);
          // handle month overflow
          if (date.getDate() !== day) {
            date.setDate(0);
          }
          return date.toISOString().slice(0, 10);
        };

        for (let i = 1; i <= (tenure_months || 0); i++) {
          const dueMonth = addMonths(start_date, i - 1);
          await client.query(
            `
            INSERT INTO employee_loan_installments (
              tenant_id,
              loan_id,
              employee_id,
              installment_number,
              due_month,
              principal_component,
              interest_component,
              installment_amount,
              created_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
            `,
            [
              tenantId,
              loanId,
              employee_id,
              i,
              dueMonth,
              emi_amount, // principal_component placeholder; adjust as needed
              0,
              emi_amount
            ]
          );
        }
      }
    }

    await client.query("COMMIT");

    // Notify employee: loan approved/rejected
    try {
      const empUserRes = await db.query(
        `SELECT user_id FROM employees WHERE id = $1`, [updatedLoan.employee_id]
      );
      if (empUserRes.rows[0]) {
        const isApproved = status === 'APPROVED';
        await inboxService.createNotification(db, {
          tenant_id: tenantId, user_id: empUserRes.rows[0].user_id,
          title: isApproved ? 'Loan Approved ✅' : 'Loan Rejected',
          message: isApproved
            ? `Your loan of ₹${updatedLoan.principal_amount} has been approved.`
            : `Your loan request was rejected.${remarks ? ' Remarks: ' + remarks : ''}`,
          type: isApproved ? 'success' : 'warning', link: '/payroll/loans'
        });
      }
    } catch (notifErr) {
      console.error('Loan approve/reject notification error:', notifErr.message);
    }

    return updatedLoan;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};


/* CREATE */
const createLoanType = async (tenantId, payload) => {
  console
  // prevent duplicate loan type names within the same tenant (case-insensitive)
  const existsRes = await db.query(
    `SELECT id FROM loan_types WHERE tenant_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) LIMIT 1`,
    [tenantId, payload.name]
  );

  if (existsRes.rows.length) {
    throw new ConflictError("Loan type with this name already exists");
  }

  const query = `
    INSERT INTO loan_types (
      tenant_id,
      name,
      max_amount,
      max_tenure_months,
      interest_rate,
      interest_type,
      is_taxable,
      is_active
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *;
  `;

  const values = [
    tenantId,
    payload.name,
    payload.maxAmount,
    payload.maxTenureMonths,
    payload.interestRate,
    payload.interestType,
    payload.isTaxable ?? false,
    payload.isActive ?? true
  ];

  return (await db.query(query, values)).rows[0];
};

/* READ ALL */
const getLoanTypes = async (tenantId) => {
  const query = `
    SELECT *
    FROM loan_types
    WHERE tenant_id = $1
    ORDER BY created_at DESC;
  `;
  return (await db.query(query, [tenantId])).rows;
};

/* READ BY ID */
const getLoanTypeById = async (tenantId, loanTypeId) => {
  const query = `
    SELECT *
    FROM loan_types
    WHERE tenant_id = $1
      AND id = $2
      AND is_active = true
  `;
  return (await db.query(query, [tenantId, loanTypeId])).rows[0];
};

/* UPDATE */
const updateLoanType = async (tenantId, id, payload) => {
  const fields = [];
  const values = [];
  let index = 1;

  const columnMap = {
    name: "name",
    maxAmount: "max_amount",
    maxTenureMonths: "max_tenure_months",
    interestRate: "interest_rate",
    interestType: "interest_type",
    isTaxable: "is_taxable",
    isActive: "is_active"
  };

  for (const key in payload) {
    fields.push(`${columnMap[key]} = $${index++}`);
    values.push(payload[key]);
  }

  const query = `
    UPDATE loan_types
    SET ${fields.join(", ")}
    WHERE tenant_id = $${index++} AND id = $${index}
    RETURNING *;
  `;

  values.push(tenantId, id);
  const res = await db.query(query, values);
  if (!res.rows || res.rows.length === 0) {
    const { NotFoundError } = require("../../../utils/customErrors.js");
    throw new NotFoundError('Loan type not found');
  }
  return res.rows[0];
};

/* DELETE (SOFT DELETE) */
const deleteLoanType = async (tenantId, id) => {
  const query = `
    UPDATE loan_types
    SET is_active = false
    WHERE tenant_id = $1 AND id = $2
    RETURNING *;
  `;

  const res = await db.query(query, [tenantId, id]);
  if (!res.rows || res.rows.length === 0) {
    const { NotFoundError } = require("../../../utils/customErrors.js");
    throw new NotFoundError('Loan type not found');
  }
  return res.rows[0];
};

/* Apply EMI payment - updates outstanding and closes loan if paid off */
const applyEmiPayment = async (tenantId, loanId, amount) => {
  return (
    await db.query(
      `
      UPDATE employee_loans
      SET outstanding_amount = outstanding_amount - $1,
          status = CASE
            WHEN outstanding_amount - $1 <= 0 THEN 'CLOSED'
            ELSE status
          END
      WHERE tenant_id = $2 AND id = $3
      RETURNING *;
      `,
      [amount, tenantId, loanId]
    )
  ).rows[0];
};

/* Close loan - explicit closure endpoint (only when outstanding_amount = 0) */
const closeLoan = async (tenantId, loanId, userId) => {
  return (
    await db.query(
      `
      UPDATE employee_loans
      SET status = 'CLOSED',
          closed_by = $1,
          closed_at = now()
      WHERE tenant_id = $2 AND id = $3
        AND outstanding_amount = 0
      RETURNING *;
      `,
      [userId, tenantId, loanId]
    )
  ).rows[0];
};

/* Process loan EMI for payroll - marks installments paid and records payments */
const processLoanEmi = async (tenantId, employeeId, payrollMonth) => {
  const installments = await db.query(
    `
    SELECT * FROM employee_loan_installments
    WHERE tenant_id = $1
      AND employee_id = $2
      AND payment_status = 'PENDING'
      AND due_month <= $3
    `,
    [tenantId, employeeId, payrollMonth]
  );

  for (const inst of installments.rows) {
    // Mark installment as paid
    await db.query(
      `
      UPDATE employee_loan_installments
      SET payment_status = 'PAID',
          paid_at = now()
      WHERE id = $1
      `,
      [inst.id]
    );

    // Reduce outstanding amount
    await applyEmiPayment(
      tenantId,
      inst.loan_id,
      inst.installment_amount
    );

    // Record payment
    await db.query(
      `
      INSERT INTO employee_loan_payments (
        tenant_id, loan_id, employee_id,
        payment_date, payment_amount, payment_source
      )
      VALUES ($1,$2,$3, now(), $4, 'PAYROLL')
      `,
      [
        tenantId,
        inst.loan_id,
        employeeId,
        inst.installment_amount
      ]
    );
  }
};



module.exports = {
  createLoan,
  createLoanAdmin,
  getLoans,
  getLoanById,
  approveOrRejectLoan,
  createLoanType,
  getLoanTypes,
  getLoanTypeById,
  updateLoanType,
  deleteLoanType,
  applyEmiPayment,
  closeLoan,
  processLoanEmi,
  getLoansByEmployee,
  getLoansByManager
};
