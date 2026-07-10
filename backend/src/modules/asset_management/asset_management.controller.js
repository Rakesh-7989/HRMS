const assetService = require("./asset_management.service");
const { success } = require("../../utils/successResponse");
const logger = require("../../config/logger");

/**
 * CREATE ASSET
 * POST /api/assets
 * Requires: ADMIN, HR
 */
exports.createAsset = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const {
      asset_code,
      name,
      category,
      description,
      purchase_date,
      purchase_price,
      manufacturer,
      serial_number,
      warranty_expiry,
      status,
      notes,
      operating_system,
      processor_cpu,
      ram,
      storage,
      graphics_gpu,
      display,
      battery,
      model_number,
      useful_life_years,
      depreciation_method,
      location,
      condition
    } = req.body;

    const asset = await assetService.createAsset(tenantId, userId, {
      asset_code,
      name,
      category,
      description,
      purchase_date,
      purchase_price,
      manufacturer,
      serial_number,
      warranty_expiry,
      status,
      notes,
      operating_system,
      processor_cpu,
      ram,
      storage,
      graphics_gpu,
      display,
      battery,
      model_number,
      useful_life_years,
      depreciation_method,
      location,
      condition
    });

    return success(res, asset, "Asset created successfully", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * LIST ASSETS
 * GET /api/assets
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE
 */
exports.listAssets = async (req, res, next) => {
  try {
    const { tenantId, role, employeeId } = req.user;
    const { status, category, assigned_to, skip, limit } = req.query;

    const filters = {
      status,
      category,
      assigned_to,
      skip: parseInt(skip) || 0,
      limit: parseInt(limit) || 20
    };

    const result = await assetService.listAssets(
      tenantId,
      filters,
      role,
      employeeId
    );

    return res.status(200).json({
      success: true,
      message: "Assets retrieved successfully",
      data: result.assets,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET ASSET BY ID
 * GET /api/assets/:id
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (own assets only)
 */
exports.getAssetById = async (req, res, next) => {
  try {
    const { tenantId, role, employeeId } = req.user;
    const { id: assetId } = req.params;

    const asset = await assetService.getAssetById(
      tenantId,
      assetId,
      role,
      employeeId
    );

    return success(res, asset, "Asset retrieved successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE ASSET
 * PUT /api/assets/:id
 * Requires: ADMIN
 */
exports.updateAsset = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id: assetId } = req.params;
    const updates = req.body;

    const asset = await assetService.updateAsset(
      tenantId,
      assetId,
      userId,
      updates
    );

    return success(res, asset, "Asset updated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * RETIRE ASSET (Soft Delete)
 * DELETE /api/assets/:id
 * Requires: ADMIN
 */
exports.retireAsset = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id: assetId } = req.params;
    const { notes } = req.body;

    const asset = await assetService.retireAsset(
      tenantId,
      assetId,
      userId,
      notes
    );

    return success(res, asset, "Asset retired successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * GENERATE BARCODE
 * GET /api/assets/:id/barcode
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (own assets only)
 * Returns: Base64 encoded barcode image
 */
exports.generateBarcode = async (req, res, next) => {
  try {
    const { tenantId, role, employeeId } = req.user;
    const { id: assetId } = req.params;

    // Verify access to asset
    await assetService.getAssetById(tenantId, assetId, role, employeeId);

    const barcodeData = await assetService.generateBarcode(
      tenantId,
      assetId,
      "base64"
    );

    return success(
      res,
      barcodeData,
      "Barcode generated successfully"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GENERATE QR CODE
 * GET /api/assets/:id/qrcode
 * Returns: Base64 encoded QR code image
 */
exports.generateQRCode = async (req, res, next) => {
  try {
    const { tenantId, role, employeeId } = req.user;
    const { id: assetId } = req.params;

    // Verify access to asset
    await assetService.getAssetById(tenantId, assetId, role, employeeId);

    const qrData = await assetService.generateQRCode(tenantId, assetId);

    return success(res, qrData, "QR code generated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * ASSIGN ASSET
 * POST /api/assets/:id/assign
 * Requires: ADMIN, HR
 */
exports.assignAsset = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id: assetId } = req.params;
    const { employee_id, notes, accessories } = req.body;

    const asset = await assetService.assignAsset(
      tenantId,
      assetId,
      userId,
      employee_id,
      notes,
      accessories
    );

    return success(res, asset, "Asset assigned successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * RETURN ASSET
 * POST /api/assets/:id/return
 * Requires: ADMIN, HR
 */
exports.returnAsset = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id: assetId } = req.params;
    const { return_date, condition, notes, checklist } = req.body;

    const asset = await assetService.returnAsset(
      tenantId,
      assetId,
      userId,
      return_date,
      condition,
      notes,
      checklist
    );

    return success(res, asset, "Asset returned successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * GET ASSET TRACKING
 * GET /api/assets/:id/tracking
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (own assets only)
 * Returns: All tracking events for the asset
 */
exports.getAssetTracking = async (req, res, next) => {
  try {
    const { tenantId, role, employeeId } = req.user;
    const { id: assetId } = req.params;

    // Verify access to asset
    await assetService.getAssetById(tenantId, assetId, role, employeeId);

    const tracking = await assetService.getAssetTracking(tenantId, assetId);

    return success(
      res,
      tracking,
      "Asset tracking retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET ASSET USAGE HISTORY
 * GET /api/assets/:id/usage-history
 * Requires: ADMIN, HR, MANAGER, EMPLOYEE (own assets only)
 * Returns: Usage history entries
 */
exports.getAssetUsageHistory = async (req, res, next) => {
  try {
    const { tenantId, role, employeeId } = req.user;
    const { id: assetId } = req.params;

    // Verify access to asset
    await assetService.getAssetById(tenantId, assetId, role, employeeId);

    const usageHistory = await assetService.getAssetUsageHistory(
      tenantId,
      assetId
    );

    return success(
      res,
      usageHistory,
      "Asset usage history retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * CREATE ASSET REQUEST
 */
exports.createAssetRequest = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const request = await assetService.createAssetRequest(tenantId, userId, req.body);
    return success(res, request, "Asset request submitted successfully", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * LIST ASSET REQUESTS
 */
exports.listAssetRequests = async (req, res, next) => {
  try {
    const { tenantId, id: userId, role } = req.user;
    const requests = await assetService.listAssetRequests(tenantId, userId, role);
    return success(res, requests, "Asset requests retrieved successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * HANDLE ASSET REQUEST (Approve/Reject)
 */
exports.handleAssetRequest = async (req, res, next) => {
  try {
    const { tenantId, id: userId, role } = req.user;
    const { id: requestId } = req.params;
    const request = await assetService.handleAssetRequest(tenantId, requestId, userId, role, req.body);
    return success(res, request, `Asset request ${req.body.status.toLowerCase()} successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE ASSET REQUEST
 */
exports.updateAssetRequest = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id: requestId } = req.params;
    const request = await assetService.updateAssetRequest(tenantId, requestId, userId, req.body);
    return success(res, request, "Asset request updated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE ASSET REQUEST
 */
exports.deleteAssetRequest = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id: requestId } = req.params;
    await assetService.deleteAssetRequest(tenantId, requestId, userId);
    return success(res, null, "Asset request deleted successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * GET ASSET ACCESSORIES
 * GET /api/assets/:id/accessories
 * Returns active accessories assigned with this asset
 */
exports.getAssetAccessories = async (req, res, next) => {
  try {
    const { tenantId, role, employeeId } = req.user;
    const { id: assetId } = req.params;

    // Verify access to asset (enforces EMPLOYEE can only see own assets)
    await assetService.getAssetById(tenantId, assetId, role, employeeId);

    const accessories = await assetService.getAssetAccessories(tenantId, assetId);

    return success(res, accessories, "Asset accessories retrieved successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * SWAP ASSET
 * POST /api/assets/:id/swap
 * Atomically returns old asset and assigns new one to same employee
 */
exports.swapAsset = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { id: oldAssetId } = req.params;
    const { new_asset_id, return_condition, return_notes, checklist, new_accessories } = req.body;

    const result = await assetService.swapAsset(
      tenantId,
      userId,
      {
        old_asset_id: oldAssetId,
        new_asset_id,
        return_condition,
        return_notes,
        checklist,
        new_accessories
      }
    );

    return success(res, result, "Asset swapped successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * GET ASSET DASHBOARD
 * GET /api/assets/dashboard
 * Returns summary stats for asset management
 */
exports.getAssetDashboard = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const dashboard = await assetService.getAssetDashboard(tenantId);
    return success(res, dashboard, "Asset dashboard retrieved successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * EXPORT ASSETS CSV
 * GET /api/assets/export/csv
 * Returns all assets as downloadable CSV
 */
exports.exportAssetsCSV = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const csv = await assetService.exportAssetsCSV(tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=assets_export.csv');
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * GET WARRANTY ALERTS
 * GET /api/assets/warranty-alerts
 * Returns assets with warranty expiring soon
 */
exports.getWarrantyAlerts = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const days = parseInt(req.query.days) || 30;
    const alerts = await assetService.getWarrantyAlerts(tenantId, days);
    return success(res, alerts, "Warranty alerts retrieved successfully");
  } catch (error) {
    next(error);
  }
};
