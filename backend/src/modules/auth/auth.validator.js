const { z } = require("zod");

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

/**
 * LOGIN VALIDATION
 * Public endpoint - validates email and password
 */
exports.loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    rememberMe: z.boolean().optional()
  })
});

/**
 * REFRESH TOKEN VALIDATION
 * Validates refresh token for generating new access token
 */
exports.refreshSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(10, "Invalid refresh token"),
  }),
});

/**
 * FORGOT PASSWORD VALIDATION
 * Public endpoint - validates email for password reset request
 */
exports.forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
  }),
});

/**
 * CHANGE PASSWORD VALIDATION
 * Authenticated endpoint - validates current and new password
 */
exports.changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6, "Current password is required"),
    newPassword: strongPassword,
    confirmPassword: strongPassword
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  }).refine(data => data.currentPassword !== data.newPassword, {
    message: "New password cannot be the same as current password",
    path: ["newPassword"]
  })
});

/**
 * RESET PASSWORD VALIDATION
 * Public endpoint - validates reset token and new password
 */
exports.resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: strongPassword,
    confirmPassword: strongPassword
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  })
});

/**
 * LOGOUT VALIDATION
 * Validates refresh token for logout
 */
exports.logoutSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(10, "Invalid refresh token"),
  }),
});


