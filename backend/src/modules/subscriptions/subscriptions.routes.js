const express = require('express');
const subscriptionController = require('./subscriptions.controller');
const validate = require('../../middleware/validate');
const verifyJwt = require('../../middleware/verifyJwt');
const {
    upgradeSubscriptionSchema,
    planSearchSchema
} = require('./subscriptions.validator');

const requireRole = require('../../middleware/requireRole');

const router = express.Router();

// Public routes (or authenticated for viewing plans)
router.get('/plans', validate(planSearchSchema), subscriptionController.getPlans);

// Webhook (Public, signature verified inside)
router.post('/webhook', subscriptionController.handleWebhook);

// Cashfree: Verify payment (Publicly accessible to verify registration completion)
router.post('/verify-payment', subscriptionController.verifyPayment);

// Public: Initiate payment for pending-payment tenant (used during registration retry / login gate)
router.post('/initiate-tenant-payment', subscriptionController.initiatePaymentForTenant);

// Authenticated routes
router.use(verifyJwt);

// Only Admin can view company subscription details
router.get('/my-subscription', requireRole(['ADMIN']), subscriptionController.getMySubscription);

// View current usage vs plan limits
router.get('/usage', requireRole(['ADMIN']), subscriptionController.getUsage);

// View order history
router.get('/orders', requireRole(['ADMIN']), subscriptionController.getOrders);

// Only Admin can perform upgrades (Change Plan)
router.post('/upgrade', requireRole(['ADMIN']), validate(upgradeSubscriptionSchema), subscriptionController.upgradeSubscription);

// Cancel subscription (at period end)
router.post('/cancel', requireRole(['ADMIN']), subscriptionController.cancelSubscription);

// Cashfree: Create order (initiate subscription)
router.post('/create-order', requireRole(['ADMIN']), subscriptionController.createOrder);

// Retry payment for a failed/pending invoice
router.post('/retry-payment/:invoiceId', requireRole(['ADMIN']), subscriptionController.retryPayment);

// Admin / Internal routes (Super Admin actions)
router.post('/admin/cancel/:tenantId', requireRole(['SUPER_ADMIN']), subscriptionController.adminCancelSubscription);
router.post('/admin/extend/:tenantId', requireRole(['SUPER_ADMIN']), subscriptionController.adminExtendSubscription);
router.post('/admin/enable/:tenantId', requireRole(['SUPER_ADMIN']), subscriptionController.adminEnableSubscription);
router.post('/admin/suspend/:tenantId', requireRole(['SUPER_ADMIN']), subscriptionController.adminSuspendSubscription);
router.post('/admin/upgrade/:tenantId', requireRole(['SUPER_ADMIN']), subscriptionController.adminUpgradeSubscription);
router.get('/admin/billing/:tenantId', requireRole(['SUPER_ADMIN']), subscriptionController.adminGetBillingHistory);
router.post('/', requireRole(['SUPER_ADMIN']), subscriptionController.createSubscription);

module.exports = router;
