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
  createAssetRequestSchema,
  handleAssetRequestSchema
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

module.exports = router;
