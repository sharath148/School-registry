const express = require("express");
const pool = require("../database"); // ✅ Ensure database connection
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();
const router = express.Router();

// ✅ Login Route - Returns Teacher Name for Display
router.post("/login", async (req, res) => {
  try {
    console.log("🔍 Incoming Login Request:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      console.error("❌ Missing Credentials:", req.body);
      return res.status(400).json({ error: "Username and Password are required" });
    }

    // ✅ Query `users` table to get user details
    const userQuery = "SELECT id, name, username, password, role FROM users WHERE username = $1";
    const userResult = await pool.query(userQuery, [username]);

    if (userResult.rows.length === 0) {
      console.error("❌ No user found for:", username);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];

    // ✅ Simple Password Checking
    if (user.password !== password) {
      console.error("❌ Incorrect password for:", username);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ Assign Teacher Name from `users` table
    let displayName = user.name || user.username; // Use `name` if available, else fallback to `username`

    // ✅ Generate JWT Token with user details
    const payload = {
      userID: user.id,
      username: displayName, // ✅ Store Display Name in Token
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

    // ✅ Insert Login Log
    const logQuery = `INSERT INTO login_logs (user_id, role) VALUES ($1, $2)`;
    await pool.query(logQuery, [user.id, user.role]);
    console.log("🗃️ Login Log Inserted for:", displayName);

    console.log("✅ Login Success for:", displayName);
    console.log("🛠️ Generated JWT Token:", token);

    // ✅ Send `name` (or username if name is null) along with token to frontend
    res.json({ token, username: displayName, role: user.role });

  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
