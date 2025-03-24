const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// ✅ Improved CORS Configuration
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// ✅ Import Routes
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const dashboardRoutes = require("./routes/dashboard");
const marksRoutes = require("./routes/marks");
const usersRoutes = require("./routes/users");
const subjectsRoutes = require("./routes/subjects");

// ✅ Use Routes (Fixed Incorrect Router Usage)
app.use("/auth", authRoutes);
app.use("/students", studentRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/marks", marksRoutes);
app.use("/users", usersRoutes);
app.use("/subjects", subjectsRoutes);
app.use('/subjects', require('./routes/subjects'));


// ✅ Root Endpoint for Debugging
app.get("/", (req, res) => {
  res.send("✅ Server is running!");
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
