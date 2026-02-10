const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function verifyDashboardStats() {
    try {
        console.log('1. Logging in as Tenant Admin...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'contact@seedtenant.com',
            password: 'Admin@123'
        });

        const token = loginResponse.data.accessToken;
        console.log('Login successful.');

        console.log('2. Fetching Organization Dashboard...');
        const dashboardResponse = await axios.get(`${API_URL}/dashboards/organization`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const metrics = dashboardResponse.data.data.orgMetrics;
        console.log('Dashboard Data Received:', metrics);

        // Verify properties exist
        const requiredProps = [
            'total_employees',
            'employee_growth',
            'active_employees',
            'active_employee_growth',
            'total_departments',
            'department_growth',
            'total_designations',
            'designation_growth'
        ];

        const missingProps = requiredProps.filter(prop => metrics[prop] === undefined);

        if (missingProps.length > 0) {
            console.error('FAILED: Missing properties in response:', missingProps);
            process.exit(1);
        }

        console.log('SUCCESS: All growth metrics are present.');
        console.log(`Employee Growth: ${metrics.employee_growth}% (Expected ~${metrics.total_employees * 100}%)`);
        console.log(`Active Employee Growth: ${metrics.active_employee_growth}%`);
        console.log(`Department Growth: ${metrics.department_growth}%`);
        console.log(`Designation Growth: ${metrics.designation_growth}%`);

    } catch (error) {
        console.error('Verification Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

verifyDashboardStats();
