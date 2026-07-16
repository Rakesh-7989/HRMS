const pool = require("../config/db");

/**
 * Middleware to check if the user's tenant has access to a specific feature.
 * @param {string} featureKey The unique key for the feature (e.g., 'payroll.full_access')
 */
const planGuard = (featureKey) => {
    return async (req, res, next) => {
        try {
            const planType = req.user.planType;

            // Super admin bypasses all plan checks
            if (req.user.role === 'SUPER_ADMIN') {
                return next();
            }

            // Check feature matrix in DB
            const result = await pool.query(
                `SELECT is_enabled FROM feature_permissions 
                 WHERE plan_type = $1 AND feature_key = $2`,
                [planType, featureKey]
            );

            if (result.rowCount === 0) {
                // Feature not defined for this plan, default to disabled for safety
                return res.status(403).json({
                    status: 'error',
                    code: 'FEATURE_RESTRICTED',
                    message: `Your current subscription plan does not support this feature (${featureKey}). Please upgrade.`
                });
            }

            if (!result.rows[0].is_enabled) {
                return res.status(403).json({
                    status: 'error',
                    code: 'FEATURE_RESTRICTED',
                    message: "Your current subscription plan does not support this feature. Please upgrade."
                });
            }

            next();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("PlanGuard Error:", error);
            res.status(500).json({ status: 'error', message: 'Internal Server Error during plan check' });
        }
    };
};

module.exports = planGuard;
