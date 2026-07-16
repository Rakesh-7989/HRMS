const asyncContext = require('../utils/asyncContext');

// Middleware to establish async context and set DB session variables for RLS
const dbSessionContext = async (req, res, next) => {
    const store = new Map();

    // populate async context values from req.user when available
    if (req.user) {
        if (req.user.role === 'SUPER_ADMIN') {
            store.set('tenantId', null);
            store.set('role', 'SUPER_ADMIN');
        } else {
            // Support both camelCase and snake_case for flexibility
            const tenantId = req.user.tenant_id || req.user.tenantId;
            store.set('tenantId', tenantId);
            store.set('role', req.user.role);
            if (req.user.id) store.set('userId', req.user.id);
            if (req.user.employeeId) store.set('employeeId', req.user.employeeId);
        }
    }

    // Run the request inside the async context
    asyncContext.run(store, async () => {
        try {
            // No need to run a query here. usage of pool.query later will automatically pickups
            // variables from asyncStorage via the db.js wrapper.
            // Explicitly setting it on a random connection that gets released immediately is useless.
        } catch (err) {
            // don't block request on session setup failure; log if logger available
            // eslint-disable-next-line no-console
            console.error('Failed to set DB session variables in dbSessionContext', err);
        }

        next();
    });
};

module.exports = dbSessionContext;
