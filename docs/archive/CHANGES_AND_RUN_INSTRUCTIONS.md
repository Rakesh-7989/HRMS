# Changes and Run Instructions

**Last Updated:** 2026-02-02

## 1. Summary of Changes

### Frontend: Timesheet Dashboard
- **New Dashboard Implemented:** Created a comprehensive `TimesheetDashboard` to visualize project hours, billable stats, and approvals.
- **Components Created:**
  - `StatsSection`: Displays key metrics (Total Hours, Billable Hours, etc.).
  - `MiddleSection`: Visualization of data (Charts/Graphs).
  - `BottomSection`: Detailed tables or lists for recent activities.
- **Integration:** The dashboard has been integrated into the `ProjectsPage` and accessible via `TimesheetContent`.

### Backend: Database Schema Updates
- **Employees Table:** Added `annual_salary` column to track yearly compensation.
- **Timesheet Entries Table:** Added `is_billable` column to distinguish billable types.

---

## 2. Files Modified and Created

### Frontend (`frontend/src/`)
#### [NEW] Components
- `components/timesheets/TimesheetDashboard.tsx`
- `components/timesheets/StatsSection.tsx`
- `components/timesheets/MiddleSection.tsx`
- `components/timesheets/BottomSection.tsx`

#### [MODIFIED] Pages & Components
- `pages/projects/TimesheetPage.tsx` (Integration point)
- `components/payroll/TimesheetContent.tsx`

### Backend (`backend/src/`)
#### [NEW] Migrations
- `database/migrations/20260202_add_annual_salary.sql`
- `database/migrations/20260202_add_is_billable.sql`

---

## 3. How to Run

### Prerequisites
- Node.js installed
- PostgreSQL database running locally

### Steps

1.  **Start the Backend Server**
    ```bash
    cd backend
    npm run dev
    ```
    *Server should start on port 5000 (or configured port).*

2.  **Start the Frontend Application**
    ```bash
    cd frontend
    npm run dev
    ```
    *Application will be available at http://localhost:5173 (or configured Vite port).*

---

## 4. Migration Instructions

Since the backend does not have an automatic migration runner configured for these specific files, you must execute the SQL commands manually against your PostgreSQL database.

### Option A: Using pgAdmin or Generic SQL Client
Run the following SQL queries in your database query tool:

**1. Add Annual Salary to Employees**
```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS annual_salary NUMERIC(15, 2) DEFAULT 0;
```

**2. Add Is Billable to Timesheet Entries**
```sql
ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT FALSE;
```

### Option B: Using Command Line (psql)
If you have `psql` installed, you can run:

```bash
psql -d <your_database_name> -f backend/src/database/migrations/20260202_add_annual_salary.sql
psql -d <your_database_name> -f backend/src/database/migrations/20260202_add_is_billable.sql
```
