/**
 * DASHBOARDS API ENDPOINTS
 * Comprehensive analytics dashboards for all roles
 * Base path: /api/dashboards
 */

module.exports = {
  "/dashboards/system": {
    get: {
      tags: ["Dashboards"],
      summary: "System Dashboard (SUPER_ADMIN)",
      description:
        "Get comprehensive system-wide analytics and monitoring dashboard. Shows global metrics, tenant activity, and system health.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "System dashboard data with analytics",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "success" },
                  data: {
                    type: "object",
                    properties: {
                      metrics: {
                        type: "object",
                        properties: {
                          active_tenants: { type: "integer" },
                          total_tenants: { type: "integer" },
                          total_users: { type: "integer" },
                          total_employees: { type: "integer" },
                          active_tenants_24h: { type: "integer" },
                          active_users_24h: { type: "integer" }
                        }
                      },
                      tenantGrowth: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            date: { type: "string", format: "date" },
                            new_tenants: { type: "integer" }
                          }
                        }
                      },
                      userGrowth: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            date: { type: "string", format: "date" },
                            new_users: { type: "integer" }
                          }
                        }
                      },
                      topActiveTenants: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            user_count: { type: "integer" },
                            session_count: { type: "integer" },
                            last_activity: { type: "string", format: "date-time" }
                          }
                        }
                      },
                      systemHealth: {
                        type: "object",
                        properties: {
                          active_orgs: { type: "integer" },
                          active_users: { type: "integer" },
                          pending_pwd_change: { type: "integer" },
                          inactive_users: { type: "integer" }
                        }
                      }
                    }
                  },
                  timestamp: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        401: { description: "Unauthorized - invalid JWT" },
        403: { description: "Forbidden - SUPER_ADMIN role required" },
        500: { description: "Server error" }
      }
    }
  },

  "/dashboards/organization": {
    get: {
      tags: ["Dashboards"],
      summary: "Organization Dashboard (ADMIN/HR)",
      description:
        "Get organization-wide analytics including headcount, departments, roles, attendance patterns, and leave statistics.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Organization dashboard with analytics",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "success" },
                  data: {
                    type: "object",
                    properties: {
                      orgMetrics: {
                        type: "object",
                        properties: {
                          total_users: { type: "integer" },
                          total_employees: { type: "integer" },
                          total_departments: { type: "integer" },
                          total_designations: { type: "integer" },
                          active_users: { type: "integer" },
                          inactive_users: { type: "integer" }
                        }
                      },
                      roleDistribution: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            role: { type: "string" },
                            count: { type: "integer" }
                          }
                        }
                      },
                      departmentAnalytics: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            employee_count: { type: "integer" },
                            manager_count: { type: "integer" },
                            on_leave_today: { type: "integer" }
                          }
                        }
                      },
                      attendanceMetrics: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            date: { type: "string", format: "date" },
                            total_checkins: { type: "integer" },
                            late_arrivals: { type: "integer" },
                            unique_employees: { type: "integer" }
                          }
                        }
                      },
                      leaveStatistics: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            leave_type: { type: "string" },
                            total_requests: { type: "integer" },
                            approved: { type: "integer" },
                            rejected: { type: "integer" },
                            pending: { type: "integer" }
                          }
                        }
                      },
                      employeeStatus: {
                        type: "object",
                        properties: {
                          active: { type: "integer" },
                          inactive: { type: "integer" },
                          new_employees: { type: "integer" }
                        }
                      },
                      topDepartments: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            headcount: { type: "integer" }
                          }
                        }
                      }
                    }
                  },
                  timestamp: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        401: { description: "Unauthorized - invalid JWT" },
        403: { description: "Forbidden - ADMIN or HR role required" },
        500: { description: "Server error" }
      }
    }
  },

  "/dashboards/hr": {
    get: {
      tags: ["Dashboards"],
      summary: "HR Analytics Dashboard (HR/ADMIN)",
      description:
        "Get HR-specific analytics including leave requests, attendance overview, employees on leave, and leave statistics.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "HR dashboard with leave and attendance analytics",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "success" },
                  data: {
                    type: "object",
                    properties: {
                      leaveMetrics: {
                        type: "object",
                        properties: {
                          total_requests: { type: "integer" },
                          pending: { type: "integer" },
                          approved: { type: "integer" },
                          rejected: { type: "integer" },
                          employees_with_requests: { type: "integer" }
                        }
                      },
                      pendingRequests: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            leave_type: { type: "string" },
                            start_date: { type: "string", format: "date" },
                            end_date: { type: "string", format: "date" },
                            employee_id: { type: "string" },
                            first_name: { type: "string" },
                            last_name: { type: "string" },
                            department: { type: "string" }
                          }
                        }
                      },
                      leaveTypeDistribution: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            leave_type: { type: "string" },
                            count: { type: "integer" },
                            approved_count: { type: "integer" },
                            avg_duration_days: { type: "number" }
                          }
                        }
                      },
                      attendanceOverview: {
                        type: "object",
                        properties: {
                          date: { type: "string", format: "date" },
                          total_checkins: { type: "integer" },
                          unique_employees: { type: "integer" },
                          late_count: { type: "integer" },
                          late_percentage: { type: "number" }
                        }
                      },
                      employeesOnLeaveToday: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            first_name: { type: "string" },
                            last_name: { type: "string" },
                            department: { type: "string" },
                            leave_type: { type: "string" }
                          }
                        }
                      },
                      leaveBalanceTopTakers: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            first_name: { type: "string" },
                            last_name: { type: "string" },
                            total_leave_days: { type: "integer" },
                            approved_days: { type: "integer" }
                          }
                        }
                      },
                      recentActions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            status: { type: "string" },
                            first_name: { type: "string" },
                            last_name: { type: "string" },
                            updated_at: { type: "string", format: "date-time" }
                          }
                        }
                      }
                    }
                  },
                  timestamp: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        401: { description: "Unauthorized - invalid JWT" },
        403: { description: "Forbidden - HR or ADMIN role required" },
        500: { description: "Server error" }
      }
    }
  },

  "/dashboards/team": {
    get: {
      tags: ["Dashboards"],
      summary: "Team Dashboard (MANAGER)",
      description:
        "Get comprehensive team analytics including direct reports, team attendance, pending leave requests, and performance metrics.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Team dashboard with team analytics",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "success" },
                  data: {
                    type: "object",
                    properties: {
                      teamMetrics: {
                        type: "object",
                        properties: {
                          direct_reports: { type: "integer" },
                          active_employees: { type: "integer" },
                          inactive_employees: { type: "integer" }
                        }
                      },
                      directReports: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            first_name: { type: "string" },
                            last_name: { type: "string" },
                            email: { type: "string" },
                            is_active: { type: "boolean" },
                            department: { type: "string" },
                            designation: { type: "string" },
                            on_leave_today: { type: "integer" }
                          }
                        }
                      },
                      teamAttendanceToday: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            first_name: { type: "string" },
                            last_name: { type: "string" },
                            check_in_time: { type: "string", format: "date-time" },
                            check_out_time: { type: "string", format: "date-time" },
                            is_late: { type: "boolean" },
                            status: { type: "string" }
                          }
                        }
                      },
                      teamLeaveRequests: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            leave_type: { type: "string" },
                            start_date: { type: "string", format: "date" },
                            end_date: { type: "string", format: "date" },
                            status: { type: "string" }
                          }
                        }
                      },
                      pendingLeaveRequests: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            leave_type: { type: "string" },
                            start_date: { type: "string", format: "date" },
                            end_date: { type: "string", format: "date" },
                            first_name: { type: "string" },
                            last_name: { type: "string" }
                          }
                        }
                      },
                      teamPerformanceMetrics: {
                        type: "object",
                        properties: {
                          days_tracked: { type: "integer" },
                          total_checkins: { type: "integer" },
                          late_arrivals: { type: "integer" },
                          late_percentage: { type: "number" }
                        }
                      }
                    }
                  },
                  timestamp: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        401: { description: "Unauthorized - invalid JWT" },
        403: { description: "Forbidden - MANAGER role required" },
        404: { description: "Manager profile not found" },
        500: { description: "Server error" }
      }
    }
  },

  "/dashboards/personal": {
    get: {
      tags: ["Dashboards"],
      summary: "Personal Dashboard (EMPLOYEE)",
      description:
        "Get personal employee dashboard with leave history, attendance summary, upcoming events, and profile information.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Personal employee dashboard with analytics",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "success" },
                  data: {
                    type: "object",
                    properties: {
                      profile: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          first_name: { type: "string" },
                          last_name: { type: "string" },
                          email: { type: "string" },
                          phone: { type: "string" },
                          department: { type: "string" },
                          designation: { type: "string" },
                          joined_date: { type: "string", format: "date-time" },
                          is_active: { type: "boolean" }
                        }
                      },
                      leaveMetrics: {
                        type: "object",
                        properties: {
                          total_applications: { type: "integer" },
                          pending: { type: "integer" },
                          approved: { type: "integer" },
                          rejected: { type: "integer" },
                          upcoming_leaves: { type: "integer" }
                        }
                      },
                      leaveHistory: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            leave_type: { type: "string" },
                            start_date: { type: "string", format: "date" },
                            end_date: { type: "string", format: "date" },
                            status: { type: "string" },
                            reason: { type: "string" }
                          }
                        }
                      },
                      attendanceSummary: {
                        type: "object",
                        properties: {
                          total_days: { type: "integer" },
                          late_days: { type: "integer" },
                          days_present: { type: "integer" },
                          avg_hours_worked: { type: "number" }
                        }
                      },
                      todayStatus: {
                        type: "object",
                        properties: {
                          check_in_time: { type: "string", format: "date-time" },
                          check_out_time: { type: "string", format: "date-time" },
                          is_late: { type: "boolean" },
                          status: { type: "string" }
                        }
                      },
                      monthlyAttendance: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            date: { type: "string", format: "date" },
                            type: { type: "string" },
                            count: { type: "integer" }
                          }
                        }
                      },
                      upcomingLeaves: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            leave_type: { type: "string" },
                            start_date: { type: "string", format: "date" },
                            end_date: { type: "string", format: "date" }
                          }
                        }
                      }
                    }
                  },
                  timestamp: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        401: { description: "Unauthorized - invalid JWT" },
        403: { description: "Forbidden - authenticated user required" },
        404: { description: "Employee profile not found" },
        500: { description: "Server error" }
      }
    }
  }
};
