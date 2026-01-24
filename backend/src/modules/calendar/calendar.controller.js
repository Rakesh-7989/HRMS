const calendarService = require("./calendar.service");
const logger = require("../../config/logger");

exports.getCalendar = async (req, res) => {
    try {
        const { month, year, state } = req.query;
        const data = await calendarService.getCalendar(
            req.db,
            req.user.tenantId,
            month,
            year,
            state
        );
        res.json({ status: "success", data });
    } catch (error) {
        logger.error("Get calendar error:", error.message);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getCompanyHolidays = async (req, res) => {
    try {
        const data = await calendarService.getCompanyHolidays(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createCompanyHoliday = async (req, res) => {
    try {
        const { date, holiday_name } = req.body;
        const data = await calendarService.createCompanyHoliday(
            req.db,
            req.user.tenantId,
            date,
            holiday_name
        );
        res.status(201).json({ status: "success", data });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.deleteCompanyHoliday = async (req, res) => {
    try {
        await calendarService.deleteCompanyHoliday(req.db, req.user.tenantId, req.params.id);
        res.json({ status: "success", message: "Company holiday deleted" });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getStates = async (req, res) => {
    try {
        const data = await calendarService.getStates(req.db);
        res.json({ status: "success", data });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createStateHoliday = async (req, res) => {
    try {
        // Restricted to ADMIN/SUPER_ADMIN locally
        const { state, date, holiday_name } = req.body;
        const data = await calendarService.createStateHoliday(req.db, state, date, holiday_name);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
};

// Announcements
exports.getAnnouncements = async (req, res) => {
    try {
        const data = await calendarService.getAnnouncements(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createAnnouncement = async (req, res) => {
    try {
        const data = await calendarService.createAnnouncement(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.deleteAnnouncement = async (req, res) => {
    try {
        await calendarService.deleteAnnouncement(req.db, req.user.tenantId, req.params.id);
        res.json({ status: "success", message: "Announcement deleted" });
    } catch (error) {
        res.status(400).json({ status: "error", message: error.message });
    }
};
