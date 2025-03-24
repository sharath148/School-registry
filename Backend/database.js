const { Pool } = require("pg");
require("dotenv").config();  // Load environment variables

// ✅ Use DATABASE_URL from .env for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL Database"))
  .catch(err => console.error("❌ Database connection failed:", err));

module.exports = pool;
