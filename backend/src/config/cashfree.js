const { Cashfree, CFEnvironment } = require('cashfree-pg');

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = CFEnvironment[process.env.CASHFREE_ENVIRONMENT || 'SANDBOX'];

module.exports = Cashfree;
