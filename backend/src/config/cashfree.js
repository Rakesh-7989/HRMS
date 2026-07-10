const { Cashfree, CFEnvironment } = require('cashfree-pg');

const env = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION' 
    ? CFEnvironment.PRODUCTION 
    : CFEnvironment.SANDBOX;

const cashfree = new Cashfree();
cashfree.XClientId = process.env.CASHFREE_APP_ID;
cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
cashfree.XEnvironment = env;
cashfree.XApiVersion = "2023-08-01";

module.exports = cashfree;
