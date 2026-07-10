// src/config/swagger.js
const swaggerUi = require('swagger-ui-express');

// Import all path documentation
const authPaths = require('../docs/paths/auth');
const usersPaths = require('../docs/paths/users');
const attendancePaths = require('../docs/paths/attendance');
const deptDesigPaths = require('../docs/paths/departments-designations');
const leavePaths = require('../docs/paths/leave');
const dashboardsPaths = require('../docs/paths/dashboards');
const payrollPaths = require('../docs/paths/payroll');

const API_VERSION = '1.0.0';

const swaggerSpec = {
    openapi: '3.0.3',
    info: {
        title: 'HRMS SaaS API',
        version: API_VERSION,
        description: `Multi-tenant HRMS API with RLS, RBAC and tenant-aware modules.
        
        ## Key Features:
        - **Multi-Tenant Architecture**: Complete tenant isolation with Row Level Security
        - **Role-Based Access Control**: 5 roles (SUPER_ADMIN, ADMIN, HR, MANAGER, EMPLOYEE)
        - **Security**: JWT authentication, tenant-id validation on all data operations
        - **Attendance Management**: Clock in/out, approval workflow, summaries
        - **Leave Management**: Leave requests, approvals, balance tracking, calendar views
        - **User Management**: Create, update, assign departments/designations (tenant-validated)
        - **Session Management**: Multiple device sessions, logout all devices
        
        ## Authentication:
        All endpoints except login, refresh, forgot-password, reset-password, and tenant register require JWT Bearer token.
        
        Access Token: 60 minutes expiry
        Refresh Token: 7 days expiry
        
        ## Tenant Isolation:
        ✓ All department and designation assignments are tenant-validated
        ✓ Cross-tenant resource assignment is blocked (security fix)
        ✓ RLS policies enforced at database level
        ✓ Row Level Security enabled on all sensitive tables
        
        ## Error Responses:
        - **400**: Validation error
        - **401**: Unauthorized (invalid/missing JWT)
        - **403**: Permission denied (insufficient role)
        - **404**: Resource not found
        - **409**: Conflict (duplicate email, already clocked in, etc.)
        - **422**: Unprocessable entity
        - **500**: Server error`,
        contact: {
            name: 'API Support',
            email: 'support@hrms.local'
        }
    },
    servers: [
        {
            url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api`,
            description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Local development server'
        }
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT token. Format: **Bearer eyJhbGc...**'
            }
        },
        schemas: {
            Error: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'error' },
                    message: { type: 'string' }
                }
            },
            ValidationError: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'error' },
                    message: { type: 'string', example: 'Validation failed' },
                    errors: {
                        type: 'object',
                        additionalProperties: { type: 'string' }
                    }
                }
            },
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
                    is_active: { type: 'boolean' },
                    must_change_password: { type: 'boolean' },
                    tenant_id: { type: 'string', format: 'uuid' },
                    created_at: { type: 'string', format: 'date-time' }
                }
            },
            Employee: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    user_id: { type: 'string', format: 'uuid' },
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string' },
                    department_id: { type: 'string', format: 'uuid' },
                    designation_id: { type: 'string', format: 'uuid' },
                    reports_to: { type: 'string', format: 'uuid' },
                    tenant_id: { type: 'string', format: 'uuid' }
                }
            },
            Attendance: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    employee_id: { type: 'string', format: 'uuid' },
                    date: { type: 'string', format: 'date' },
                    check_in_time: { type: 'string', format: 'time' },
                    check_out_time: { type: 'string', format: 'time' },
                    status: { type: 'string', enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'REJECTED'] },
                    is_late: { type: 'boolean' },
                    approved_by: { type: 'string', format: 'uuid' },
                    approval_reason: { type: 'string' }
                }
            }
        }
    },
    security: [
        {
            BearerAuth: []
        }
    ],
    tags: [
        {
            name: 'Auth',
            description: 'Authentication endpoints (login, password reset, session management)'
        },
        {
            name: 'Users',
            description: 'User & Employee management (create, update, assign roles/departments)'
        },
        {
            name: 'Attendance',
            description: 'Attendance tracking (clock in/out, records, approvals, summaries)'
        },
        {
            name: 'Departments',
            description: 'Department management (create, list, update, delete)'
        },
        {
            name: 'Designations',
            description: 'Job designation management (create, list, update, delete)'
        },
        {
            name: 'Leave',
            description: 'Leave management (requests, approvals, balance tracking, calendar)'
        },
        {
            name: 'Dashboards',
            description: 'Comprehensive analytics dashboards for all roles (system, org, HR, team, personal)'
        },
        {
            name: 'Payroll',
            description: 'Payroll dashboard and legacy endpoints'
        },
        {
            name: 'Payroll - Salary',
            description: 'Salary templates, employee salary assignment, and revisions'
        },
        {
            name: 'Payroll - Payrun',
            description: 'Pay schedules and payroll run management (create, calculate, approve)'
        },
        {
            name: 'Payroll - Statutory',
            description: 'Statutory compliance (PF, ESI, PT, LWF, TDS), deductions, and cost centres'
        },
        {
            name: 'Payroll - Payslips',
            description: 'Payslip viewing, download, and tax declarations'
        },
        {
            name: 'Payroll - Expenses',
            description: 'Expense claims, categories, and approvals'
        },
        {
            name: 'Payroll - Loans',
            description: 'Employee loans, loan types, and repayments'
        },
        {
            name: 'Payroll - Settlement',
            description: 'Reimbursements and Full & Final settlements'
        },
        {
            name: 'Payroll - Consultants',
            description: 'Consultant management and invoice processing'
        },
        {
            name: 'Payroll - Merchants',
            description: 'Vendor payments and third-party payroll payouts'
        }
    ],
    paths: {
        ...authPaths,
        ...usersPaths,
        ...attendancePaths,
        ...deptDesigPaths,
        ...leavePaths,
        ...dashboardsPaths,
        ...payrollPaths
    }
};



module.exports = {
    swaggerUi,
    swaggerSpec
};
