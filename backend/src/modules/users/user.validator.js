const { z } = require("zod");

const uuidOrNull = z.string().uuid().optional().or(z.literal("").transform(() => null));
const dateOrNull = z.string().date().optional().or(z.literal("").transform(() => null));
const stringOrNull = z.string().optional().or(z.literal("").transform(() => null));

/* CREATE USER */
exports.createUserSchema = z.object({
  body: z.object({
    email: z.string().email("Please provide a valid email address"),
    role: z.enum(["HR", "MANAGER", "EMPLOYEE", "ADMIN"]),
    // Personal
    first_name: z.string().min(1),
    last_name: z.string().optional(),
    phone: stringOrNull,
    date_of_birth: dateOrNull,
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().or(z.literal("").transform(() => null)),
    marital_status: stringOrNull,
    nationality: stringOrNull,

    // Emergency
    emergency_name: stringOrNull,
    emergency_phone: stringOrNull,
    emergency_relation: stringOrNull,

    // Professional
    employee_id: stringOrNull,
    department_id: uuidOrNull,
    designation_id: uuidOrNull,
    reports_to: uuidOrNull,
    join_date: dateOrNull,
    employment_type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]).optional().or(z.literal("").transform(() => null)),
    shift: stringOrNull,
    shift_id: uuidOrNull,
    job_location: stringOrNull,

    // Finance
    bank_name: stringOrNull,
    account_name: stringOrNull,
    account_number: stringOrNull,
    ifsc_code: stringOrNull,
    tax_id: stringOrNull,
    uan: stringOrNull,
    pf_account: stringOrNull,
    esi_number: stringOrNull,
    aadhar_number: stringOrNull,

    // Address
    address: stringOrNull,
    branch_name: stringOrNull,
    ctc: z.coerce.number().optional().or(z.literal("").transform(() => 0)),
    timezone: z.string().optional()
  })
});

/* LIST USERS */
exports.getUsersSchema = z.object({
  query: z.object({
    role: z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]).optional(),
    search: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional()
  })
});

/* UPDATE USER BASIC */
exports.updateUserSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    is_active: z.boolean().optional()
  })
});

/* BASE EMPLOYEE UPDATE BODY */
const employeeUpdateBody = z.object({
  // Personal
  first_name: z.string().optional(),
  last_name: stringOrNull,
  phone: stringOrNull,
  date_of_birth: dateOrNull,
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().or(z.literal("").transform(() => null)),
  marital_status: stringOrNull,
  nationality: stringOrNull,

  // Emergency
  emergency_name: stringOrNull,
  emergency_phone: stringOrNull,
  emergency_relation: stringOrNull,

  // Professional
  employee_id: stringOrNull,
  department_id: uuidOrNull,
  designation_id: uuidOrNull,
  reports_to: uuidOrNull,
  join_date: dateOrNull,
  employment_type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]).optional().or(z.literal("").transform(() => null)),
  shift: stringOrNull,

  // Finance
  bank_name: stringOrNull,
  account_name: stringOrNull,
  account_number: stringOrNull,
  ifsc_code: stringOrNull,
  tax_id: stringOrNull,
  uan: stringOrNull,
  pf_account: stringOrNull,
  esi_number: stringOrNull,

  // Address
  address: stringOrNull,
  ctc: z.coerce.number().optional().or(z.literal("").transform(() => 0)),
  role: z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]).optional(),
  timezone: z.string().optional()
});

/* EMPLOYEE UPDATE (By Admin/HR) */
exports.updateEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: employeeUpdateBody
});

/* SELF PROFILE UPDATE */
exports.updateProfileSchema = z.object({
  body: employeeUpdateBody
});

/* ROLE CHANGE */
exports.changeRoleSchema = z.object({
  body: z.object({
    role: z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"])
  })
});

/* MANAGER CHANGE */
exports.changeManagerSchema = z.object({
  body: z.object({
    manager_employee_id: z.string().uuid()
  })
});

/* DEPARTMENT */
exports.assignDeptSchema = z.object({
  body: z.object({
    department_id: z.string().uuid()
  })
});

/* DESIGNATION */
exports.assignDesignationSchema = z.object({
  body: z.object({
    designation_id: z.string().uuid()
  })
});

/* STATUS UPDATE */
exports.statusSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    is_active: z.boolean()
  })
});

/* TERMINATION */
exports.terminateSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    termination_date: dateOrNull,
    termination_reason: stringOrNull,
    portal_access_until: dateOrNull
  })
});
