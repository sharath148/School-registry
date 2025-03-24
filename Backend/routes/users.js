const express = require("express");
const router = express.Router();
const pool = require("../database");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// ✅ Fetch All Users (Only Admins Can View Users)
router.get("/", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    try {
        const users = await pool.query("SELECT name, username, role FROM users");
        res.json(users.rows);
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Add a New User (Admin Only)
router.post("/add", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    const { name, role, username, password } = req.body;

    if (!name || !role || !username || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Insert into users table first and retrieve the inserted user's ID
        const result = await pool.query(
            `INSERT INTO users (name, role, username, password) VALUES ($1, $2, $3, $4) RETURNING id`,
            [name, role, username, password]
        );

        const userId = result.rows[0].id;

        // If role is student, insert into students table as well
        if (role.toLowerCase() === "student") {
            await pool.query(
                `INSERT INTO students (user_id, name, username) VALUES ($1, $2, $3)`,
                [userId, name, username]
            );
        }

        res.status(201).json({ message: "User added successfully" });
    } catch (error) {
        console.error("❌ Error adding user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Delete a User (Admin Only)
router.delete("/delete/:username", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    const { username } = req.params;

    try {
        // First, delete from students table if the username exists
        await pool.query(`DELETE FROM students WHERE username = $1`, [username]);

        // Then, delete from users table
        const result = await pool.query(
            `DELETE FROM users WHERE username = $1 RETURNING *`,
            [username]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
