const env = require('../config/env');

module.exports = (req, res, next) => {
    const whitelist = [env.FRONTEND_URL];
    if (env.NODE_ENV === 'development') {
        whitelist.push('http://localhost:5173', 'http://localhost:3000');
    }

    const origin = req.headers['origin'];
    const referer = req.headers['referer'];

    if (!origin && !referer) {
        return next();
    }

    const source = origin || referer;
    const allowed = whitelist.some(w => source.startsWith(w));

    if (!allowed) {
        return res.status(403).json({ status: 'error', message: 'Access denied: Invalid origin' });
    }

    next();
};
