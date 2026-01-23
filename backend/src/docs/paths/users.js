/**
 * USERS API ENDPOINTS
 * All user management endpoints (create, list, update, assign roles/departments/designations)
 */

module.exports = {
  '/users': {
    post: {
      tags: ['Users'],
      summary: 'Create New User',
      description: 'Create a new employee user account. Requires ADMIN or HR role. Only same-tenant resources can be assigned.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'first_name', 'role'],
              properties: {
                email: { type: 'string', format: 'email' },
                first_name: { type: 'string', minLength: 1 },
                last_name: { type: 'string' },
                phone: { type: 'string' },
                role: {
                  type: 'string',
                  enum: ['EMPLOYEE', 'MANAGER', 'HR']
                },
                department_id: { type: 'string', format: 'uuid', description: 'Must belong to same tenant' },
                designation_id: { type: 'string', format: 'uuid', description: 'Must belong to same tenant' },
                reports_to: { type: 'string', format: 'uuid', description: 'Employee ID of reporting manager' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'User created successfully with temporary password',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'object',
                    properties: {
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          email: { type: 'string' },
                          role: { type: 'string' }
                        }
                      },
                      employee: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          first_name: { type: 'string' },
                          department_id: { type: 'string', format: 'uuid' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: { description: 'Email already exists or validation error' },
        403: { description: 'Permission denied - only ADMIN/HR can create users' },
        422: { description: 'Department or designation not found in your organization' }
      }
    },
    get: {
      tags: ['Users'],
      summary: 'List Users',
      description: 'Get list of users with pagination and filters',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'role',
          schema: { type: 'string', enum: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] }
        },
        {
          in: 'query',
          name: 'search',
          schema: { type: 'string' },
          description: 'Search by email or name'
        },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', default: 10 }
        },
        {
          in: 'query',
          name: 'offset',
          schema: { type: 'integer', default: 0 }
        }
      ],
      responses: {
        200: {
          description: 'Users list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        is_active: { type: 'boolean' }
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

  '/users/{id}': {
    get: {
      tags: ['Users'],
      summary: 'Get User by ID',
      description: 'Fetch full user and employee details',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        200: { description: 'User details' },
        404: { description: 'User not found' }
      }
    },
    put: {
      tags: ['Users'],
      summary: 'Update User',
      description: 'Update user email and active status',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                is_active: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'User updated' },
        400: { description: 'Validation error' },
        404: { description: 'User not found' }
      }
    }
  },

  '/users/{id}/employee': {
    put: {
      tags: ['Users'],
      summary: 'Update Employee Details',
      description: 'Update employee profile information',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                phone: { type: 'string' },
                date_of_birth: { type: 'string', format: 'date' },
                address: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Employee updated' },
        404: { description: 'Employee not found' }
      }
    }
  },

  '/users/{id}/role': {
    put: {
      tags: ['Users'],
      summary: 'Change User Role',
      description: 'Change user role (ADMIN/SUPER_ADMIN only)',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
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
              required: ['role'],
              properties: {
                role: {
                  type: 'string',
                  enum: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Role changed' },
        403: { description: 'Permission denied - only ADMIN can change roles' },
        400: { description: 'Cannot change ADMIN role (SUPER_ADMIN required)' }
      }
    }
  },

  '/users/{id}/manager': {
    put: {
      tags: ['Users'],
      summary: 'Change Reporting Manager',
      description: 'Assign or update the reporting manager for an employee',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
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
              required: ['manager_id'],
              properties: {
                manager_id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Employee ID of the reporting manager'
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Manager updated' },
        404: { description: 'User or manager not found' }
      }
    }
  },

  '/users/{id}/department': {
    put: {
      tags: ['Users'],
      summary: 'Assign Department',
      description: 'Assign or update department for an employee (must be same tenant)',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
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
              required: ['department_id'],
              properties: {
                department_id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Department must belong to same tenant'
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Department assigned' },
        400: { description: 'Department not found or does not belong to your organization' },
        404: { description: 'User not found' }
      }
    }
  },

  '/users/{id}/designation': {
    put: {
      tags: ['Users'],
      summary: 'Assign Designation',
      description: 'Assign or update designation for an employee (must be same tenant)',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
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
              required: ['designation_id'],
              properties: {
                designation_id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Designation must belong to same tenant'
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Designation assigned' },
        400: { description: 'Designation not found or does not belong to your organization' },
        404: { description: 'User not found' }
      }
    }
  },

  '/users/{id}/status': {
    put: {
      tags: ['Users'],
      summary: 'Update User Status',
      description: 'Activate or deactivate a user account',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
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
              required: ['is_active'],
              properties: {
                is_active: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Status updated' },
        404: { description: 'User not found' }
      }
    }
  },

  '/users/me/profile': {
    get: {
      tags: ['Users'],
      summary: 'Get Own Profile',
      description: 'Fetch current logged-in user\'s full profile',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'User profile' },
        401: { description: 'Unauthorized' }
      }
    },
    put: {
      tags: ['Users'],
      summary: 'Update Own Profile',
      description: 'Update current logged-in user\'s profile information',
      security: [{ BearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                phone: { type: 'string' },
                date_of_birth: { type: 'string', format: 'date' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Profile updated' },
        401: { description: 'Unauthorized' }
      }
    }
  },

  '/users/manager/dashboard': {
    get: {
      tags: ['Users'],
      summary: 'Manager Dashboard',
      description: 'Get manager dashboard overview (MANAGER role required)',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Dashboard data' },
        403: { description: 'Only managers can access this endpoint' }
      }
    }
  },

  '/users/manager/reports': {
    get: {
      tags: ['Users'],
      summary: 'Get Direct Reports',
      description: 'List all employees reporting to the current manager',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Direct reports list' },
        403: { description: 'Only managers can access this endpoint' }
      }
    }
  }
};
