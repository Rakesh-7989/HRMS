/**
 * Controller for common/utility operations.
 */
const mailer = require('../../config/mailer');


/**
 * Generate a local list of IANA timezones using Node's built-in Intl API.
 * This serves as a reliable fallback when the external TimezoneDB API is unavailable.
 */
const getLocalTimezones = () => {
    const ianaNames = Intl.supportedValuesOf('timeZone');
    const now = new Date();

    return ianaNames.map(name => {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: name,
                timeZoneName: 'longOffset'
            });
            const parts = formatter.formatToParts(now);
            const offsetPart = parts.find(p => p.type === 'timeZoneName');
            const gmtOffset = offsetPart?.value || 'GMT';

            return {
                zoneName: name,
                gmtOffsetName: gmtOffset.replace('GMT', 'UTC'),
            };
        } catch {
            return { zoneName: name, gmtOffsetName: 'UTC+00:00' };
        }
    });
};

exports.getTimezones = async (req, res) => {
    try {
        const apiKey = process.env.TIMEZONEDB_API_KEY;

        if (apiKey) {
            try {
                const apiUrl = `http://api.timezonedb.com/v2.1/list-timezones?key=${apiKey}&format=json`;
                const response = await fetch(apiUrl);
                const data = await response.json();

                if (data && data.status === 'OK') {
                    return res.json(data);
                }
            } catch (extError) {
                console.warn('External TimezoneDB API failed, using local fallback:', extError.message);
            }
        }

        // Fallback: serve local IANA timezones
        const zones = getLocalTimezones();
        return res.json({
            status: 'OK',
            message: 'Local IANA timezones',
            zones
        });

    } catch (error) {
        console.error('Error in getTimezones:', error.message);
        return res.status(500).json({
            status: 'ERROR',
            message: 'Failed to fetch timezones'
        });
    }
};

/**
 * Handle Contact Sales Form Submission
 */
exports.handleContactSales = async (req, res) => {
    try {
        const { fullName, workEmail, company, teamSize, phoneNumber, message } = req.body;

        // Basic validation
        if (!fullName || !workEmail || !company || !phoneNumber || !message) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'All fields (Full Name, Work Email, Company, Phone Number, and Message) are required.'
            });
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(workEmail)) {
             return res.status(400).json({
                status: 'ERROR',
                message: 'Please provide a valid email address.'
            });
        }
        
        // Basic phone validation (allowing digits, spaces, +, -, or ())
        const phoneRegex = /^[\d\s\+\-\(\)]+$/;
        if (!phoneRegex.test(phoneNumber) || phoneNumber.replace(/\D/g, '').length < 7) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'Please provide a valid phone number.'
            });
        }

        // Send the email using the mailer utility
        await mailer.sendContactSalesEmail({ fullName, workEmail, company, teamSize, phoneNumber, message });

        return res.status(200).json({
            status: 'OK',
            message: 'Inquiry sent successfully.'
        });

    } catch (error) {
        console.error('Error handling contact sales inquiry:', error.message);
        return res.status(500).json({
            status: 'ERROR',
            message: 'Failed to process inquiry.'
        });
    }
};

