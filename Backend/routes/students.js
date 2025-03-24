const express = require("express"); 
const router = express.Router();
const { Pool } = require("pg");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ✅ Fetch All Students (Admin & Teacher Only)
router.get("/", authenticateToken, authorizeRoles(["Admin", "Teacher"]), async (req, res) => {
  try {
    console.log("✅ Fetching all students - Requested by:", req.user.role);
    
    const result = await pool.query(
      `SELECT id, name, username FROM students`
    );

    if (result.rows.length === 0) {
      console.warn("⚠️ No students found.");
    }

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching students:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Fetch Student ID by Username (For Student Dashboard)
router.get("/:username", authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    console.log("🔍 Fetching student ID for:", username);

    const studentQuery = `
      SELECT id AS student_id FROM students WHERE user_id = (SELECT id FROM users WHERE username = $1)
    `;
    const result = await pool.query(studentQuery, [username]);

    if (result.rows.length === 0) {
      console.warn("⚠️ No student found with username:", username);
      return res.status(404).json({ error: "Student not found" });
    }

    console.log("✅ Student ID found:", result.rows[0]);
    res.json(result.rows[0]); // Return student_id
  } catch (error) {
    console.error("❌ Error fetching student ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
