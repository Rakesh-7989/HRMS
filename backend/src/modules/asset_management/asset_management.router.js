const express = require("express");
const ctrl = require("./asset_management.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const requirePermission = require("../../middleware/requirePermission");

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
 */
router.post(
  "/create",
  verifyJwt,
  requirePermission("assets", "create"),
  validate(createAssetSchema),
  ctrl.createAsset
);

/**
 * GET /api/assets/list
 * List all assets with optional filters
 * Role-based filtering is handled within the service/controller logic.
 * Enforce 'view' permission here.
 */
router.get(
  "/list",
  verifyJwt,
  requirePermission("assets", "view"),
  validate(listAssetsSchema),
  ctrl.listAssets
);

/**
 * GET /api/assets/dashboard
 * Get asset dashboard stats
 */
router.get(
  "/dashboard",
  verifyJwt,
  requirePermission("assets", "view_dashboard"),
  ctrl.getAssetDashboard
);

/**
 * GET /api/assets/export/csv
 * Export all assets as CSV
 */
router.get(
  "/export/csv",
  verifyJwt,
  requirePermission("assets", "export"),
  ctrl.exportAssetsCSV
);

/**
 * GET /api/assets/warranty-alerts
 * Get assets with warranty expiring soon (View permission appropriate)
 */
router.get(
  "/warranty-alerts",
  verifyJwt,
  requirePermission("assets", "view"),
  ctrl.getWarrantyAlerts
);

/**
 * GET /api/assets/:id
 * Get asset details by ID
 */
router.get(
  "/list/:id",
  verifyJwt,
  requirePermission("assets", "view"),
  validate(getAssetByIdSchema),
  ctrl.getAssetById
);

/**
 * PUT /api/assets/:id
 * Update asset details
 */
router.put(
  "/update/:id",
  verifyJwt,
  requirePermission("assets", "update"),
  validate(updateAssetSchema),
  ctrl.updateAsset
);

/**
 * DELETE /api/assets/:id
 * Retire asset (soft delete)
 */
router.delete(
  "/delete/:id",
  verifyJwt,
  requirePermission("assets", "delete"),
  validate(deleteAssetSchema),
  ctrl.retireAsset
);

/**
 * GET /api/assets/:id/barcode
 * Generate barcode for asset
 */
router.get(
  "/:id/barcode",
  verifyJwt,
  requirePermission("assets", "view_barcode"),
  validate(getBarcodeSchema),
  ctrl.generateBarcode
);

/**
 * GET /api/assets/:id/qrcode
 * Generate QR code for asset
 */
router.get(
  "/:id/qrcode",
  verifyJwt,
  requirePermission("assets", "view_barcode"),
  validate(getBarcodeSchema),
  ctrl.generateQRCode
);

/**
 * POST /api/assets/:id/assign
 * Assign asset to employee
 */
router.post(
  "/:id/assign",
  verifyJwt,
  requirePermission("assets", "assign"),
  validate(assignAssetSchema),
  ctrl.assignAsset
);

/**
 * POST /api/assets/:id/return
 * Return asset from employee
 */
router.post(
  "/:id/return",
  verifyJwt,
  requirePermission("assets", "assign"),
  validate(returnAssetSchema),
  ctrl.returnAsset
);

/**
 * GET /api/assets/:id/accessories
 * Get active accessories assigned with this asset
 */
router.get(
  "/:id/accessories",
  verifyJwt,
  requirePermission("assets", "view"),
  validate(getAccessoriesSchema),
  ctrl.getAssetAccessories
);

/**
 * POST /api/assets/:id/swap
 * Swap asset
 */
router.post(
  "/:id/swap",
  verifyJwt,
  requirePermission("assets", "assign"),
  validate(swapAssetSchema),
  ctrl.swapAsset
);

/**
 * GET /api/assets/:id/tracking
 * Get asset tracking events
 */
router.get(
  "/:id/tracking",
  verifyJwt,
  requirePermission("assets", "view_tracking"),
  validate(getTrackingSchema),
  ctrl.getAssetTracking
);

/**
 * GET /api/assets/:id/usage-history
 * Get asset usage history
 */
router.get(
  "/:id/usage-history",
  verifyJwt,
  requirePermission("assets", "view_tracking"),
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
 * Submit new asset request (Anyone can request if authed)
 */
router.post(
  "/requests/create",
  verifyJwt,
  validate(createAssetRequestSchema),
  ctrl.createAssetRequest
);

/**
 * GET /api/assets/requests/list
 * List all asset requests (Filtering logic in controller)
 */
router.get(
  "/requests/list",
  verifyJwt,
  ctrl.listAssetRequests
);

/**
 * POST /api/assets/requests/:id/handle
 * Approve or Reject asset request
 */
router.post(
  "/requests/:id/handle",
  verifyJwt,
  requirePermission("assets", "manage_requests"),
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
