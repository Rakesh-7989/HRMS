// ===================================================================
// CENTRALIZED ENUMS & CONSTANTS
// ===================================================================
// Use these enums across the app for type safety and consistency.
// Import like: import { LeaveStatus, LEAVE_STATUS } from '@/types/enums';

// ===================================================================
// LEAVE MODULE
// ===================================================================
export const LEAVE_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
} as const;

export type LeaveStatus = (typeof LEAVE_STATUS)[keyof typeof LEAVE_STATUS];

export const LEAVE_STATUS_OPTIONS = [
    { value: LEAVE_STATUS.PENDING, label: 'Pending', color: 'yellow' },
    { value: LEAVE_STATUS.APPROVED, label: 'Approved', color: 'green' },
    { value: LEAVE_STATUS.REJECTED, label: 'Rejected', color: 'red' },
    { value: LEAVE_STATUS.CANCELLED, label: 'Cancelled', color: 'gray' },
] as const;

// ===================================================================
// ATTENDANCE MODULE
// ===================================================================
export const ATTENDANCE_STATUS = {
    PRESENT: 'PRESENT',
    HALF_DAY: 'HALF_DAY',
    ABSENT: 'ABSENT',
    PENDING_CHECKOUT: 'PENDING_CHECKOUT',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

export const ATTENDANCE_STATUS_OPTIONS = [
    { value: ATTENDANCE_STATUS.PRESENT, label: 'Present', color: 'green' },
    { value: ATTENDANCE_STATUS.HALF_DAY, label: 'Half Day', color: 'blue' },
    { value: ATTENDANCE_STATUS.ABSENT, label: 'Absent', color: 'red' },
    { value: ATTENDANCE_STATUS.PENDING_CHECKOUT, label: 'Pending Checkout', color: 'yellow' },
] as const;

// ===================================================================
// EXPENSE MODULE
// ===================================================================
export const EXPENSE_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;

export type ExpenseStatus = (typeof EXPENSE_STATUS)[keyof typeof EXPENSE_STATUS];

// ===================================================================
// LOAN MODULE
// ===================================================================
export const LOAN_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DISBURSED: 'DISBURSED',
    REPAID: 'REPAID',
} as const;

export type LoanStatus = (typeof LOAN_STATUS)[keyof typeof LOAN_STATUS];

// ===================================================================
// PROJECT MODULE
// ===================================================================
export const PROJECT_STATUS = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    ON_HOLD: 'ON_HOLD',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const TASK_STATUS = {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    REVIEW: 'REVIEW',
    DONE: 'DONE',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_PRIORITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
} as const;

export type TaskPriority = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];

// ===================================================================
// TIMESHEET MODULE
// ===================================================================
export const TIMESHEET_STATUS = {
    SUBMITTED: 'SUBMITTED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    PENDING: 'PENDING',
} as const;

export type TimesheetStatus = (typeof TIMESHEET_STATUS)[keyof typeof TIMESHEET_STATUS];

// ===================================================================
// EMPLOYEE / USER MODULE
// ===================================================================
export const EMPLOYEE_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    ON_LEAVE: 'ON_LEAVE',
    TERMINATED: 'TERMINATED',
} as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUS)[keyof typeof EMPLOYEE_STATUS];

export const USER_ROLE = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    HR: 'HR',
    MANAGER: 'MANAGER',
    EMPLOYEE: 'EMPLOYEE',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// ===================================================================
// CLIENT MODULE
// ===================================================================
export const CLIENT_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
} as const;

export type ClientStatus = (typeof CLIENT_STATUS)[keyof typeof CLIENT_STATUS];

// ===================================================================
// INBOX MODULE
// ===================================================================
export const INBOX_STATUS = {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
} as const;

export type InboxStatus = (typeof INBOX_STATUS)[keyof typeof INBOX_STATUS];

// ===================================================================
// ASSET MODULE
// ===================================================================
export const ASSET_STATUS = {
    AVAILABLE: 'AVAILABLE',
    ASSIGNED: 'ASSIGNED',
    UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
    RETIRED: 'RETIRED',
} as const;

export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS];

// ===================================================================
// SUBSCRIPTION MODULE
// ===================================================================
export const SUBSCRIPTION_STATUS = {
    TRIAL: 'TRIAL',
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const BILLING_CYCLE = {
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    YEARLY: 'YEARLY',
} as const;

export type BillingCycle = (typeof BILLING_CYCLE)[keyof typeof BILLING_CYCLE];

// ===================================================================
// WORK MODE
// ===================================================================
export const WORK_MODE = {
    OFFICE: 'OFFICE',
    REMOTE: 'REMOTE',
    HYBRID: 'HYBRID',
    ON_SITE: 'ON_SITE',
} as const;

export type WorkMode = (typeof WORK_MODE)[keyof typeof WORK_MODE];

// ===================================================================
// PERSONAL INFORMATION
// ===================================================================
export const GENDER = {
    MALE: 'MALE',
    FEMALE: 'FEMALE',
    OTHER: 'OTHER',
    PREFER_NOT_TO_SAY: 'PREFER_NOT_TO_SAY',
} as const;

export type Gender = (typeof GENDER)[keyof typeof GENDER];

export const MARITAL_STATUS = {
    SINGLE: 'SINGLE',
    MARRIED: 'MARRIED',
    SEPARATED: 'SEPARATED',
} as const;

export type MaritalStatus = (typeof MARITAL_STATUS)[keyof typeof MARITAL_STATUS];

// ===================================================================
// EMPLOYMENT
// ===================================================================
export const EMPLOYMENT_TYPE = {
    FULL_TIME: 'FULL_TIME',
    PART_TIME: 'PART_TIME',
    CONTRACT: 'CONTRACT',
    INTERN: 'INTERN',
    CONSULTANT: 'CONSULTANT',
} as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPE)[keyof typeof EMPLOYMENT_TYPE];

