const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');
const couponController = require('./coupon.controller');
const verifyJwt = require('../../middleware/verifyJwt');
const requireRole = require('../../middleware/requireRole');

// Public Webhook (Cashfree calls this)
router.post('/webhook', billingController.handleWebhook);

// Coupon Routes
router.post('/coupons', verifyJwt, requireRole(['SUPER_ADMIN']), couponController.createCoupon);
router.get('/coupons', verifyJwt, requireRole(['SUPER_ADMIN']), couponController.getCoupons);
router.post('/coupons/validate', couponController.validateCoupon); // Public for Pricing Page

// Protected Routes
router.get('/plans', billingController.getPlans);
router.post('/subscriptions', verifyJwt, billingController.createSubscription);
router.get('/orders', verifyJwt, billingController.getInvoices);
router.get('/my-subscription', verifyJwt, billingController.getMySubscription);
router.post('/retry-payment/:invoiceId', verifyJwt, billingController.retryPayment);

module.exports = router;
