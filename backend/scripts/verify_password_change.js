
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const SUPER_ADMIN_EMAIL = 'contact@seedtenant.com'; // Using Tenant Admin
const SUPER_ADMIN_PASSWORD = 'Admin@123';

async function verify() {
    try {
        // 1. Login as Super Admin
        console.log("1. Logging in as Super Admin...");
        let saToken;
        try {
            const saLogin = await axios.post(`${API_URL}/auth/login`, {
                email: SUPER_ADMIN_EMAIL,
                password: SUPER_ADMIN_PASSWORD
            });
            saToken = saLogin.data.accessToken;
            console.log("✓ Super Admin logged in");
        } catch (e) {
            console.error("Failed to login as super admin. Is the server running on port 5000?");
            console.error(e.message);
            if (e.response) console.error(e.response.data);
            process.exit(1);
        }

        // 2. Create New User
        console.log("\n2. Creating new user...");
        const timestamp = Date.now();
        const newUserEmail = `test_pwc_${timestamp}@example.com`;
        let tempPassword;
        let userId;

        try {
            const createRes = await axios.post(`${API_URL}/users`, {
                email: newUserEmail,
                role: "EMPLOYEE",
                first_name: "Test",
                last_name: "User",
                employee_id: `EMP-${timestamp}` // Ensure unique
            }, {
                headers: { Authorization: `Bearer ${saToken}` }
            });

            // user.controller.js returns { status: "success", data: { user, employee, temporaryPassword, ... } }
            tempPassword = createRes.data.data.temporaryPassword;
            userId = createRes.data.data.user.id;
            console.log(`✓ User created: ${newUserEmail}`);
            console.log(`✓ Temp Password: ${tempPassword}`);
        } catch (e) {
            console.error("Failed to create user:", e.response ? e.response.data : e.message);
            process.exit(1);
        }

        // 3. Login as New User (Verify mustChangePassword)
        console.log("\n3. Logging in as new user...");
        let userToken;
        try {
            const userLogin = await axios.post(`${API_URL}/auth/login`, {
                email: newUserEmail,
                password: tempPassword
            });

            if (userLogin.data.mustChangePassword === true) {
                console.log("✓ mustChangePassword is TRUE");
            } else {
                console.error("❌ mustChangePassword should be TRUE but is FALSE");
                process.exit(1);
            }
            userToken = userLogin.data.accessToken;
            console.log("✓ User logged in");
        } catch (e) {
            console.error("Failed to login as new user:", e.response ? e.response.data : e.message);
            process.exit(1);
        }

        // 4. Change Password - Mismatch (Fail)
        console.log("\n4. Testing password mismatch...");
        try {
            await axios.post(`${API_URL}/auth/change-password`, {
                currentPassword: tempPassword,
                newPassword: "NewPassword123!",
                confirmPassword: "MismatchPassword123!"
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            console.error("❌ Request succeded but should have failed!");
            process.exit(1);
        } catch (e) {
            const data = e.response ? e.response.data : {};
            if (e.response && e.response.status === 400) {
                if (data.message === "Validation failed" && data.details && JSON.stringify(data.details).includes("Passwords do not match")) {
                    console.log("✓ Request failed as expected with matching error (Zod)");
                } else if (data.message && data.message.includes("match")) {
                    console.log("✓ Request failed as expected with matching error (Manual)");
                } else {
                    console.error("❌ Request failed but with unexpected error:", data);
                    process.exit(1);
                }
            } else {
                console.error("❌ Request failed but with unexpected error:", data);
                process.exit(1);
            }
        }

        // 5. Change Password - Fail (Same Password)
        console.log("\n5. Testing same password validation...");
        try {
            await axios.post(`${API_URL}/auth/change-password`, {
                currentPassword: tempPassword,
                newPassword: tempPassword,
                confirmPassword: tempPassword
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            console.error("❌ Request succeded but should have failed (Same password)!");
            process.exit(1);
        } catch (e) {
            const data = e.response ? e.response.data : {};
            if (e.response && e.response.status === 400) {
                if (data.message === "Validation failed" && data.details && JSON.stringify(data.details).includes("same as current")) {
                    console.log("✓ Request failed as expected with same password error (Zod)");
                } else if (data.message && data.message.includes("same as current")) {
                    console.log("✓ Request failed as expected with same password error (Manual)");
                } else {
                    console.error("❌ Request failed but with unexpected error:", data);
                    process.exit(1);
                }
            } else {
                console.error("❌ Request failed but with unexpected error:", data);
                process.exit(1);
            }
        }

        // 6. Change Password - Success
        console.log("\n6. Changing password successfully...");
        const NEW_PASSWORD = "NewPassword123!";
        try {
            await axios.post(`${API_URL}/auth/change-password`, {
                currentPassword: tempPassword,
                newPassword: NEW_PASSWORD,
                confirmPassword: NEW_PASSWORD
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            console.log("✓ Password changed successfully");
        } catch (e) {
            console.error("Failed to change password:", e.response ? e.response.data : e.message);
            process.exit(1);
        }

        // 7. Login with New Password (Verify mustChangePassword)
        console.log("\n7. Logging in with new password...");
        try {
            const newLogin = await axios.post(`${API_URL}/auth/login`, {
                email: newUserEmail,
                password: NEW_PASSWORD
            });

            if (newLogin.data.mustChangePassword === false) {
                console.log("✓ mustChangePassword is now FALSE");
            } else {
                console.error("❌ mustChangePassword should be FALSE");
                process.exit(1);
            }
            console.log("✓ Login with new password successful");

        } catch (e) {
            console.error("Failed to login with new password:", e.response ? e.response.data : e.message);
            process.exit(1);
        }

        console.log("\nVerify Process Completed Successfully!");

    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

verify();
