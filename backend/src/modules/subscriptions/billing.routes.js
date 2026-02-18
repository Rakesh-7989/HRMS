const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');
const couponController = require('./coupon.controller');
const verifyJwt = require('../../middleware/verifyJwt');
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");

// Public Webhook (Cashfree calls this)
router.post('/webhook', billingController.handleWebhook);

// Coupon Routes
router.post('/coupons', verifyJwt, requirePermission('platform.manage_coupons'), couponController.createCoupon);
router.get('/coupons', verifyJwt, requirePermission('platform.manage_coupons'), couponController.getCoupons);
router.put('/coupons/:id', verifyJwt, requirePermission('platform.manage_coupons'), couponController.updateCoupon);
router.post('/coupons/validate', couponController.validateCoupon); // Public for Pricing Page
router.delete('/coupons/:id', verifyJwt, requirePermission('platform.manage_coupons'), couponController.deleteCoupon);

// Protected Routes
router.get('/plans', billingController.getPlans);
router.post('/subscriptions', verifyJwt, billingController.createSubscription);
router.get('/orders', verifyJwt, billingController.getInvoices);
router.get('/my-subscription', verifyJwt, billingController.getMySubscription);
router.post('/retry-payment/:invoiceId', verifyJwt, billingController.retryPayment);

module.exports = router;
