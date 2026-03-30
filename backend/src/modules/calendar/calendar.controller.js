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
        const { date, holiday_name, state } = req.body;
        const data = await calendarService.createCompanyHoliday(
            req.db,
            req.user.tenantId,
            date,
            holiday_name,
            state
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

exports.bulkImportHolidays = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: "error", message: "Please upload an Excel file (.xlsx or .xls)" });
        }

        const XLSX = require('xlsx');
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows.length) {
            return res.status(400).json({ status: "error", message: "Excel file is empty" });
        }

        // Try to find the date and name columns (flexible matching)
        const firstRow = rows[0];
        const keys = Object.keys(firstRow);
        
        const dateKey = keys.find(k => /date/i.test(k)) || keys[0];
        const nameKey = keys.find(k => /holiday|name|description/i.test(k)) || keys[1];
        const stateKey = keys.find(k => /region|state|location/i.test(k));

        if (!dateKey || !nameKey) {
            return res.status(400).json({
                status: "error",
                message: "Excel must have at least 2 columns (Date, Holiday Name). Found columns: " + keys.join(', ')
            });
        }

        // Parse and validate rows
        const holidays = [];
        const errors = [];

        rows.forEach((row, index) => {
            const rawDate = row[dateKey];
            const name = String(row[nameKey] || '').trim();
            const state = stateKey ? String(row[stateKey] || '').trim() : null;

            if (!rawDate || !name) {
                errors.push(`Row ${index + 2}: Missing date or holiday name`);
                return;
            }

            // Parse date — handle Excel serial numbers and string dates
            let parsedDate;
            if (typeof rawDate === 'number') {
                // Excel serial date number
                const excelEpoch = new Date(1899, 11, 30);
                parsedDate = new Date(excelEpoch.getTime() + rawDate * 86400000);
            } else {
                parsedDate = new Date(rawDate);
            }

            if (isNaN(parsedDate.getTime())) {
                errors.push(`Row ${index + 2}: Invalid date "${rawDate}"`);
                return;
            }

            const dateStr = parsedDate.toISOString().split('T')[0];
            holidays.push({ date: dateStr, holiday_name: name, state });
        });

        if (holidays.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "No valid holidays found in the file",
                errors
            });
        }

        const result = await calendarService.bulkImportHolidays(req.db, req.user.tenantId, holidays);

        res.status(200).json({
            status: "success",
            message: `Successfully imported ${result.imported} holidays for year(s) ${result.years.join(', ')}`,
            data: {
                imported: result.imported,
                years: result.years,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (error) {
        logger.error("Bulk import holidays error:", error.message);
        res.status(400).json({ status: "error", message: error.message });
    }
};
