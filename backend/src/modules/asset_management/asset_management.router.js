const express = require("express");
const ctrl = require("./asset_management.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const requireRole = require("../../middleware/requireRole");

const {
  createAssetSchema,
  updateAssetSchema,
  getAssetByIdSchema,
  deleteAssetSchema,
  getBarcodeSchema,
  assignAssetSchema,
  returnAssetSchema,
  getTrackingSchema,
  listAssetsSchema,
  getAccessoriesSchema,
  swapAssetSchema,
  createAssetRequestSchema,
  handleAssetRequestSchema,
  updateAssetRequestSchema,
  deleteAssetRequestSchema
} = require("./asset_management.validator");

const router = express.Router();


/**
 * ============================================================================
 * ASSET ROUTES (JWT REQUIRED)
 * ============================================================================
 */

/**
 * POST /api/assets/create
 * Create a new asset
 * Requires: ADMIN, HR
 */
router.post(
  "/create",
  verifyJwt,
  requireRole(["ADMIN"]),
  validate(createAssetSchema),
  ctrl.createAsset
);

/**
 * GET /api/assets/list
 * List all assets with optional filters
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 * Role-based filtering:
 * - ADMIN/HR: See all assets
 * - MANAGER: See assets assigned to their team
 * - EMPLOYEE: See only their assigned assets
 */
router.get(
  "/list",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(listAssetsSchema),
  ctrl.listAssets
);

/**
 * GET /api/assets/dashboard
 * Get asset dashboard stats
 * Requires: ADMIN, HR
 */
router.get(
  "/dashboard",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  ctrl.getAssetDashboard
);

/**
 * GET /api/assets/export/csv
 * Export all assets as CSV
 * Requires: ADMIN, HR
 */
router.get(
  "/export/csv",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  ctrl.exportAssetsCSV
);

/**
 * GET /api/assets/warranty-alerts
 * Get assets with warranty expiring soon
 * Requires: ADMIN, HR
 */
router.get(
  "/warranty-alerts",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  ctrl.getWarrantyAlerts
);

/**
 * GET /api/assets/:id
 * Get asset details by ID
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (own assets only)
 */
router.get(
  "/list/:id",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(getAssetByIdSchema),
  ctrl.getAssetById
);

/**
 * PUT /api/assets/:id
 * Update asset details
 * Requires: ADMIN
 */
router.put(
  "/update/:id",
  verifyJwt,
  requireRole(["ADMIN"]),
  validate(updateAssetSchema),
  ctrl.updateAsset
);

/**
 * DELETE /api/assets/:id
 * Retire asset (soft delete)
 * Requires: ADMIN
 */
router.delete(
  "/delete/:id",
  verifyJwt,
  requireRole(["ADMIN"]),
  validate(deleteAssetSchema),
  ctrl.retireAsset
);

/**
 * GET /api/assets/:id/barcode
 * Generate barcode for asset
 * Returns: Base64 encoded PNG image
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (own assets only)
 */
router.get(
  "/:id/barcode",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  validate(getBarcodeSchema),
  ctrl.generateBarcode
);

/**
 * GET /api/assets/:id/qrcode
 * Generate QR code for asset
 * Returns: Base64 encoded PNG QR code image
 * Requires: ADMIN, HR
 */
router.get(
  "/:id/qrcode",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  validate(getBarcodeSchema),
  ctrl.generateQRCode
);

/**
 * POST /api/assets/:id/assign
 * Assign asset to employee
 * Requires: ADMIN, HR
 */
router.post(
  "/:id/assign",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  validate(assignAssetSchema),
  ctrl.assignAsset
);

/**
 * POST /api/assets/:id/return
 * Return asset from employee
 * Requires: ADMIN, HR
 */
router.post(
  "/:id/return",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  validate(returnAssetSchema),
  ctrl.returnAsset
);

/**
 * GET /api/assets/:id/accessories
 * Get active accessories assigned with this asset
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (own assets only — enforced via getAssetById check)
 */
router.get(
  "/:id/accessories",
  verifyJwt,
  requireRole(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
  validate(getAccessoriesSchema),
  ctrl.getAssetAccessories
);

/**
 * POST /api/assets/:id/swap
 * Swap asset — atomically return old and assign new to same employee
 * Requires: ADMIN, HR
 */
router.post(
  "/:id/swap",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  validate(swapAssetSchema),
  ctrl.swapAsset
);

/**
 * GET /api/assets/:id/tracking
 * Get asset tracking events
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (own assets only)
 */
router.get(
  "/:id/tracking",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  validate(getTrackingSchema),
  ctrl.getAssetTracking
);

/**
 * GET /api/assets/:id/usage-history
 * Get asset usage history
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (own assets only)
 */
router.get(
  "/:id/usage-history",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  validate(getTrackingSchema),
  ctrl.getAssetUsageHistory
);

/**
 * ============================================================================
 * ASSET REQUEST ROUTES
 * ============================================================================
 */

/**
 * POST /api/assets/requests/create
 * Submit new asset request
 */
router.post(
  "/requests/create",
  verifyJwt,
  validate(createAssetRequestSchema),
  ctrl.createAssetRequest
);

/**
 * GET /api/assets/requests/list
 * List all asset requests (Admin/HR see all, others see own)
 */
router.get(
  "/requests/list",
  verifyJwt,
  ctrl.listAssetRequests
);

/**
 * POST /api/assets/requests/:id/handle
 * Approve or Reject asset request
 * Requires: ADMIN, HR
 */
router.post(
  "/requests/:id/handle",
  verifyJwt,
  requireRole(["ADMIN", "HR"]),
  validate(handleAssetRequestSchema),
  ctrl.handleAssetRequest
);

/**
 * PUT /api/assets/requests/:id
 * Update asset request (Pending only)
 */
router.put(
  "/requests/:id",
  verifyJwt,
  validate(updateAssetRequestSchema),
  ctrl.updateAssetRequest
);

/**
 * DELETE /api/assets/requests/:id
 * Delete asset request (Pending only)
 */
router.delete(
  "/requests/:id",
  verifyJwt,
  validate(deleteAssetRequestSchema),
  ctrl.deleteAssetRequest
);

module.exports = router;
