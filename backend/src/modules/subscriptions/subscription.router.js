const express = require('express');
const router = express.Router();
const subscriptionController = require('./subscriptions.controller');
const couponController = require('./coupon.controller');
const verifyJwt = require('../../middleware/verifyJwt');
const { requirePermission } = require('../../middleware/requirePermission');

// Public endpoints
router.get('/plans', subscriptionController.getPlans);
router.post('/webhook', subscriptionController.handleWebhook);
router.post('/coupons/validate', subscriptionController.validateCoupon);

// Protected endpoints (Requires Login)
router.use(verifyJwt);

router.get('/my-subscription', subscriptionController.getMySubscription);
router.get('/usage', subscriptionController.getUsage);
router.get('/orders', subscriptionController.getInvoices);
router.post('/subscriptions', requirePermission('manage_billing'), subscriptionController.createSubscription);

// Platform admin plan management
router.get('/platform/plans', requirePermission('platform.manage_plans'), subscriptionController.adminGetPlans);
router.post('/platform/plans', requirePermission('platform.manage_plans'), subscriptionController.adminCreatePlan);
router.put('/platform/plans/:id', requirePermission('platform.manage_plans'), subscriptionController.adminUpdatePlan);
router.patch('/platform/plans/:id', requirePermission('platform.manage_plans'), subscriptionController.adminUpdatePlan);
router.delete('/platform/plans/:id', requirePermission('platform.manage_plans'), subscriptionController.adminDeletePlan);

// Legacy admin plan routes (keep for backwards compatibility)
router.post('/admin/plans', requirePermission('platform.manage_plans'), subscriptionController.adminCreatePlan);
router.patch('/admin/plans/:id', requirePermission('platform.manage_plans'), subscriptionController.adminUpdatePlan);

// Coupon management (platform admin)
router.get('/coupons', requirePermission('platform.manage_coupons'), couponController.getCoupons);
router.post('/coupons', requirePermission('platform.manage_coupons'), couponController.createCoupon);
router.put('/coupons/:id', requirePermission('platform.manage_coupons'), couponController.updateCoupon);
router.delete('/coupons/:id', requirePermission('platform.manage_coupons'), couponController.deleteCoupon);

module.exports = router;