// ===================================================================
// LEAVE ACCRUAL & ADJUSTMENTS
// ===================================================================
export const LEAVE_ACCRUAL_TYPE = {
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY',
    FIXED: 'FIXED',
} as const;

export type LeaveAccrualType = (typeof LEAVE_ACCRUAL_TYPE)[keyof typeof LEAVE_ACCRUAL_TYPE];

export const LEAVE_ADJUSTMENT_TYPE = {
    ACCRUAL: 'ACCRUAL',
    MANUAL: 'MANUAL',
    CARRY_FORWARD: 'CARRY_FORWARD',
    RESET: 'RESET',
    DEDUCT: 'DEDUCT',
    GRANT: 'GRANT',
} as const;

export type LeaveAdjustmentType = (typeof LEAVE_ADJUSTMENT_TYPE)[keyof typeof LEAVE_ADJUSTMENT_TYPE];

export const HALF_DAY_SESSION = {
    MORNING: 'MORNING',
    AFTERNOON: 'AFTERNOON',
} as const;

export type HalfDaySession = (typeof HALF_DAY_SESSION)[keyof typeof HALF_DAY_SESSION];

// ===================================================================
// LOAN EXTENDED
// ===================================================================
export const LOAN_PAYMENT_STATUS = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    SKIPPED: 'SKIPPED',
    ADJUSTED: 'ADJUSTED',
} as const;

export type LoanPaymentStatus = (typeof LOAN_PAYMENT_STATUS)[keyof typeof LOAN_PAYMENT_STATUS];

export const PAYMENT_SOURCE = {
    PAYROLL: 'PAYROLL',
    MANUAL: 'MANUAL',
    ADJUSTMENT: 'ADJUSTMENT',
} as const;

export type PaymentSource = (typeof PAYMENT_SOURCE)[keyof typeof PAYMENT_SOURCE];

export const INTEREST_TYPE = {
    FLAT: 'FLAT',
    REDUCING: 'REDUCING',
} as const;

export type InterestType = (typeof INTEREST_TYPE)[keyof typeof INTEREST_TYPE];

export const LOAN_ADJUSTMENT_TYPE = {
    WAIVER: 'WAIVER',
    WRITE_OFF: 'WRITE_OFF',
    EMI_ADJUSTMENT: 'EMI_ADJUSTMENT',
} as const;

export type LoanAdjustmentType = (typeof LOAN_ADJUSTMENT_TYPE)[keyof typeof LOAN_ADJUSTMENT_TYPE];

// ===================================================================
// PAYMENT / TRANSACTION
// ===================================================================
export const PAYMENT_STATUS = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
    SUCCESS: 'SUCCESS',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const TRANSACTION_STATUS = {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
} as const;

export type TransactionStatus = (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Get status color class for styling
 */
export const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
        // Green statuses
        APPROVED: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20',
        PRESENT: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20',
        ACTIVE: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20',
        COMPLETED: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20',
        DONE: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20',
        REPAID: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20',
        SUCCESS: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20',
        PAID: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20',
        CLOSED: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20',

        // Yellow statuses
        PENDING: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20',
        IN_PROGRESS: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20',
        REVIEW: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20',
        PENDING_CHECKOUT: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20',
        UNDER_MAINTENANCE: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20',
        TRIAL: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20',
        SKIPPED: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20',
        ONBOARDING: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20',

        // Red statuses
        REJECTED: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20',
        ABSENT: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20',
        CANCELLED: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20',
        TERMINATED: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20',
        EXPIRED: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20',
        FAILED: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20',

        // Blue statuses
        HALF_DAY: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20',
        DISBURSED: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20',
        SUBMITTED: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20',
        ASSIGNED: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20',
        ADJUSTED: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20',

        // Gray statuses
        INACTIVE: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20',
        ON_HOLD: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20',
        NOT_STARTED: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20',
        TODO: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20',
        AVAILABLE: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20',
        RETIRED: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20',
        ON_LEAVE: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20',
    };

    return colorMap[status.toUpperCase()] || 'text-gray-600 bg-gray-100';
};

/**
 * Format status for display (e.g., IN_PROGRESS -> "In Progress")
 */
export const formatStatus = (status: string): string => {
    return status
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
