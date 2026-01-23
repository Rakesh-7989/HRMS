/**
 * ATTENDANCE API ENDPOINTS
 * Clock in/out, attendance records, approvals, and summaries
 */

module.exports = {
  '/attendance/clock-in': {
    post: {
      tags: ['Attendance'],
      summary: 'Clock In',
      description: 'Employee clocks in for the day. Can only clock in once per day.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ip: { type: 'string', description: 'Client IP address (optional)' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Clocked in successfully',
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
                      date: { type: 'string', format: 'date' },
                      check_in_time: { type: 'string', format: 'time' },
                      check_in_ip: { type: 'string' },
                      status: { type: 'string', example: 'PRESENT' }
                    }
                  }
                }
              }
            }
          }
        },
        400: { description: 'Already clocked in today' },
        401: { description: 'Unauthorized' }
      }
    }
  },

  '/attendance/clock-out': {
    post: {
      tags: ['Attendance'],
      summary: 'Clock Out',
      description: 'Employee clocks out for the day. Must have clocked in first.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ip: { type: 'string', description: 'Client IP address (optional)' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Clocked out successfully',
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
                      check_out_time: { type: 'string', format: 'time' },
                      check_out_ip: { type: 'string' },
                      total_hours: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        400: { description: 'No check-in found for today or already clocked out' },
        401: { description: 'Unauthorized' }
      }
    }
  },

  '/attendance/today': {
    get: {
      tags: ['Attendance'],
      summary: 'Get Today\'s Attendance',
      description: 'Get current user\'s attendance record for today',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'Today\'s attendance record',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      date: { type: 'string', format: 'date' },
                      check_in_time: { type: 'string', format: 'time' },
                      check_out_time: { type: 'string', format: 'time' },
                      status: { type: 'string', enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] },
                      is_late: { type: 'boolean' }
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
  },

  '/attendance/my-attendance': {
    get: {
      tags: ['Attendance'],
      summary: 'Get My Attendance History',
      description: 'Get employee\'s attendance history with date range filtering',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'from_date',
          schema: { type: 'string', format: 'date' },
          description: 'Start date (YYYY-MM-DD)'
        },
        {
          in: 'query',
          name: 'to_date',
          schema: { type: 'string', format: 'date' },
          description: 'End date (YYYY-MM-DD)'
        },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', default: 30 }
        },
        {
          in: 'query',
          name: 'offset',
          schema: { type: 'integer', default: 0 }
        }
      ],
      responses: {
        200: {
          description: 'Attendance history',
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
                        date: { type: 'string', format: 'date' },
                        check_in_time: { type: 'string', format: 'time' },
                        check_out_time: { type: 'string', format: 'time' },
                        status: { type: 'string' },
                        is_late: { type: 'boolean' }
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

  '/attendance/team/attendance': {
    get: {
      tags: ['Attendance'],
      summary: 'Get Team Attendance',
      description: 'Get attendance records of direct reports (MANAGER/ADMIN/HR only)',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'from_date',
          schema: { type: 'string', format: 'date' }
        },
        {
          in: 'query',
          name: 'to_date',
          schema: { type: 'string', format: 'date' }
        }
      ],
      responses: {
        200: { description: 'Team attendance records' },
        403: { description: 'Only MANAGER/ADMIN/HR can access this' }
      }
    }
  },

  '/attendance/records': {
    get: {
      tags: ['Attendance'],
      summary: 'Get All Attendance Records',
      description: 'Get all attendance records with filters (ADMIN/HR only)',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'employee_id',
          schema: { type: 'string', format: 'uuid' }
        },
        {
          in: 'query',
          name: 'from_date',
          schema: { type: 'string', format: 'date' }
        },
        {
          in: 'query',
          name: 'to_date',
          schema: { type: 'string', format: 'date' }
        },
        {
          in: 'query',
          name: 'status',
          schema: {
            type: 'string',
            enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'REJECTED']
          }
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
        200: { description: 'Attendance records' },
        403: { description: 'Only ADMIN/HR can access this' }
      }
    }
  },

  '/attendance/{id}/approve': {
    put: {
      tags: ['Attendance'],
      summary: 'Approve Attendance',
      description: 'Approve an attendance record (ADMIN/HR only)',
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
              properties: {
                reason: {
                  type: 'string',
                  description: 'Reason for approval (optional)'
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Attendance approved' },
        403: { description: 'Only ADMIN/HR can approve attendance' },
        404: { description: 'Attendance record not found' }
      }
    }
  },

  '/attendance/{id}/reject': {
    put: {
      tags: ['Attendance'],
      summary: 'Reject Attendance',
      description: 'Reject an attendance record (ADMIN/HR only)',
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
              required: ['reason'],
              properties: {
                reason: {
                  type: 'string',
                  description: 'Reason for rejection'
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Attendance rejected' },
        403: { description: 'Only ADMIN/HR can reject attendance' },
        404: { description: 'Attendance record not found' }
      }
    }
  },

  '/attendance/summary': {
    get: {
      tags: ['Attendance'],
      summary: 'Get Attendance Summary',
      description: 'Get monthly/period attendance summary for all employees (ADMIN/HR only)',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'from_date',
          schema: { type: 'string', format: 'date' },
          required: true
        },
        {
          in: 'query',
          name: 'to_date',
          schema: { type: 'string', format: 'date' },
          required: true
        }
      ],
      responses: {
        200: {
          description: 'Attendance summary',
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
                        first_name: { type: 'string' },
                        last_name: { type: 'string' },
                        email: { type: 'string' },
                        total_days: { type: 'integer' },
                        present_days: { type: 'integer' },
                        absent_days: { type: 'integer' },
                        late_days: { type: 'integer' }
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
  }
};
