/**
 * DEPARTMENTS & DESIGNATIONS API ENDPOINTS
 */

const departments = {
  '/departments': {
    post: {
      tags: ['Departments'],
      summary: 'Create Department',
      description: 'Create a new department (ADMIN/HR only)',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', minLength: 1 },
                description: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Department created' },
        400: { description: 'Validation error' },
        403: { description: 'Only ADMIN/HR can create departments' }
      }
    },
    get: {
      tags: ['Departments'],
      summary: 'List Departments',
      description: 'Get all departments for current tenant (ADMIN/HR only)',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'Departments list',
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
                        name: { type: 'string' },
                        description: { type: 'string' },
                        is_active: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        403: { description: 'Only ADMIN/HR can access this' }
      }
    }
  },

  '/departments/{id}': {
    get: {
      tags: ['Departments'],
      summary: 'Get Department by ID',
      description: 'Fetch single department details (ADMIN/HR only)',
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
        200: { description: 'Department details' },
        404: { description: 'Department not found' }
      }
    },
    patch: {
      tags: ['Departments'],
      summary: 'Update Department',
      description: 'Update department information (ADMIN/HR only)',
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
                name: { type: 'string' },
                description: { type: 'string' },
                is_active: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Department updated' },
        404: { description: 'Department not found' }
      }
    },
    delete: {
      tags: ['Departments'],
      summary: 'Delete Department',
      description: 'Delete a department (ADMIN only)',
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
        200: { description: 'Department deleted' },
        403: { description: 'Only ADMIN can delete departments' },
        404: { description: 'Department not found' }
      }
    }
  }
};

const designations = {
  '/designations': {
    post: {
      tags: ['Designations'],
      summary: 'Create Designation',
      description: 'Create a new job designation (ADMIN/HR only)',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', minLength: 1 },
                description: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Designation created' },
        400: { description: 'Designation already exists' }
      }
    },
    get: {
      tags: ['Designations'],
      summary: 'List Designations',
      description: 'Get all active designations for current tenant',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'search',
          schema: { type: 'string' },
          description: 'Search by designation name'
        },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', default: 50 }
        },
        {
          in: 'query',
          name: 'offset',
          schema: { type: 'integer', default: 0 }
        }
      ],
      responses: {
        200: {
          description: 'Designations list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  list: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        created_at: { type: 'string', format: 'date-time' }
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

  '/designations/{id}': {
    get: {
      tags: ['Designations'],
      summary: 'Get Designation by ID',
      description: 'Fetch single designation details',
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
        200: { description: 'Designation details' },
        404: { description: 'Designation not found' }
      }
    },
    put: {
      tags: ['Designations'],
      summary: 'Update Designation',
      description: 'Update designation information (ADMIN/HR only)',
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
                name: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Designation updated' },
        404: { description: 'Designation not found' }
      }
    },
    delete: {
      tags: ['Designations'],
      summary: 'Delete Designation',
      description: 'Soft delete a designation (ADMIN only)',
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
        200: { description: 'Designation deleted' },
        400: { description: 'Cannot delete - designation is assigned to employees' },
        403: { description: 'Only ADMIN can delete designations' }
      }
    }
  }
};

module.exports = { ...departments, ...designations };
