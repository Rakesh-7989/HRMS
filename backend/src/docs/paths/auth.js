/**
 * AUTH API ENDPOINTS
 * All authentication-related endpoints (login, refresh, password reset, etc.)
 */

module.exports = {
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'User Login',
      description: 'Authenticate user with email and password. Returns JWT access and refresh tokens.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'user@company.com'
                },
                password: {
                  type: 'string',
                  format: 'password',
                  example: 'YourPassword123'
                },
                rememberMe: {
                  type: 'boolean',
                  description: 'Extend token expiry to 30 days',
                  example: false
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], example: 'SUPER_ADMIN' },
                  tenantId: { type: ['string', 'null'], format: 'uuid', example: null },
                  mustChangePassword: { type: 'boolean', example: false },
                  accessToken: { type: 'string', description: 'JWT access token (15 min expiry)' },
                  refreshToken: { type: 'string', description: 'JWT refresh token (7 days expiry)' }
                }
              }
            }
          }
        },
        401: { description: 'Invalid email or password' },
        400: { description: 'Validation error' },
        403: { description: 'Account is inactive or must change password' }
      }
    }
  },

  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh Access Token',
      description: 'Get a new access token using a valid refresh token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refresh_token'],
              properties: {
                refresh_token: {
                  type: 'string',
                  description: 'Refresh token from login response'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Token refreshed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  accessToken: { type: 'string', description: 'New JWT access token' },
                  refreshToken: { type: 'string', description: 'New refresh token' }
                }
              }
            }
          }
        },
        401: { description: 'Invalid, expired, or revoked refresh token' },
        403: { description: 'Token revoked - session ended' }
      }
    }
  },

  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Request Password Reset',
      description: 'Send a password reset link to the user\'s email',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email'
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Password reset email sent successfully' },
        404: { description: 'User with this email not found' },
        400: { description: 'Validation error' }
      }
    }
  },

  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Reset Password with Token',
      description: 'Reset user password using the token received in email',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token', 'newPassword'],
              properties: {
                token: {
                  type: 'string',
                  description: 'Password reset token from email'
                },
                newPassword: {
                  type: 'string',
                  format: 'password',
                  minLength: 8
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Password reset successful' },
        400: { description: 'Invalid or expired reset token' },
        422: { description: 'Validation error' }
      }
    }
  },

  '/auth/change-password': {
    post: {
      tags: ['Auth'],
      summary: 'Change Password (Authenticated)',
      description: 'Change password for logged-in user',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['currentPassword', 'newPassword'],
              properties: {
                currentPassword: {
                  type: 'string',
                  format: 'password'
                },
                newPassword: {
                  type: 'string',
                  format: 'password',
                  minLength: 8
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Password changed successfully' },
        401: { description: 'Current password is incorrect' },
        422: { description: 'Validation error' }
      }
    }
  },

  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout Current Session',
      description: 'Invalidate the current session and revoke refresh token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refresh_token'],
              properties: {
                refresh_token: {
                  type: 'string',
                  description: 'Refresh token to revoke'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Logged out successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  message: { type: 'string', example: 'Logged out' }
                }
              }
            }
          }
        },
        401: { description: 'Invalid or expired refresh token' }
      }
    }
  },

  '/auth/logout-all': {
    post: {
      tags: ['Auth'],
      summary: 'Logout from All Devices',
      description: 'Revoke all active sessions and refresh tokens for this user',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Logged out from all devices successfully' },
        401: { description: 'Unauthorized - invalid token' }
      }
    }
  },

  '/auth/sessions': {
    get: {
      tags: ['Auth'],
      summary: 'List Active Sessions',
      description: 'Get a list of all active sessions for the current user',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'Active sessions list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  sessions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        token: { type: 'string', description: 'Refresh token hash' },
                        created_at: { type: 'string', format: 'date-time' },
                        expires_at: { type: 'string', format: 'date-time' },
                        ip_address: { type: 'string' },
                        user_agent: { type: 'string' },
                        is_revoked: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized - invalid token' }
      }
    }
  }
};
