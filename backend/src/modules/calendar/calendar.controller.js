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
        logger.error(`[CalendarController] getCalendar Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getCompanyHolidays = async (req, res) => {
    try {
        const data = await calendarService.getCompanyHolidays(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[CalendarController] getCompanyHolidays Error: ${error.message}`, error);
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
        logger.error(`[CalendarController] createCompanyHoliday Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.deleteCompanyHoliday = async (req, res) => {
    try {
        await calendarService.deleteCompanyHoliday(req.db, req.user.tenantId, req.params.id);
        res.json({ status: "success", message: "Company holiday deleted" });
    } catch (error) {
        logger.error(`[CalendarController] deleteCompanyHoliday Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.getStates = async (req, res) => {
    try {
        const data = await calendarService.getStates(req.db);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[CalendarController] getStates Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createStateHoliday = async (req, res) => {
    try {
        const { state, date, holiday_name } = req.body;
        const data = await calendarService.createStateHoliday(req.db, state, date, holiday_name);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[CalendarController] createStateHoliday Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

// Announcements
exports.getAnnouncements = async (req, res) => {
    try {
        const data = await calendarService.getAnnouncements(req.db, req.user.tenantId);
        res.json({ status: "success", data });
    } catch (error) {
        logger.error(`[CalendarController] getAnnouncements Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.createAnnouncement = async (req, res) => {
    try {
        const data = await calendarService.createAnnouncement(req.db, req.user.tenantId, req.user.id, req.body);
        res.status(201).json({ status: "success", data });
    } catch (error) {
        logger.error(`[CalendarController] createAnnouncement Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.deleteAnnouncement = async (req, res) => {
    try {
        await calendarService.deleteAnnouncement(req.db, req.user.tenantId, req.params.id);
        res.json({ status: "success", message: "Announcement deleted" });
    } catch (error) {
        logger.error(`[CalendarController] deleteAnnouncement Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};

exports.bulkImportHolidays = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: "error", message: "Please upload an Excel file (.xlsx or .xls)" });
        }

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];

        const headerRow = worksheet.getRow(1);
        const headers = [];
        headerRow.eachCell({ includeEmpty: false }, (cell) => {
          headers.push(cell.value);
        });

        const rows = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowData = {};
          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header !== undefined) {
              rowData[header] = cell.value !== undefined ? cell.value : '';
            }
          });
          rows.push(rowData);
        });

        if (!rows.length) {
            return res.status(400).json({ status: "error", message: "Excel file is empty" });
        }

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

            let parsedDate;
            if (typeof rawDate === 'number') {
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
        logger.error(`[CalendarController] bulkImportHolidays Error: ${error.message}`, error);
        res.status(400).json({ status: "error", message: error.message });
    }
};
