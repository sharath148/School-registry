const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * ✅ Fetch Student Stats (For Teachers & Admins)
 */
router.get("/stats", authenticateToken, authorizeRoles(["Admin", "Teacher"]), async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required." });
    }

    const studentCountQuery = "SELECT COUNT(*) AS total_students FROM users WHERE role = 'Student'";
    const studentCountResult = await pool.query(studentCountQuery);

    const avgMarksQuery = `
      SELECT sub.subject_name, AVG(m.score) AS average_marks
      FROM marks m
      JOIN subjects sub ON m.subject_id = sub.id
      WHERE m.month = $1 AND m.year = $2
      GROUP BY sub.subject_name
      ORDER BY sub.subject_name;
    `;
    const avgMarksResult = await pool.query(avgMarksQuery, [month, year]);

    const topStudentsQuery = `
      SELECT DISTINCT ON (m.subject_id) 
        s.id AS student_id, 
        u.name AS student_name, 
        sub.subject_name, 
        m.score
      FROM marks m
      JOIN students s ON m.student_id = s.id  
      JOIN users u ON s.user_id = u.id        
      JOIN subjects sub ON m.subject_id = sub.id
      WHERE m.month = $1 AND m.year = $2
      ORDER BY m.subject_id, m.score DESC;
    `;
    const topStudentsResult = await pool.query(topStudentsQuery, [month, year]);

    res.json({
      total_students: studentCountResult.rows[0].total_students,
      average_marks: avgMarksResult.rows,
      top_students: topStudentsResult.rows,
    });
  } catch (error) {
    console.error("❌ Error fetching student stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ✅ Fetch Login Logs (For Admin)
 */
router.get("/login-logs", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
  try {
    const { start_date, end_date, role } = req.query;

    if (!start_date || !end_date || !role) {
      return res.status(400).json({ error: "Start date, end date, and role are required." });
    }

    const query = `
      SELECT u.id AS user_id, u.username, l.role, DATE(l.login_time) AS login_date, l.login_time
      FROM login_logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.role = $1 
      AND l.login_time::date BETWEEN $2 AND $3
      ORDER BY l.login_time DESC;
    `;

    const result = await pool.query(query, [role, start_date, end_date]);

    res.json({ login_logs: result.rows });

  } catch (error) {
    console.error("❌ Error fetching login logs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
