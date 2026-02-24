/**
 * Controller for common/utility operations.
 */
exports.getTimezones = async (req, res) => {
    try {
        const apiKey = process.env.TIMEZONEDB_API_KEY;

        if (!apiKey) {
            console.warn('TIMEZONEDB_API_KEY not found in environment.');
            return res.status(500).json({
                status: 'ERROR',
                message: 'Internal configuration error: API Key missing'
            });
        }

        // Fetch from TimezoneDB using native fetch
        const apiUrl = `http://api.timezonedb.com/v2.1/list-timezones?key=${apiKey}&format=json`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data && data.status === 'OK') {
            return res.json(data);
        } else {
            throw new Error(data.message || 'Failed to fetch from TimezoneDB');
        }
    } catch (error) {
        console.error('Error fetching timezones from external API:', error.message);

        return res.status(500).json({
            status: 'ERROR',
            message: 'Failed to fetch external timezones'
        });
    }
};
