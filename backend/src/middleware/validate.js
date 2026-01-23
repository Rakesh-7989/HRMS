
const { BadRequestError } = require('../utils/customErrors');

module.exports = function validate(schema) {
    return (req, res, next) => {
        const data = {
            body: req.body ?? {},
            query: req.query ?? {},
            params: req.params ?? {}
        };

        const result = schema.safeParse(data);

        if (!result.success) {
            return next(new BadRequestError('Validation failed', result.error.issues));
        }

        // overwrite with parsed data (strips unknowns)
        req.body = result.data.body ?? {};
        req.query = result.data.query ?? {};
        req.params = result.data.params ?? {};

        next();
    };
};
