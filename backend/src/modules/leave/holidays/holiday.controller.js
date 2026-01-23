const holidayService = require("./holiday.service");

exports.createPublicHoliday = async (req, res, next) => {
    try {
        const result = await holidayService.createPublicHoliday(null, req.body, req.user);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

exports.getPublicHolidays = async (req, res, next) => {
    try {
        const year = req.query.year ? parseInt(req.query.year) : null;
        const result = await holidayService.getPublicHolidays(null, req.user.tenantId, year);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.deletePublicHoliday = async (req, res, next) => {
    try {
        const result = await holidayService.deletePublicHoliday(null, req.params.id, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.uploadHolidaysCSV = async (req, res, next) => {
    try {
        const { holidays } = req.body;
        const result = await holidayService.uploadHolidaysCSV(null, holidays, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.createRestrictedHoliday = async (req, res, next) => {
    try {
        const result = await holidayService.createRestrictedHoliday(null, req.body, req.user);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

exports.getRestrictedHolidays = async (req, res, next) => {
    try {
        const year = req.query.year ? parseInt(req.query.year) : null;
        const result = await holidayService.getRestrictedHolidays(null, req.user.tenantId, year);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.claimRestrictedHoliday = async (req, res, next) => {
    try {
        const result = await holidayService.claimRestrictedHoliday(
            null, req.params.id, req.user.employeeId, req.user
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getMyRestrictedHolidayUsage = async (req, res, next) => {
    try {
        const year = req.query.year ? parseInt(req.query.year) : null;
        const result = await holidayService.getEmployeeRestrictedHolidayUsage(
            null, req.user.employeeId, req.user.tenantId, year
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.deleteRestrictedHoliday = async (req, res, next) => {
    try {
        const result = await holidayService.deleteRestrictedHoliday(null, req.params.id, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};
