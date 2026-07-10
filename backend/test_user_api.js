const userService = require("./src/modules/users/user.service");
const db = require("./src/config/db");

async function test() {
    try {
        // Find a user to test with
        const users = await db.query("SELECT id, tenant_id FROM users LIMIT 1");
        if (users.rowCount === 0) {
            console.log("No users found to test with.");
            return;
        }
        const user = users.rows[0];
        console.log(`Testing with user ID: ${user.id}`);

        console.log("Testing getMyProfile...");
        const profile = await userService.getMyProfile(db, user);
        console.log("Profile fetched successfully");

        console.log("Testing getUserById...");
        const userDetails = await userService.getUserById(db, user.id, user.tenant_id);
        console.log("User details fetched successfully");

    } catch (err) {
        console.error("Test failed:", err.message);
    } finally {
        process.exit();
    }
}

test();
