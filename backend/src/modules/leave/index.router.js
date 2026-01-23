const express = require('express');
const router = express.Router();

const leaveRequestRouter = require('./requests/leaveRequest.router');
const leaveTypeRouter = require('./types/leaveType.router');
const leavePolicyRouter = require('./policies/leavePolicy.router');
const leaveBalanceRouter = require('./balances/leaveBalance.router');
const holidayRouter = require('./holidays/holiday.router');
const delegationRouter = require('./delegations/delegation.router');
const leaveReportRouter = require('./reports/leaveReport.router');

// Mount sub-routers
router.use('/types', leaveTypeRouter);
router.use('/policies', leavePolicyRouter);
router.use('/balances', leaveBalanceRouter);
router.use('/holidays', holidayRouter);
router.use('/delegations', delegationRouter);
router.use('/reports', leaveReportRouter);

// Core leave request routes (apply, approve, etc.)
// These are mounted at root /leave so e.g. /leave/apply works
router.use('/', leaveRequestRouter);

module.exports = router;
