# Clock In/Out & Break Logic Documentation

This document explains the complete workflow for the Attendance system, including Clock In/Out, Break management, and how work hours are calculated.

## 1. System Overview

The attendance system tracks employee work hours using a "Clock In" and "Clock Out" mechanism. It also supports "Breaks" which are deducted from the total work duration.

**Key Components:**
- **Attendance Record:** A daily record created upon Clock In.
- **Attendance Breaks:** Multiple break intervals linked to a daily attendance record.
- **Work Hours:** Calculated as `(Clock Out Time - Clock In Time) - Total Break Duration`.
- **Status:** Automatically determined based on hours worked (e.g., `PRESENT`, `INCOMPLETE_HOURS`).

---

## 2. Default Workflow

### A. Clock In
**Trigger:** User clicks "Clock In" on the Navbar.

**Backend Logic (`attendance.service.js` -> `clockIn`):**
1.  **Validation:**
    *   Checks if the user has an approved **Full Day Leave** (unless it's "Work From Home"). Clock-in is blocked if they are on leave.
    *   **Geo-Fencing:** Verifies if the user is within the allowed location radius (unless working remotely).
    *   **Duplicate Check:** Ensures the user hasn't already clocked in for the day.
2.  **Action:**
    *   Creates a new row in the `attendance` table.
    *   Sets `check_in_time` to the current server time.
    *   Sets initial status to `PRESENT` (or `HALF_DAY` if applicable).

### B. Breaks (Break In / Break Out)
**Trigger:** User clicks "Break In" / "Break Out".

**Backend Logic (`attendance.service.js` -> `startBreak` / `endBreak`):**
1.  **Start Break:**
    *   Creates a new row in `attendance_breaks` linked to the today's `attendance_id`.
    *   Sets `start_time` to NOW.
    *   *Note: Only one active break is allowed at a time.*
2.  **End Break:**
    *   Finds the active break (where `end_time` is NULL).
    *   Sets `end_time` to NOW.
    *   Calculates `duration_minutes` for that specific break.

### C. Clock Out
**Trigger:** User clicks "Clock Out".

**Backend Logic (`attendance.service.js` -> `clockOut`):**
1.  **Validation:**
    *   Checks Geo-Fencing (if not remote).
2.  **Calculation:**
    *   `Gross Duration` = `Current Time` - `Check In Time`
    *   `Total Break Duration` = Sum of all `duration_minutes` from `attendance_breaks` for today.
    *   `Net Work Hours` = `Gross Duration` - `Total Break Duration`.
3.  **Status Determination:**
    *   **Current Rule:** If `Net Work Hours` < **9 hours**, status is set to `INCOMPLETE_HOURS`.
    *   Otherwise, status is `PRESENT`.
4.  **Action:**
    *   Updates `attendance` record with `check_out_time`, final `status`, and location data.

---

## 3. Real-Time Calculation Example

**Scenario:** An employee working a standard 10:00 AM to 7:00 PM shift with a 1-hour break.

#### 1. Clock In @ 10:00 AM
- **Action:** User clicks "Clock In".
- **Data:**
    - `check_in_time`: 10:00 AM
    - `status`: PRESENT

#### 2. Start Break @ 1:30 PM
- **Action:** User clicks "Break In".
- **Data:**
    - New Break Record: `{ start_time: 1:30 PM, end_time: NULL }`

#### 3. End Break @ 2:30 PM
- **Action:** User clicks "Break Out".
- **Data:**
    - Update Break Record: `{ start_time: 1:30 PM, end_time: 2:30 PM, duration: 60 mins }`

#### 4. Clock Out @ 7:30 PM
- **Action:** User clicks "Clock Out".
- **Calculation Step-by-Step:**
    1.  **Gross Duration:** 10:00 AM to 7:30 PM = **9.5 hours** (570 mins).
    2.  **Total Break:** 1 hour (60 mins).
    3.  **Net Work Hours:** 9.5 hours - 1 hour = **8.5 hours**.
    4.  **Status Check:**
        - Is 8.5 hours < 9 hours? **YES**.
        - Only 8.5 hours worked.
- **Result:**
    - `check_out_time`: 7:30 PM
    - `status`: **INCOMPLETE_HOURS**

*(Note: To get permissions for `PRESENT`, they would need to stay until 8:00 PM in this example to reach 9 net hours.)*

---

## 4. Shift & Break Rules

Currently, the system enforces a **9-hour minimum work requirement** irrespective of the specific assigned shift times in the `shifts` table.

- **Shifts Table:** Stores assigned timings (e.g., 9-6, 10-7).
- **Validation:** Currently hardcoded to check for < 9 hours in `attendance.service.js`.

### Planned Improvements (Future)
To make the 9-hour rule dynamic based on the assigned shift:
1.  Fetch the user's assigned `shift_id` from the `employees` table.
2.  Get the `duration` from the `shifts` table (e.g., `end_time` - `start_time`).
3.  Use that specific shift duration for the `INCOMPLETE_HOURS` check instead of the hardcoded 9.

---

## 5. Technical Workflow (State Table)

| State | User Action | System Action | Status Result |
| :--- | :--- | :--- | :--- |
| **No Record** | Click **Clock In** | Create Record | `PRESENT` |
| **Clocked In** | Click **Break In** | Create Break Entry | `PRESENT` (Active Break) |
| **On Break** | Click **Break Out** | Close Break Entry | `PRESENT` |
| **Clocked In** | Click **Clock Out** | Update Record + Calc | `PRESENT` / `INCOMPLETE` |

