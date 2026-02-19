const express = require("express");
const ctrl = require("./asset_management.controller");
const validate = require("../../middleware/validate");
const verifyJwt = require("../../middleware/verifyJwt");
const { requirePermission, requireAnyPermission } = require("../../middleware/requirePermission");

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
  requirePermission("manage_all_assets"),
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
  requireAnyPermission(["view_assets"]),
  validate(listAssetsSchema),
  ctrl.listAssets
);

/**
 * GET /api/assets/:id
 * Get asset details by ID
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (own assets only)
 */
router.get(
  "/list/:id",
  verifyJwt,
  requireAnyPermission(["view_assets"]),
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
  requirePermission("manage_all_assets"),
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
  requirePermission("manage_all_assets"),
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
  requireAnyPermission(["manage_all_assets"]),
  validate(getBarcodeSchema),
  ctrl.generateBarcode
);

/**
 * POST /api/assets/:id/assign
 * Assign asset to employee
 * Requires: ADMIN, HR
 */
router.post(
  "/:id/assign",
  verifyJwt,
  requireAnyPermission(["manage_all_assets"]),
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
  requireAnyPermission(["manage_all_assets"]),
  validate(returnAssetSchema),
  ctrl.returnAsset
);

/**
 * GET /api/assets/:id/tracking
 * Get asset tracking events
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (own assets only)
 */
router.get(
  "/:id/tracking",
  verifyJwt,
  requireAnyPermission(["manage_all_assets"]),
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
  requireAnyPermission(["manage_all_assets"]),
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
  requireAnyPermission(["manage_all_assets"]),
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
