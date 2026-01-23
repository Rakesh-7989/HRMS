// src/docs/paths/payroll.js
// Swagger API documentation for Payroll module and all sub-modules

module.exports = {
    // ============================================================
    // PAYROLL SUMMARY
    // ============================================================
    '/payroll/summary': {
        get: {
            tags: ['Payroll'],
            summary: 'Get payroll dashboard summary',
            description: 'Returns summary statistics including employee count, monthly payroll, pending payslips, reimbursements, and active loans',
            security: [{ BearerAuth: [] }],
            responses: {
                200: {
                    description: 'Payroll summary data',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    status: { type: 'string', example: 'success' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            total_employees: { type: 'integer', example: 50 },
                                            monthly_payroll: { type: 'number', example: 500000 },
                                            pending_payslips: { type: 'integer', example: 5 },
                                            reimbursements: { type: 'number', example: 25000 },
                                            active_loans: { type: 'number', example: 100000 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                401: { $ref: '#/components/responses/Unauthorized' }
            }
        }
    },

    // ============================================================
    // SALARY TEMPLATES
    // ============================================================
    '/payroll/salary/templates': {
        get: {
            tags: ['Payroll - Salary'],
            summary: 'Get all salary templates',
            description: 'Returns list of salary structure templates for the tenant',
            security: [{ BearerAuth: [] }],
            responses: {
                200: {
                    description: 'List of salary templates',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    status: { type: 'string', example: 'success' },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/SalaryTemplate' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        post: {
            tags: ['Payroll - Salary'],
            summary: 'Create salary template',
            description: 'Creates a new salary structure template with component percentages',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['name'],
                            properties: {
                                name: { type: 'string', example: 'Standard Template' },
                                code: { type: 'string', example: 'STD-001' },
                                description: { type: 'string' },
                                basicPercentage: { type: 'number', example: 50 },
                                hraPercentage: { type: 'number', example: 20 },
                                daPercentage: { type: 'number', example: 10 },
                                specialAllowancePercentage: { type: 'number', example: 15 },
                                otherAllowancePercentage: { type: 'number', example: 5 },
                                isDefault: { type: 'boolean', example: false }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'Template created successfully' },
                400: { $ref: '#/components/responses/ValidationError' }
            }
        }
    },

    '/payroll/salary/templates/{id}': {
        get: {
            tags: ['Payroll - Salary'],
            summary: 'Get salary template by ID',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Salary template details' },
                404: { description: 'Template not found' }
            }
        },
        put: {
            tags: ['Payroll - Salary'],
            summary: 'Update salary template',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/SalaryTemplateInput' }
                    }
                }
            },
            responses: {
                200: { description: 'Template updated successfully' }
            }
        },
        delete: {
            tags: ['Payroll - Salary'],
            summary: 'Delete salary template',
            description: 'ADMIN only. Deletes a salary template',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Template deleted successfully' },
                403: { description: 'Forbidden - ADMIN role required' }
            }
        }
    },

    // ============================================================
    // EMPLOYEE SALARY
    // ============================================================
    '/payroll/salary/assign': {
        post: {
            tags: ['Payroll - Salary'],
            summary: 'Assign salary to employee',
            description: 'Assigns salary structure (CTC, template, bank details) to an employee',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['employeeId', 'ctc', 'effectiveFrom'],
                            properties: {
                                employeeId: { type: 'string', format: 'uuid' },
                                templateId: { type: 'string', format: 'uuid' },
                                ctc: { type: 'number', example: 1200000 },
                                effectiveFrom: { type: 'string', format: 'date' },
                                effectiveTo: { type: 'string', format: 'date' },
                                bankName: { type: 'string' },
                                bankAccountNumber: { type: 'string' },
                                bankIfsc: { type: 'string' }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'Salary assigned successfully' }
            }
        }
    },

    '/payroll/salary/all': {
        get: {
            tags: ['Payroll - Salary'],
            summary: 'Get all employee salaries',
            description: 'Returns all employee salary details for the tenant',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'List of employee salary records' }
            }
        }
    },

    '/payroll/salary/employee/{employeeId}': {
        get: {
            tags: ['Payroll - Salary'],
            summary: 'Get employee salary',
            description: 'Returns current salary details for specific employee',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Employee salary details' }
            }
        }
    },

    '/payroll/salary/employee/{employeeId}/history': {
        get: {
            tags: ['Payroll - Salary'],
            summary: 'Get employee salary history',
            description: 'Returns salary revision history for specific employee',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Salary revision history' }
            }
        }
    },

    // ============================================================
    // SALARY REVISIONS
    // ============================================================
    '/payroll/salary/revisions': {
        get: {
            tags: ['Payroll - Salary'],
            summary: 'Get salary revisions',
            description: 'Returns all pending and approved salary revisions',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'List of salary revisions' }
            }
        },
        post: {
            tags: ['Payroll - Salary'],
            summary: 'Create salary revision',
            description: 'Creates a new salary revision request (appraisal, promotion, etc.)',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['employeeId', 'newCtc', 'revisionType', 'effectiveFrom'],
                            properties: {
                                employeeId: { type: 'string', format: 'uuid' },
                                newCtc: { type: 'number', example: 1500000 },
                                oldCtc: { type: 'number' },
                                revisionType: { type: 'string', enum: ['APPRAISAL', 'PROMOTION', 'CORRECTION', 'INITIAL'] },
                                effectiveFrom: { type: 'string', format: 'date' },
                                remarks: { type: 'string' }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'Revision created successfully' }
            }
        }
    },

    '/payroll/salary/revisions/{id}/approve': {
        patch: {
            tags: ['Payroll - Salary'],
            summary: 'Approve/Reject salary revision',
            description: 'ADMIN only. Approves or rejects a pending salary revision',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['status'],
                            properties: {
                                status: { type: 'string', enum: ['APPROVED', 'REJECTED'] }
                            }
                        }
                    }
                }
            },
            responses: {
                200: { description: 'Revision status updated' }
            }
        }
    },

    // ============================================================
    // PAY SCHEDULES
    // ============================================================
    '/payroll/payrun/schedules': {
        get: {
            tags: ['Payroll - Payrun'],
            summary: 'Get pay schedules',
            description: 'Returns all configured pay schedules',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'List of pay schedules' }
            }
        },
        post: {
            tags: ['Payroll - Payrun'],
            summary: 'Create pay schedule',
            description: 'Creates a new pay schedule with cycle and pay day configuration',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['name'],
                            properties: {
                                name: { type: 'string', example: 'Monthly Schedule' },
                                cycle: { type: 'string', enum: ['MONTHLY', 'BI_WEEKLY', 'WEEKLY'] },
                                payDay: { type: 'integer', minimum: 1, maximum: 31, example: 28 },
                                cutOffDay: { type: 'integer', minimum: 1, maximum: 31, example: 25 },
                                isDefault: { type: 'boolean' }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'Schedule created successfully' }
            }
        }
    },

    // ============================================================
    // PAYROLL RUNS
    // ============================================================
    '/payroll/payrun': {
        get: {
            tags: ['Payroll - Payrun'],
            summary: 'Get payroll runs',
            description: 'Returns all payroll runs for the tenant',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'List of payroll runs' }
            }
        },
        post: {
            tags: ['Payroll - Payrun'],
            summary: 'Create payroll run',
            description: 'Initiates a new payroll run for a specific period',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['periodMonth', 'periodYear'],
                            properties: {
                                scheduleId: { type: 'string', format: 'uuid' },
                                periodMonth: { type: 'integer', minimum: 1, maximum: 12, example: 1 },
                                periodYear: { type: 'integer', example: 2026 },
                                payDate: { type: 'string', format: 'date' }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'Payroll run created' }
            }
        }
    },

    '/payroll/payrun/{id}': {
        get: {
            tags: ['Payroll - Payrun'],
            summary: 'Get payroll run by ID',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Payroll run details with items' }
            }
        },
        delete: {
            tags: ['Payroll - Payrun'],
            summary: 'Delete payroll run',
            description: 'ADMIN only. Deletes a DRAFT payroll run',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Payroll run deleted' }
            }
        }
    },

    '/payroll/payrun/{id}/calculate': {
        post: {
            tags: ['Payroll - Payrun'],
            summary: 'Calculate payroll run',
            description: 'Calculates salaries for all employees in the payroll run',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Payroll calculated' }
            }
        }
    },

    '/payroll/payrun/{id}/approve': {
        patch: {
            tags: ['Payroll - Payrun'],
            summary: 'Approve payroll run',
            description: 'ADMIN only. Approves a pending payroll run',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Payroll approved' }
            }
        }
    },

    '/payroll/payrun/{id}/reject': {
        patch: {
            tags: ['Payroll - Payrun'],
            summary: 'Reject payroll run',
            description: 'ADMIN only. Rejects a payroll run with reason',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['reason'],
                            properties: {
                                reason: { type: 'string', minLength: 5 }
                            }
                        }
                    }
                }
            },
            responses: {
                200: { description: 'Payroll rejected' }
            }
        }
    },

    '/payroll/payrun/{id}/revoke': {
        patch: {
            tags: ['Payroll - Payrun'],
            summary: 'Revoke payroll run',
            description: 'ADMIN only. Revokes an approved payroll run',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Payroll revoked' }
            }
        }
    },

    '/payroll/payrun/{id}/lock': {
        patch: {
            tags: ['Payroll - Payrun'],
            summary: 'Lock payroll run',
            description: 'ADMIN only. Locks a payroll run to prevent further changes',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Payroll locked' }
            }
        }
    },

    // ============================================================
    // STATUTORY CONFIGURATION
    // ============================================================
    '/payroll/statutory/config': {
        get: {
            tags: ['Payroll - Statutory'],
            summary: 'Get statutory configuration',
            description: 'Returns PF, ESI, PT, LWF, TDS configuration for the tenant',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Statutory configuration' }
            }
        },
        put: {
            tags: ['Payroll - Statutory'],
            summary: 'Update statutory configuration',
            description: 'ADMIN only. Updates statutory compliance configuration',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                pfEnabled: { type: 'boolean' },
                                pfEmployerRate: { type: 'number', example: 12 },
                                pfEmployeeRate: { type: 'number', example: 12 },
                                pfWageCeiling: { type: 'number', example: 15000 },
                                pfEstablishmentCode: { type: 'string' },
                                esiEnabled: { type: 'boolean' },
                                esiEmployerRate: { type: 'number' },
                                esiEmployeeRate: { type: 'number' },
                                esiWageCeiling: { type: 'number' },
                                ptEnabled: { type: 'boolean' },
                                ptState: { type: 'string' },
                                lwfEnabled: { type: 'boolean' },
                                tdsEnabled: { type: 'boolean' }
                            }
                        }
                    }
                }
            },
            responses: {
                200: { description: 'Configuration updated' }
            }
        }
    },

    '/payroll/statutory/pt-slabs': {
        get: {
            tags: ['Payroll - Statutory'],
            summary: 'Get PT slabs',
            description: 'Returns Professional Tax slabs by state',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'PT slab list' }
            }
        },
        post: {
            tags: ['Payroll - Statutory'],
            summary: 'Create PT slab',
            description: 'ADMIN only. Creates a PT slab for a state',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['state', 'minSalary', 'monthlyTax'],
                            properties: {
                                state: { type: 'string', example: 'Karnataka' },
                                minSalary: { type: 'number' },
                                maxSalary: { type: 'number' },
                                monthlyTax: { type: 'number' },
                                gender: { type: 'string', enum: ['MALE', 'FEMALE', 'ALL'] }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'PT slab created' }
            }
        }
    },

    '/payroll/statutory/pt-slabs/{id}': {
        delete: {
            tags: ['Payroll - Statutory'],
            summary: 'Delete PT slab',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'PT slab deleted' }
            }
        }
    },

    '/payroll/statutory/deduction-types': {
        get: {
            tags: ['Payroll - Statutory'],
            summary: 'Get deduction types',
            description: 'Returns all deduction type definitions',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'List of deduction types' }
            }
        },
        post: {
            tags: ['Payroll - Statutory'],
            summary: 'Create deduction type',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['name', 'code', 'category'],
                            properties: {
                                name: { type: 'string' },
                                code: { type: 'string' },
                                description: { type: 'string' },
                                category: { type: 'string', enum: ['STATUTORY', 'LOAN', 'PENALTY', 'ADVANCE', 'OTHER'] },
                                isStatutory: { type: 'boolean' },
                                isTaxable: { type: 'boolean' },
                                calculationType: { type: 'string', enum: ['FIXED', 'PERCENTAGE', 'SLAB'] }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'Deduction type created' }
            }
        }
    },

    '/payroll/statutory/deduction-types/{id}': {
        put: {
            tags: ['Payroll - Statutory'],
            summary: 'Update deduction type',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Deduction type updated' }
            }
        }
    },

    '/payroll/statutory/deductions': {
        post: {
            tags: ['Payroll - Statutory'],
            summary: 'Add employee deduction',
            description: 'Assigns a deduction to an employee',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['employeeId', 'deductionTypeId', 'amount', 'effectiveFrom'],
                            properties: {
                                employeeId: { type: 'string', format: 'uuid' },
                                deductionTypeId: { type: 'string', format: 'uuid' },
                                amount: { type: 'number' },
                                effectiveFrom: { type: 'string', format: 'date' },
                                effectiveTo: { type: 'string', format: 'date' },
                                remarks: { type: 'string' }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'Deduction added' }
            }
        }
    },

    '/payroll/statutory/deductions/employee/{employeeId}': {
        get: {
            tags: ['Payroll - Statutory'],
            summary: 'Get employee deductions',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Employee deductions list' }
            }
        }
    },

    '/payroll/statutory/deductions/{id}': {
        delete: {
            tags: ['Payroll - Statutory'],
            summary: 'Remove employee deduction',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Deduction removed' }
            }
        }
    },

    '/payroll/statutory/cost-centres': {
        get: {
            tags: ['Payroll - Statutory'],
            summary: 'Get cost centres',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Cost centres list' }
            }
        },
        post: {
            tags: ['Payroll - Statutory'],
            summary: 'Create cost centre',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['name'],
                            properties: {
                                name: { type: 'string' },
                                code: { type: 'string' },
                                description: { type: 'string' },
                                budgetAllocated: { type: 'number' },
                                departmentId: { type: 'string', format: 'uuid' }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'Cost centre created' }
            }
        }
    },

    '/payroll/statutory/cost-centres/{id}': {
        put: {
            tags: ['Payroll - Statutory'],
            summary: 'Update cost centre',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Cost centre updated' }
            }
        },
        delete: {
            tags: ['Payroll - Statutory'],
            summary: 'Delete cost centre',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Cost centre deleted' }
            }
        }
    },

    // ============================================================
    // PAYSLIPS
    // ============================================================
    '/payroll/payslips/my': {
        get: {
            tags: ['Payroll - Payslips'],
            summary: 'Get my payslips',
            description: 'Returns payslips for the logged-in employee',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'List of payslips' }
            }
        }
    },

    '/payroll/payslips/{payrollRunId}/employee/{employeeId}': {
        get: {
            tags: ['Payroll - Payslips'],
            summary: 'Get payslip data',
            description: 'Returns detailed payslip data for a specific payroll run and employee',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'payrollRunId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Payslip details' }
            }
        }
    },

    '/payroll/payslips/{payrollRunId}/employee/{employeeId}/download': {
        get: {
            tags: ['Payroll - Payslips'],
            summary: 'Download payslip PDF',
            description: 'Downloads payslip as PDF document',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'payrollRunId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: {
                    description: 'PDF file',
                    content: {
                        'application/pdf': {
                            schema: { type: 'string', format: 'binary' }
                        }
                    }
                }
            }
        }
    },

    '/payroll/payslips/tax-declaration': {
        get: {
            tags: ['Payroll - Payslips'],
            summary: 'Get my tax declaration',
            description: 'Returns tax declaration for the logged-in employee',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Tax declaration details' }
            }
        },
        put: {
            tags: ['Payroll - Payslips'],
            summary: 'Save tax declaration',
            description: 'Saves/updates tax declaration with Section 80C, 80D, HRA exemptions etc.',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['financialYear'],
                            properties: {
                                financialYear: { type: 'string', example: '2025-26' },
                                regime: { type: 'string', enum: ['OLD', 'NEW'] },
                                section80c: { type: 'number', maximum: 150000 },
                                section80d: { type: 'number', maximum: 100000 },
                                section24: { type: 'number', maximum: 200000 },
                                hraExemption: { type: 'number' },
                                rentPaidAnnually: { type: 'number' },
                                metroCity: { type: 'boolean' }
                            }
                        }
                    }
                }
            },
            responses: {
                200: { description: 'Declaration saved' }
            }
        }
    },

    '/payroll/payslips/tax-declaration/{id}/submit': {
        patch: {
            tags: ['Payroll - Payslips'],
            summary: 'Submit tax declaration for verification',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Declaration submitted' }
            }
        }
    },

    '/payroll/payslips/tax-declaration/{id}/verify': {
        patch: {
            tags: ['Payroll - Payslips'],
            summary: 'Verify tax declaration',
            description: 'HR/ADMIN verifies employee tax declaration',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Declaration verified' }
            }
        }
    },

    // ============================================================
    // EXPENSES
    // ============================================================
    '/payroll/expenses/createcategories': {
        post: {
            tags: ['Payroll - Expenses'],
            summary: 'Create expense category',
            description: 'HR/ADMIN only. Creates a new expense category',
            security: [{ BearerAuth: [] }],
            responses: {
                201: { description: 'Category created' }
            }
        }
    },

    '/payroll/expenses/getcategories': {
        get: {
            tags: ['Payroll - Expenses'],
            summary: 'Get expense categories',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'List of expense categories' }
            }
        }
    },

    '/payroll/expenses/createexpense': {
        post: {
            tags: ['Payroll - Expenses'],
            summary: 'Create expense claim',
            description: 'Employee/Manager submits an expense claim',
            security: [{ BearerAuth: [] }],
            responses: {
                201: { description: 'Expense created' }
            }
        }
    },

    '/payroll/expenses/getexpenses': {
        get: {
            tags: ['Payroll - Expenses'],
            summary: 'Get expenses',
            description: 'EMPLOYEE sees own, MANAGER sees team, HR/ADMIN sees all',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'List of expenses' }
            }
        }
    },

    '/payroll/expenses/{expenseId}/approve': {
        patch: {
            tags: ['Payroll - Expenses'],
            summary: 'Approve/Reject expense',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'expenseId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Expense status updated' }
            }
        }
    },

    '/payroll/expenses/{expenseId}/payroll': {
        patch: {
            tags: ['Payroll - Expenses'],
            summary: 'Toggle payroll inclusion',
            description: 'HR/ADMIN toggles whether expense is included in payroll',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'expenseId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Payroll flag toggled' }
            }
        }
    },

    // ============================================================
    // LOANS
    // ============================================================
    '/payroll/loans/loantype': {
        get: {
            tags: ['Payroll - Loans'],
            summary: 'Get loan types',
            description: 'HR/ADMIN only. Returns configured loan types',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Loan types list' }
            }
        },
        post: {
            tags: ['Payroll - Loans'],
            summary: 'Create loan type',
            security: [{ BearerAuth: [] }],
            responses: {
                201: { description: 'Loan type created' }
            }
        }
    },

    '/payroll/loans/loantype/{loantypeid}': {
        get: {
            tags: ['Payroll - Loans'],
            summary: 'Get loan type by ID',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'loantypeid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Loan type details' }
            }
        },
        put: {
            tags: ['Payroll - Loans'],
            summary: 'Update loan type',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'loantypeid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Loan type updated' }
            }
        },
        delete: {
            tags: ['Payroll - Loans'],
            summary: 'Delete loan type',
            description: 'ADMIN only',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'loantypeid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Loan type deleted' }
            }
        }
    },

    '/payroll/loans': {
        post: {
            tags: ['Payroll - Loans'],
            summary: 'Apply for loan',
            description: 'Employee applies for a loan',
            security: [{ BearerAuth: [] }],
            responses: {
                201: { description: 'Loan application created' }
            }
        }
    },

    '/payroll/loans/getloans': {
        get: {
            tags: ['Payroll - Loans'],
            summary: 'Get my loans',
            description: 'EMPLOYEE views their own loans',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'List of loans' }
            }
        }
    },

    '/payroll/loans/team': {
        get: {
            tags: ['Payroll - Loans'],
            summary: 'Get team loans',
            description: 'MANAGER views team loans',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Team loans' }
            }
        }
    },

    '/payroll/loans/all': {
        get: {
            tags: ['Payroll - Loans'],
            summary: 'Get all loans',
            description: 'HR/ADMIN views all loans',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'All loans' }
            }
        }
    },

    '/payroll/loans/{loanId}': {
        get: {
            tags: ['Payroll - Loans'],
            summary: 'Get loan by ID',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'loanId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Loan details' }
            }
        }
    },

    '/payroll/loans/{loanId}/approve': {
        patch: {
            tags: ['Payroll - Loans'],
            summary: 'Approve loan',
            description: 'MANAGER/HR approves loan application',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'loanId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Loan approved' }
            }
        }
    },

    '/payroll/loans/{loanId}/close': {
        patch: {
            tags: ['Payroll - Loans'],
            summary: 'Close loan',
            description: 'HR/ADMIN closes a loan',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'loanId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Loan closed' }
            }
        }
    },

    // ============================================================
    // SETTLEMENT (Reimbursements & F&F)
    // ============================================================
    '/payroll/settlement/reimbursements': {
        get: {
            tags: ['Payroll - Settlement'],
            summary: 'Get all reimbursements',
            description: 'HR/ADMIN views all reimbursement requests',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Reimbursements list' }
            }
        },
        post: {
            tags: ['Payroll - Settlement'],
            summary: 'Create reimbursement request',
            description: 'Employee/Manager submits a reimbursement claim',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['category', 'amount', 'claimDate'],
                            properties: {
                                category: { type: 'string', enum: ['MEDICAL', 'TRAVEL', 'PHONE', 'FOOD', 'OTHER'] },
                                amount: { type: 'number' },
                                claimDate: { type: 'string', format: 'date' },
                                description: { type: 'string' },
                                isTaxable: { type: 'boolean' },
                                receiptUrl: { type: 'string' }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'Reimbursement created' }
            }
        }
    },

    '/payroll/settlement/reimbursements/my': {
        get: {
            tags: ['Payroll - Settlement'],
            summary: 'Get my reimbursements',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'My reimbursements' }
            }
        }
    },

    '/payroll/settlement/reimbursements/{id}/approve': {
        patch: {
            tags: ['Payroll - Settlement'],
            summary: 'Approve/Reject reimbursement',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['status'],
                            properties: {
                                status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                                includeInPayroll: { type: 'boolean' }
                            }
                        }
                    }
                }
            },
            responses: {
                200: { description: 'Reimbursement status updated' }
            }
        }
    },

    '/payroll/settlement/fnf': {
        get: {
            tags: ['Payroll - Settlement'],
            summary: 'Get F&F settlements',
            description: 'HR/ADMIN views all Full & Final settlements',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'F&F settlements list' }
            }
        },
        post: {
            tags: ['Payroll - Settlement'],
            summary: 'Create F&F settlement',
            description: 'HR/ADMIN creates Full & Final settlement for exiting employee',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['employeeId', 'lastWorkingDay'],
                            properties: {
                                employeeId: { type: 'string', format: 'uuid' },
                                lastWorkingDay: { type: 'string', format: 'date' },
                                resignationDate: { type: 'string', format: 'date' }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'F&F created' }
            }
        }
    },

    '/payroll/settlement/fnf/{id}': {
        get: {
            tags: ['Payroll - Settlement'],
            summary: 'Get F&F by ID',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'F&F details' }
            }
        },
        put: {
            tags: ['Payroll - Settlement'],
            summary: 'Update F&F settlement',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'F&F updated' }
            }
        }
    },

    '/payroll/settlement/fnf/{id}/submit': {
        patch: {
            tags: ['Payroll - Settlement'],
            summary: 'Submit F&F for approval',
            description: 'HR submits F&F for ADMIN approval',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'F&F submitted' }
            }
        }
    },

    '/payroll/settlement/fnf/{id}/approve': {
        patch: {
            tags: ['Payroll - Settlement'],
            summary: 'Approve/Reject F&F',
            description: 'ADMIN approves or rejects F&F settlement',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['status'],
                            properties: {
                                status: { type: 'string', enum: ['APPROVED', 'REJECTED'] }
                            }
                        }
                    }
                }
            },
            responses: {
                200: { description: 'F&F status updated' }
            }
        }
    },

    '/payroll/settlement/fnf/{id}/pay': {
        patch: {
            tags: ['Payroll - Settlement'],
            summary: 'Mark F&F as paid',
            description: 'ADMIN marks F&F settlement as paid',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'F&F marked as paid' }
            }
        }
    },

    // ============================================================
    // CONSULTANTS
    // ============================================================
    '/payroll/consultants': {
        get: {
            tags: ['Payroll - Consultants'],
            summary: 'Get consultants',
            description: 'HR/ADMIN views all consultants',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Consultants list' }
            }
        },
        post: {
            tags: ['Payroll - Consultants'],
            summary: 'Create consultant',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['name'],
                            properties: {
                                name: { type: 'string' },
                                email: { type: 'string', format: 'email' },
                                phone: { type: 'string' },
                                pan: { type: 'string' },
                                gstNumber: { type: 'string' },
                                companyName: { type: 'string' },
                                bankName: { type: 'string' },
                                bankAccountNumber: { type: 'string' },
                                bankIfsc: { type: 'string' },
                                contractStart: { type: 'string', format: 'date' },
                                contractEnd: { type: 'string', format: 'date' },
                                monthlyRate: { type: 'number' },
                                hourlyRate: { type: 'number' },
                                tdsRate: { type: 'number' }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'Consultant created' }
            }
        }
    },

    '/payroll/consultants/summary': {
        get: {
            tags: ['Payroll - Consultants'],
            summary: 'Get consultant payroll summary',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Consultant payroll summary' }
            }
        }
    },

    '/payroll/consultants/{id}': {
        get: {
            tags: ['Payroll - Consultants'],
            summary: 'Get consultant by ID',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Consultant details' }
            }
        },
        put: {
            tags: ['Payroll - Consultants'],
            summary: 'Update consultant',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Consultant updated' }
            }
        }
    },

    '/payroll/consultants/invoices': {
        post: {
            tags: ['Payroll - Consultants'],
            summary: 'Create consultant invoice',
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['consultantId', 'invoiceNumber', 'invoiceDate', 'amount'],
                            properties: {
                                consultantId: { type: 'string', format: 'uuid' },
                                invoiceNumber: { type: 'string' },
                                invoiceDate: { type: 'string', format: 'date' },
                                amount: { type: 'number' },
                                gstAmount: { type: 'number' },
                                description: { type: 'string' }
                            }
                        }
                    }
                }
            },
            responses: {
                201: { description: 'Invoice created' }
            }
        }
    },

    '/payroll/consultants/invoices/all': {
        get: {
            tags: ['Payroll - Consultants'],
            summary: 'Get all invoices',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Invoices list' }
            }
        }
    },

    '/payroll/consultants/invoices/{id}/approve': {
        patch: {
            tags: ['Payroll - Consultants'],
            summary: 'Approve invoice',
            description: 'ADMIN approves consultant invoice',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            responses: {
                200: { description: 'Invoice approved' }
            }
        }
    },

    '/payroll/consultants/invoices/{id}/pay': {
        patch: {
            tags: ['Payroll - Consultants'],
            summary: 'Mark invoice as paid',
            description: 'ADMIN marks invoice as paid',
            security: [{ BearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                paymentReference: { type: 'string' }
                            }
                        }
                    }
                }
            },
            responses: {
                200: { description: 'Invoice marked as paid' }
            }
        }
    },

    // ============================================================
    // MERCHANTS
    // ============================================================
    '/payroll/merchants/createvendors': {
        post: {
            tags: ['Payroll - Merchants'],
            summary: 'Create vendor payment',
            security: [{ BearerAuth: [] }],
            responses: {
                201: { description: 'Vendor payment created' }
            }
        }
    },

    '/payroll/merchants/getvendors': {
        get: {
            tags: ['Payroll - Merchants'],
            summary: 'Get vendor payments',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Vendor payments list' }
            }
        }
    },

    '/payroll/merchants/createthird-party': {
        post: {
            tags: ['Payroll - Merchants'],
            summary: 'Create third-party payout',
            security: [{ BearerAuth: [] }],
            responses: {
                201: { description: 'Third-party payout created' }
            }
        }
    },

    '/payroll/merchants/getthird-party': {
        get: {
            tags: ['Payroll - Merchants'],
            summary: 'Get third-party payouts',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Third-party payouts list' }
            }
        }
    },

    '/payroll/merchants/transactions': {
        get: {
            tags: ['Payroll - Merchants'],
            summary: 'Get merchant transactions',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Merchant transactions list' }
            }
        }
    },

    // ============================================================
    // LEGACY ENDPOINTS
    // ============================================================
    '/payroll/salary-components': {
        get: {
            tags: ['Payroll'],
            summary: 'Get salary components (legacy)',
            description: 'Legacy endpoint - returns salary templates',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Salary components' }
            }
        }
    },

    '/payroll/cost-centers': {
        get: {
            tags: ['Payroll'],
            summary: 'Get cost centers (legacy)',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Cost centers list' }
            }
        },
        post: {
            tags: ['Payroll'],
            summary: 'Create cost center (legacy)',
            security: [{ BearerAuth: [] }],
            responses: {
                201: { description: 'Cost center created' }
            }
        }
    },

    '/payroll/schedules': {
        get: {
            tags: ['Payroll'],
            summary: 'Get pay schedules (legacy)',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Pay schedules' }
            }
        }
    },

    '/payroll/deductions': {
        get: {
            tags: ['Payroll'],
            summary: 'Get deductions (legacy)',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Deductions list' }
            }
        }
    },

    '/payroll/deduction-types': {
        get: {
            tags: ['Payroll'],
            summary: 'Get deduction types (legacy)',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Deduction types' }
            }
        }
    },

    '/payroll/salary-revisions': {
        get: {
            tags: ['Payroll'],
            summary: 'Get salary revisions (legacy)',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Salary revisions' }
            }
        }
    },

    '/payroll/income-tax': {
        get: {
            tags: ['Payroll'],
            summary: 'Get income tax config (legacy)',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Income tax configuration' }
            }
        }
    },

    '/payroll/payslips': {
        get: {
            tags: ['Payroll'],
            summary: 'Get payslips (legacy)',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Payslips list' }
            }
        }
    },

    '/payroll/transactions': {
        get: {
            tags: ['Payroll'],
            summary: 'Get transactions (legacy)',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Transactions list' }
            }
        }
    },

    '/payroll/salary-structure': {
        get: {
            tags: ['Payroll'],
            summary: 'Get my salary structure (legacy)',
            description: 'Returns current employee salary structure',
            security: [{ BearerAuth: [] }],
            responses: {
                200: { description: 'Salary structure' }
            }
        }
    }
};
