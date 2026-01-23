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

// Authenticated routes
router.use(verifyJwt);

// Only Admin can view company subscription details
router.get('/my-subscription', requireRole(['ADMIN']), subscriptionController.getMySubscription);

// View current usage vs plan limits
router.get('/usage', requireRole(['ADMIN']), subscriptionController.getUsage);

// Only Admin can perform upgrades
router.post('/upgrade', requireRole(['ADMIN']), validate(upgradeSubscriptionSchema), subscriptionController.upgradeSubscription);

// Cancel subscription
router.post('/cancel', requireRole(['ADMIN']), subscriptionController.cancelSubscription);

// Razorpay: Create order
router.post('/create-order', requireRole(['ADMIN']), subscriptionController.createOrder);

// Razorpay: Verify payment
router.post('/verify-payment', requireRole(['ADMIN']), subscriptionController.verifyPayment);

// Admin / Internal routes (Super Admin only for manual creation)
router.post('/', requireRole(['SUPER_ADMIN']), subscriptionController.createSubscription);

module.exports = router;
