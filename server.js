const express = require("express");
const cors = require("cors");
const pkg = require("pg");
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  user: "postgres",
  password: "@Opolo851990",
  database: "results",
});

// API endpoint
app.get("/api/draft-lg-budget", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM s1_main ");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

app.listen(4000, () => console.log("Server running on http://localhost:4000"));
