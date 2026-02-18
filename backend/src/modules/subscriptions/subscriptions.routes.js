const express = require('express');
const subscriptionController = require('./subscriptions.controller');
const validate = require('../../middleware/validate');
const verifyJwt = require('../../middleware/verifyJwt');
const {
    upgradeSubscriptionSchema,
    planSearchSchema
} = require('./subscriptions.validator');

const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");
const { requirePlatformAdmin } = require("../../middleware/requirePlatformAdmin");

const router = express.Router();

// Public routes (or authenticated for viewing plans)
router.get('/plans', validate(planSearchSchema), subscriptionController.getPlans);

// Webhook (Public, signature verified inside)
router.post('/webhook', subscriptionController.handleWebhook);

// Authenticated routes
router.use(verifyJwt);

// Only Admin can view company subscription details
router.get('/my-subscription', requirePermission('manage_billing'), subscriptionController.getMySubscription);

// View current usage vs plan limits
router.get('/usage', requirePermission('manage_billing'), subscriptionController.getUsage);

// View order history
router.get('/orders', requirePermission('manage_billing'), subscriptionController.getOrders);

// Only Admin can perform upgrades (Change Plan)
router.post('/upgrade', requirePermission('manage_billing'), validate(upgradeSubscriptionSchema), subscriptionController.upgradeSubscription);

// Cancel subscription (at period end)
router.post('/cancel', requirePermission('manage_billing'), subscriptionController.cancelSubscription);

// Cashfree: Create order (initiate subscription)
router.post('/create-order', requirePermission('manage_billing'), subscriptionController.createOrder);

// Cashfree: Verify payment
router.post('/verify-payment', requirePermission('manage_billing'), subscriptionController.verifyPayment);

// Retry payment for a failed/pending invoice
router.post('/retry-payment/:invoiceId', requirePermission('manage_billing'), subscriptionController.retryPayment);

// Admin / Internal routes (Super Admin actions)
router.post('/admin/cancel/:tenantId', requirePermission('platform.manage_tenants'), subscriptionController.adminCancelSubscription);
router.post('/admin/extend/:tenantId', requirePermission('platform.manage_tenants'), subscriptionController.adminExtendSubscription);
router.post('/admin/enable/:tenantId', requirePermission('platform.manage_tenants'), subscriptionController.adminEnableSubscription);
router.post('/admin/suspend/:tenantId', requirePermission('platform.manage_tenants'), subscriptionController.adminSuspendSubscription);
router.post('/admin/upgrade/:tenantId', requirePermission('platform.manage_tenants'), subscriptionController.adminUpgradeSubscription);
router.get('/admin/billing/:tenantId', requirePermission('platform.manage_tenants'), subscriptionController.adminGetBillingHistory);
// Platform Plan Management (Migrated from legacy superAdmin)
router.get('/platform/plans', requirePlatformAdmin('platform.manage_plans'), subscriptionController.getAllPlans);
router.post('/platform/plans', requirePlatformAdmin('platform.manage_plans'), subscriptionController.createPlan);
router.put('/platform/plans/:id', requirePlatformAdmin('platform.manage_plans'), subscriptionController.updatePlan);
router.delete('/platform/plans/:id', requirePlatformAdmin('platform.manage_plans'), subscriptionController.deletePlan);

// Platform Tenant Subscription Create
router.post('/platform/subscriptions', requirePlatformAdmin('platform.manage_tenants'), subscriptionController.createSubscription);

module.exports = router;
