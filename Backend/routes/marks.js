const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const { authenticateToken } = require("../middleware/auth");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ==============================
//  1) Fetch Marks by Username (with optional filters)
// ==============================
router.get("/student/:username", authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const { subject_id, month, year } = req.query;
    console.log(`🔍 Fetching marks for Username: ${username}, Subject: ${subject_id}, Month: ${month}, Year: ${year}`);

    // ✅ Convert username to student_id
    
    const studentQuery = `
  SELECT s.id AS student_id, u.username
  FROM students s
  JOIN users u ON s.user_id = u.id
  WHERE LOWER(u.username) = LOWER($1)
`;

  
    const studentResult = await pool.query(studentQuery, [username]);

    if (studentResult.rows.length === 0) {
      console.warn(`⚠️ No student found for Username: ${username}`);
      return res.status(404).json({ error: "Student not found" });
    }

    const student_id = studentResult.rows[0].student_id;

    // ✅ Build the query dynamically
    let marksQuery = `
      SELECT m.id, sub.subject_name, m.subject_id, m.month, m.year, m.score
      FROM marks m
      JOIN subjects sub ON m.subject_id = sub.id
      WHERE m.student_id = $1
    `;
    const queryParams = [student_id];
    let paramIndex = 2;

    if (subject_id) {
      marksQuery += ` AND m.subject_id = $${paramIndex++}`;
      queryParams.push(subject_id);
    }

    if (month) {
      marksQuery += ` AND m.month = $${paramIndex++}`;
      queryParams.push(month);
    }

    if (year) {
      marksQuery += ` AND m.year = $${paramIndex}`;
      queryParams.push(year);
    }

    const marksResult = await pool.query(marksQuery, queryParams);

    if (marksResult.rows.length === 0) {
      console.warn(`⚠️ No marks found for Student ID: ${student_id}`);
      return res.status(404).json({ error: "No marks found for this student with the selected filters." });
    }

    res.json(marksResult.rows);
  } catch (error) {
    console.error("❌ Error fetching marks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==============================
//  2) Add or Update Mark
// ==============================
router.post("/add", authenticateToken, async (req, res) => {
  const { username, subject_id, month, year, score } = req.body;

  if (!username || !subject_id || !month || !year || !score) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const studentQuery = `
      SELECT s.id AS student_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE u.username = $1
    `;
    const studentResult = await pool.query(studentQuery, [username]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student_id = studentResult.rows[0].student_id;

    const existingMarkQuery = `
      SELECT id FROM marks
      WHERE student_id = $1 AND subject_id = $2 AND month = $3 AND year = $4
    `;
    const existingMarkResult = await pool.query(existingMarkQuery, [student_id, subject_id, month, year]);

    if (existingMarkResult.rows.length > 0) {
      const markId = existingMarkResult.rows[0].id;
      await pool.query("UPDATE marks SET score = $1 WHERE id = $2", [score, markId]);
      return res.json({ message: "Mark updated successfully", markId });
    } else {
      const insertResult = await pool.query(
        `INSERT INTO marks (student_id, subject_id, month, year, score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [student_id, subject_id, month, year, score]
      );
      return res.status(201).json({ message: "Mark added successfully", mark: insertResult.rows[0] });
    }
  } catch (error) {
    console.error("❌ Error adding/updating mark:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==============================
//  3) Update Mark
// ==============================
router.put("/update/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { score } = req.body;

  try {
    const result = await pool.query("UPDATE marks SET score = $1 WHERE id = $2 RETURNING *", [score, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Mark not found" });
    }

    res.json({ message: "Mark updated successfully", mark: result.rows[0] });
  } catch (error) {
    console.error("❌ Error updating mark:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==============================
//  4) Delete Mark
// ==============================
router.delete("/delete/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM marks WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Mark not found" });
    }

    res.json({ message: "Mark deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting mark:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==============================
//  5) Get Average Marks by Month (for Charts)
// ==============================
router.get("/average/:month", authenticateToken, async (req, res) => {
  const { month } = req.params;
  const { year } = req.query;  // Allow filtering by year if needed.

  try {
    let query = `
      SELECT sub.subject_name, AVG(m.score) AS average_score
      FROM marks m
      JOIN subjects sub ON m.subject_id = sub.id
      WHERE m.month = $1
    `;

    const queryParams = [month];

    // ✅ Add year filter if provided.
    if (year) {
      query += ` AND m.year = $2`;
      queryParams.push(year);
    }

    query += ` GROUP BY sub.subject_name`;

    const result = await pool.query(query, queryParams);

    res.json(result.rows || []);
  } catch (error) {
    console.error("❌ Error fetching average marks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
