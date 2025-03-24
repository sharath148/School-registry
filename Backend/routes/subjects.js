const express = require("express");
const { Pool } = require("pg");

const router = express.Router();

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// 1️⃣ GET all subjects
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM subjects");
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2️⃣ GET a single subject by ID
router.get("/:id", async (req, res) => {
    const subjectId = req.params.id;
    try {
        const result = await pool.query("SELECT * FROM subjects WHERE id = $1", [subjectId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Subject not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3️⃣ POST (Add a new subject)
router.post("/", async (req, res) => {
    const { subject_name } = req.body;
    if (!subject_name) {
        return res.status(400).json({ message: "Subject name is required" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO subjects (subject_name) VALUES ($1) RETURNING *",
            [subject_name]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4️⃣ PUT (Update a subject)
router.put("/:id", async (req, res) => {
    const { subject_name } = req.body;
    const subjectId = req.params.id;

    try {
        const result = await pool.query(
            "UPDATE subjects SET subject_name = $1 WHERE id = $2 RETURNING *",
            [subject_name, subjectId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Subject not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 5️⃣ DELETE (Remove a subject)
router.delete("/:id", async (req, res) => {
    const subjectId = req.params.id;

    try {
        const result = await pool.query("DELETE FROM subjects WHERE id = $1 RETURNING *", [subjectId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Subject not found" });
        }

        res.json({ message: "Subject deleted", subject: result.rows[0] });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Export the router
module.exports = router;
