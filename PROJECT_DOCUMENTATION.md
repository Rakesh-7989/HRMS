# HRMS SAAS - Real-Time Project Documentation

**Project Name:** HRMS SAAS (Human Resource Management System)
**Version:** 1.0.0
**Last Updated:** February 2, 2026

---

## 1. Project Overview
This project is a comprehensive **SaaS-based Human Resource Management System (HRMS)** designed to handle multi-tenant operations. It serves as a complete ERP solution for organizations to manage employees, payroll, attendance, leave, assets, and projects.

The system is built with a **modern tech stack** ensuring scalability, security, and a premium user experience with responsive and animated UI.

---

## 2. Technology Stack

### Frontend (Client-Side)
- **Framework:** React 18 (via Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Utility-first CSS)
- **Animations:** Framer Motion
- **State Management:** React Query (TanStack Query), React Context
- **Routing:** React Router DOM v6
- **Forms & Validation:** Formik, Yup
- **Charts:** Recharts
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Drag & Drop:** DND Kit

### Backend (Server-Side)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (with `uuid-ossp` and `pgcrypto` extensions)
- **ORM:** Sequelize
- **Validation:** Zod
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** Helmet, CORS, BCrypt
- **PDF Generation:** PDFKit
- **Email:** Nodemailer
- **Payments:** Razorpay
- **Scheduling:** Node-Cron (for automated jobs like payroll/attendance)
- **Logging:** Pino / Winston

---

## 3. Architecture

### System Architecture
The application follows a **Multi-Tenant Architecture** where a single instance of the software serves multiple tenants (customers), with data isolation enforced at the database level (using `tenant_id` column interaction).

### Backend Structure
The backend implements a **Modular Architecture** (Vertical Slice). Instead of grouping by technical layers (controllers, models), it processes by feature modules.
- `src/modules`: Contains module-specific logic (e.g., `auth`, `payroll`, `attendance`).
- `src/middleware`: Global middleware (Auth, Error Handling, Rate Limiting).
- `src/database`: Migrations, Seeds, and Schema definitions.
- `src/jobs`: Scheduled background tasks.

### Frontend Structure
The frontend is component-based with a clear separation of concerns:
- `pages`: Top-level route components.
- `components`: Reusable UI building blocks (atomic design principles).
- `services`: API integration layer.
- `contexts`: Global state providers (Auth, Theme).
- `types`: TypeScript interface definitions.

---

## 4. Key Modules & Features

### 1. Core HR & Employee Management
- **Employee Profiles:** Complete 360-degree view (Personal, Professional, Bank, Documents).
- **Onboarding:** Manage new joining process.
- **Organization:** Manage Departments, Designations, and Hierarchy.

### 2. Time & Attendance
- **Clock In/Out:** Geo-fencing and IP-restriction support.
- **Shift Management:** Dynamic shift scheduling and tracking.
- **Breaks:** Track break durations.
- **Biometrics Integration:** (Capable via API).
- **Work From Home:** WFH request and approval workflows.

### 3. Leave Management
- **Policies:** Configurable leave policies (Accrual, Carry Forward).
- **Applications:** Employee requests and Manager approvals.
- **Balances:** Real-time balance tracking and adjustments.
- **Holidays:** Public and Restricted holiday calendars.

### 4. Payroll & Finance
- **Salary Structures:** Flexible components (Basic, HRA, Allowances).
- **Payroll Processing:** Automated monthly pay-run generation.
- **Payslips:** Auto-generated PDF payslips.
- **Expenses:** Employee expense claims and reimbursement.
- **Loans:** Employee salary advances and EMI deductions.
- **Taxation:** Tax ID tracking and basic calculations.

### 5. Asset Management
- **Inventory:** Track hardware/software assets.
- **Lifecycle:** Allocation, Return, and Maintenance requests.

### 6. Project Management (Timesheets)
- **Projects:** Manage client projects and budgets.
- **Timesheets:** Daily/Weekly time logging by employees.
- **Approvals:** Manager approval workflow for billable hours.
- **Billing:** Track billable vs. non-billable hours.

### 7. SaaS & Administration
- **Subscription Plans:** Manage Pricing Plans (Standard, Premium).
- **Tenant Management:** Onboard and manage customer accounts.
- **RBAC:** Detailed Role-Based Access Control (Admin, Manager, Employee).
- **Audit Logs:** Track system changes for security.

---

## 5. Database Schema Summary

The database is normalized and extensively uses **UUIDs** for primary keys.

### Primary Entities
| Table Name | Description |
| :--- | :--- |
| `tenants` | Roots of the multi-tenancy system. |
| `users` | Login credentials and global access. |
| `employees` | Extended profile data linked to Users. |
| `roles` | Permissions and access levels. |

### Operational Entities
| Table Name | Description |
| :--- | :--- |
| `attendance` | Daily work logs. |
| `leave_applications` | Leave requests. |
| `payroll_runs` | Monthly salary batches. |
| `assets` | Company property tracking. |
| `projects` | Client project definitions. |
| `timesheet_entries` | Hours logged against projects. |

---

## 6. Setup & Run Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

### Installation

1.  **Clone the Repository**
    ```bash
    git clone <repo-url>
    cd HRMS-GZ
    ```

2.  **Backend Setup**
    ```bash
    cd HRMS/backend
    npm install
    # Create .env file with DB credentials and secrets
    # Run Migrations
    psql -d <db_name> -f src/database/schema.sql
    npm run dev
    ```

3.  **Frontend Setup**
    ```bash
    cd HRMS/frontend
    npm install
    npm run dev
    ```

4.  **Access**
    - Frontend: `http://localhost:5173`
    - Backend API: `http://localhost:5000`

---

## 7. Migration Guide
Database changes are managed via SQL files in `backend/src/database/migrations`.
- **Manual Execution:** Since no auto-runner is currently active, apply `.sql` files manually using `psql` or a GUI client (pgAdmin) in chronological order.

---

**End of Document**
