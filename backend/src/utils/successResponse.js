// src/utils/successResponse.js

/**
 * Send a standardized success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
exports.success = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

/**
 * Send a paginated success response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 */
exports.successWithPagination = (res, data, pagination, message = 'Success') => {
    return res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            page: pagination.page || 1,
            limit: pagination.limit || 10,
            total: pagination.total || 0,
            totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
        }
    });
};

/**
 * Send a created resource response
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 */
exports.created = (res, data, message = 'Resource created successfully') => {
    return res.status(201).json({
        success: true,
        message,
        data
    });
};

/**
 * Send a no content response
 * @param {Object} res - Express response object
 */
exports.noContent = (res) => {
    return res.status(204).send();
};

/**
 * Build pagination metadata from query parameters
 * @param {Object} query - Request query object
 * @param {number} total - Total number of records
 * @returns {Object} Pagination metadata
 */
exports.buildPaginationMeta = (query, total) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;

    return {
        page,
        limit,
        offset,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
    };
};
