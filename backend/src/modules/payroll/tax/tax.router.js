const express = require('express');
const router = express.Router();
const verifyJwt = require('../../../middleware/verifyJwt');
const { requireAnyPermission } = require('../../../middleware/requirePermission');
const taxController = require('./tax.controller');

// Sections (Config)
router.get('/sections', verifyJwt, taxController.getTaxSections);
router.post('/sections', verifyJwt, requireAnyPermission(['manage_payroll_components', 'process_payroll']), taxController.createTaxSection);

// Regime Selection (Employee)
router.get('/regime', verifyJwt, taxController.getRegime);
router.post('/regime', verifyJwt, taxController.setRegime);

// Declarations (Employee)
router.get('/declarations', verifyJwt, taxController.getDeclarations);
router.post('/declarations', verifyJwt, taxController.upsertDeclaration);
router.delete('/declarations/:id', verifyJwt, taxController.deleteDeclaration);

// Admin Review
router.get('/admin/reviews', verifyJwt, requireAnyPermission(['manage_payroll_components', 'process_payroll']), taxController.getAdminReviewList);
router.patch('/admin/declarations/:id', verifyJwt, requireAnyPermission(['manage_payroll_components', 'process_payroll']), taxController.adminReviewDeclaration);

// Form 16
router.get('/form16/part-b', verifyJwt, taxController.downloadForm16PartB);

module.exports = router;
