const { query } = require('../../middleware/db');
const env = require('../../config/env');

/**
 * Verify DBA password
 */
exports.verifyPassword = async (req, res) => {
    const { password } = req.body;

    if (password === env.DBA_PASSWORD) {
        return res.status(200).json({ status: 'success', message: 'Password verified' });
    }

    return res.status(401).json({ status: 'error', message: 'Invalid DBA Console password' });
};

/**
 * Get all tables in the public schema
 */
exports.getTables = async (req, res) => {
    try {
        const sql = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE' 
            ORDER BY table_name
        `;
        const result = await query(sql);
        const tables = result.rows.map(row => row.table_name);

        res.status(200).json({ status: 'success', tables });
    } catch (err) {
        console.error('Error fetching tables:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

/**
 * Get data from a specific table with limit
 */
exports.getTableData = async (req, res) => {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Basic validation to prevent obvious injection
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
        return res.status(400).json({ status: 'error', message: 'Invalid table name' });
    }

    try {
        // Get columns first
        const columnsSql = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1
            ORDER BY ordinal_position
        `;
        const columnsRes = await query(columnsSql, [tableName]);

        if (columnsRes.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Table not found' });
        }

        // Get data
        // Using double quotes for table name to handle case sensitivity if needed, though mostly standard names are lowercase
        const dataSql = `SELECT * FROM "${tableName}" LIMIT $1`;
        const dataRes = await query(dataSql, [limit]);

        res.status(200).json({
            status: 'success',
            columns: columnsRes.rows,
            rows: dataRes.rows,
            total: dataRes.rowCount
        });
    } catch (err) {
        console.error(`Error fetching data for table ${tableName}:`, err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

/**
 * Execute arbitrary SQL query
 */
exports.executeQuery = async (req, res) => {
    const { query: sqlQuery } = req.body;

    if (!sqlQuery) {
        return res.status(400).json({ status: 'error', message: 'Query is required' });
    }

    // Safety: restrict to SELECT-only queries for non-super-admin-like protection
    // Also block dangerous DDL/DML statements
    const normalized = sqlQuery.trim().toUpperCase();
    if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
        return res.status(400).json({
            status: 'error',
            message: 'Only SELECT queries are allowed for security reasons.'
        });
    }

    // Block dangerous patterns even in SELECT
    const dangerousPatterns = [/\b(PG_SLEEP|PG_READ_FILE|LOAD_FILE|INTO\s+OUTFILE|COPY\s+\()/i];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(sqlQuery)) {
            return res.status(400).json({
                status: 'error',
                message: 'Query contains blocked patterns for security reasons.'
            });
        }
    }

    const start = Date.now();
    try {
        const result = await query(sqlQuery);
        const duration = Date.now() - start;

        res.status(200).json({
            status: 'success',
            duration: `${duration}ms`,
            rowCount: result.rowCount,
            fields: result.fields ? result.fields.map(f => f.name) : [],
            rows: result.rows
        });
    } catch (err) {
        console.error('Error executing custom query:', err);
        res.status(400).json({
            status: 'error',
            message: 'Query execution failed'
        });
    }
};
