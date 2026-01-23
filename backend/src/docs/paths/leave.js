/**
 * LEAVE API ENDPOINTS
 * Leave request management, approvals, and balance tracking
 */

module.exports = {
  // ============ LEAVE TYPES ============
  '/leave-types': {
    get: {
      tags: ['Leave'],
      summary: 'List Leave Types',
      description: 'Get all leave types available in the organization. Leave types are predefined (Sick, Casual, Annual, Unpaid, etc.)',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20 },
          description: 'Number of records to return'
        },
        {
          name: 'offset',
          in: 'query',
          schema: { type: 'integer', default: 0 },
          description: 'Number of records to skip'
        }
      ],
      responses: {
        200: {
          description: 'Leave types list retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Sick Leave' },
                        description: { type: 'string', example: 'Leave for medical/health issues' },
                        annual_limit: { type: 'integer', example: 5 },
                        is_paid: { type: 'boolean', example: true },
                        tenant_id: { type: 'string', format: 'uuid' },
                        created_at: { type: 'string', format: 'date-time' }
                      }
                    }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer' },
                      limit: { type: 'integer' },
                      offset: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized' }
      }
    },
    post: {
      tags: ['Leave'],
      summary: 'Create Leave Type',
      description: 'Create a new leave type. Only ADMIN can create leave types.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'annual_limit', 'is_paid'],
              properties: {
                name: { type: 'string', example: 'Maternity Leave' },
                description: { type: 'string', example: 'Leave for new mothers' },
                annual_limit: { type: 'integer', example: 180 },
                is_paid: { type: 'boolean', example: true }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Leave type created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      annual_limit: { type: 'integer' },
                      is_paid: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        },
        400: { description: 'Validation error - invalid input' },
        401: { description: 'Unauthorized' },
        403: { description: 'Only ADMIN can create leave types' }
      }
    }
  },

  // ============ LEAVE REQUESTS ============
  '/leave-requests': {
    get: {
      tags: ['Leave'],
      summary: 'List Leave Requests',
      description: 'Get leave requests. HR/ADMIN see all requests in tenant. MANAGER sees team requests. EMPLOYEE sees own requests.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] },
          description: 'Filter by request status'
        },
        {
          name: 'employee_id',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
          description: 'Filter by employee (HR/ADMIN only)'
        },
        {
          name: 'leave_type_id',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
          description: 'Filter by leave type'
        },
        {
          name: 'from_date',
          in: 'query',
          schema: { type: 'string', format: 'date' },
          description: 'Filter leaves from this date'
        },
        {
          name: 'to_date',
          in: 'query',
          schema: { type: 'string', format: 'date' },
          description: 'Filter leaves until this date'
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20 }
        },
        {
          name: 'offset',
          in: 'query',
          schema: { type: 'integer', default: 0 }
        }
      ],
      responses: {
        200: {
          description: 'Leave requests retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        employee_id: { type: 'string', format: 'uuid' },
                        employee_name: { type: 'string', example: 'John Doe' },
                        leave_type_id: { type: 'string', format: 'uuid' },
                        leave_type_name: { type: 'string', example: 'Sick Leave' },
                        from_date: { type: 'string', format: 'date' },
                        to_date: { type: 'string', format: 'date' },
                        days_requested: { type: 'number', example: 3 },
                        reason: { type: 'string' },
                        status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] },
                        approved_by: { type: 'string', format: 'uuid' },
                        approved_by_name: { type: 'string' },
                        approval_date: { type: 'string', format: 'date-time' },
                        rejection_reason: { type: 'string' },
                        created_at: { type: 'string', format: 'date-time' }
                      }
                    }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer' },
                      limit: { type: 'integer' },
                      offset: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized' }
      }
    },
    post: {
      tags: ['Leave'],
      summary: 'Create Leave Request',
      description: 'Submit a new leave request. Employees request their own leave. HR/ADMIN can request on behalf.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['leave_type_id', 'from_date', 'to_date', 'reason'],
              properties: {
                employee_id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Optional - only for HR/ADMIN to request on behalf'
                },
                leave_type_id: { type: 'string', format: 'uuid', example: 'uuid-of-leave-type' },
                from_date: { type: 'string', format: 'date', example: '2025-12-15' },
                to_date: { type: 'string', format: 'date', example: '2025-12-17' },
                reason: { type: 'string', example: 'Medical treatment' },
                half_day: { type: 'boolean', default: false, description: 'Mark request as half day' },
                half_day_type: {
                  type: 'string',
                  enum: ['FIRST_HALF', 'SECOND_HALF'],
                  description: 'Required if half_day is true'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Leave request created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      employee_id: { type: 'string', format: 'uuid' },
                      leave_type_id: { type: 'string', format: 'uuid' },
                      from_date: { type: 'string', format: 'date' },
                      to_date: { type: 'string', format: 'date' },
                      days_requested: { type: 'number' },
                      reason: { type: 'string' },
                      status: { type: 'string', example: 'PENDING' },
                      created_at: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        },
        400: { description: 'Validation error - invalid dates or insufficient leave balance' },
        401: { description: 'Unauthorized' },
        409: { description: 'Conflict - overlapping leave request or insufficient balance' }
      }
    }
  },

  '/leave-requests/{id}': {
    get: {
      tags: ['Leave'],
      summary: 'Get Leave Request Details',
      description: 'Retrieve a specific leave request. Requestor and approvers can view.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        200: {
          description: 'Leave request retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      employee_id: { type: 'string', format: 'uuid' },
                      employee_name: { type: 'string' },
                      leave_type_id: { type: 'string', format: 'uuid' },
                      leave_type_name: { type: 'string' },
                      from_date: { type: 'string', format: 'date' },
                      to_date: { type: 'string', format: 'date' },
                      days_requested: { type: 'number' },
                      reason: { type: 'string' },
                      status: { type: 'string' },
                      approved_by: { type: 'string', format: 'uuid' },
                      approval_date: { type: 'string', format: 'date-time' },
                      created_at: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized' },
        404: { description: 'Leave request not found' }
      }
    },
    put: {
      tags: ['Leave'],
      summary: 'Update Leave Request',
      description: 'Update a pending leave request. Only the requestor (EMPLOYEE/HR/ADMIN) can update before approval.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                leave_type_id: { type: 'string', format: 'uuid' },
                from_date: { type: 'string', format: 'date' },
                to_date: { type: 'string', format: 'date' },
                reason: { type: 'string' },
                half_day: { type: 'boolean' },
                half_day_type: { type: 'string', enum: ['FIRST_HALF', 'SECOND_HALF'] }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Leave request updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: { type: 'object' }
                }
              }
            }
          }
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Can only update pending requests' },
        404: { description: 'Leave request not found' }
      }
    },
    delete: {
      tags: ['Leave'],
      summary: 'Cancel Leave Request',
      description: 'Cancel a pending leave request. Can only cancel PENDING requests.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        200: { description: 'Leave request cancelled successfully' },
        401: { description: 'Unauthorized' },
        403: { description: 'Can only cancel pending requests' },
        404: { description: 'Leave request not found' }
      }
    }
  },

  '/leave-requests/{id}/approve': {
    post: {
      tags: ['Leave'],
      summary: 'Approve Leave Request',
      description: 'Approve a pending leave request. Only HR/ADMIN/MANAGER (for their team) can approve.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                remarks: { type: 'string', description: 'Optional approval remarks' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Leave request approved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      status: { type: 'string', example: 'APPROVED' },
                      approved_by: { type: 'string', format: 'uuid' },
                      approval_date: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        },
        400: { description: 'Leave request already processed' },
        401: { description: 'Unauthorized' },
        403: { description: 'Permission denied - only HR/ADMIN/MANAGER can approve' },
        404: { description: 'Leave request not found' }
      }
    }
  },

  '/leave-requests/{id}/reject': {
    post: {
      tags: ['Leave'],
      summary: 'Reject Leave Request',
      description: 'Reject a pending leave request. Only HR/ADMIN/MANAGER (for their team) can reject.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: {
                reason: { type: 'string', example: 'Insufficient staffing on requested dates' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Leave request rejected',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      status: { type: 'string', example: 'REJECTED' },
                      rejection_reason: { type: 'string' },
                      rejected_by: { type: 'string', format: 'uuid' }
                    }
                  }
                }
              }
            }
          }
        },
        400: { description: 'Leave request already processed' },
        401: { description: 'Unauthorized' },
        403: { description: 'Permission denied' },
        404: { description: 'Leave request not found' }
      }
    }
  },

  // ============ LEAVE BALANCE ============
  '/leave-balance': {
    get: {
      tags: ['Leave'],
      summary: 'Get Leave Balance',
      description: 'Get current leave balance for logged-in employee or specified employee (HR/ADMIN). Shows used and remaining balance for each leave type.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'employee_id',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
          description: 'Optional - fetch balance for specific employee (HR/ADMIN only)'
        },
        {
          name: 'year',
          in: 'query',
          schema: { type: 'integer', default: 'current_year' },
          description: 'Fiscal year for balance calculation'
        }
      ],
      responses: {
        200: {
          description: 'Leave balance retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'object',
                    properties: {
                      employee_id: { type: 'string', format: 'uuid' },
                      employee_name: { type: 'string' },
                      year: { type: 'integer' },
                      balances: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            leave_type_id: { type: 'string', format: 'uuid' },
                            leave_type_name: { type: 'string', example: 'Sick Leave' },
                            annual_limit: { type: 'number', example: 5 },
                            used: { type: 'number', example: 2 },
                            pending: { type: 'number', example: 1 },
                            remaining: { type: 'number', example: 2 },
                            carried_over: { type: 'number', example: 0 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Permission denied' }
      }
    }
  },

  '/leave-balance/{employee_id}': {
    get: {
      tags: ['Leave'],
      summary: 'Get Employee Leave Balance',
      description: 'Get leave balance for a specific employee. Available to HR/ADMIN/MANAGER and the employee themselves.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'employee_id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'year',
          in: 'query',
          schema: { type: 'integer' },
          description: 'Fiscal year for balance calculation'
        }
      ],
      responses: {
        200: {
          description: 'Leave balance retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: { type: 'object' }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Permission denied' },
        404: { description: 'Employee not found' }
      }
    }
  },

  // ============ LEAVE CALENDAR ============
  '/leave-calendar': {
    get: {
      tags: ['Leave'],
      summary: 'Get Leave Calendar',
      description: 'Get team or organization leave calendar. Shows all approved leaves for team members.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'department_id',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
          description: 'Filter by department (MANAGER/HR can view their department)'
        },
        {
          name: 'month',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 12 },
          description: 'Month to view (1-12)'
        },
        {
          name: 'year',
          in: 'query',
          schema: { type: 'integer' },
          description: 'Year to view'
        }
      ],
      responses: {
        200: {
          description: 'Leave calendar retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'object',
                    properties: {
                      year: { type: 'integer' },
                      month: { type: 'integer' },
                      leaves: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            date: { type: 'string', format: 'date' },
                            employees: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  employee_id: { type: 'string', format: 'uuid' },
                                  employee_name: { type: 'string' },
                                  leave_type: { type: 'string' },
                                  is_half_day: { type: 'boolean' }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized' }
      }
    }
  }
};
