const express = require("express");
const cors = require("cors");
// const pkg = require("pg");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// const { Pool } = pkg;

const app = express();
app.use(express.json());
app.use(cors({
  origin: "*",
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization",
}));

// JWT secret key
const JWT_SECRET = "@Opolo851990"; // replace with env variable in production


// PostgreSQL connection
// const pool = new Pool({
//   host: "127.0.0.1",
//   port: 5432,
//   user: "postgres",
//   password: "@Opolo851990",
//   database: "results",
// });

//Mysql connection
// const pool = mysql.createPool({
//   host: "127.0.0.1",
//   user: "root",
//   password: "@Opolo851990",
//   database: "results",
//   waitForConnections: true,
//   connectionLimit: 10,
// });

const pool = mysql.createPool({
  host: "127.0.0.1",
  user: "opoliipj",
  password: "xFtE3H3eTjGt",
  database: "opoliipj_results",
  waitForConnections: true,
  connectionLimit: 10,
});


// -------------------------
// Register user
// -------------------------
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (username, email, password)
      VALUES (?, ?, ?)
    `;

    const [result] = await pool.query(sql, [username, email, hashedPassword]);

    res.json({
      id: result.insertId,
      username,
      email
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// -------------------------
// Login
// -------------------------
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  try {

    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    const user = rows[0];

    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      accessToken: token,
      tokenType: "Bearer"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});



// GET all budgets
app.get("/api/budgets", verifyToken,async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM s1_main ORDER BY prikey DESC");
    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// GET budget by id
app.get("/api/budgets/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {

    const [rows] = await pool.query("SELECT * FROM s1_main WHERE prikey = ?", [id]);

    if (rows.length === 0)
      return res.status(404).json({ error: "Budget not found" });

    res.json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// CREATE new budget
app.post("/api/budgets", verifyToken, async (req, res) => {
  const budget = req.body;

  const fields = [
    "registrationdate",
    "sphere",
    "financialyear",
    "typeofinfo",
    "fundtype",
    "vote_code",
    "vote_name",
    "sub_subprogramme_code",
    "sub_subprogramme_name",
    "service_area_code",
    "service_area_name",
    "programme_code",
    "programme_name",
    "subprogramme_code",
    "subprogramme_name",
    "budget_output_code",
    "budget_output_description",
    "project_code",
    "item_code",
    "item_description",
    "fundingsourcecode",
    "fundingsource",
    "amount"
  ];

  const values = fields.map(f => budget[f]);
  const placeholders = fields.map(() => "?").join(",");

  try {
    const sql = `INSERT INTO s1_main (${fields.join(",")}) VALUES (${placeholders})`;
    const [result] = await pool.query(sql, values);

    const [newRow] = await pool.query("SELECT * FROM s1_main WHERE prikey = ?", [result.insertId]);

    res.json(newRow[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert failed" });
  }
});

// UPDATE budget by id
app.put("/api/budgets/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const budget = req.body;

  const fields = [
    "registrationdate",
    "sphere",
    "financialyear",
    "typeofinfo",
    "fundtype",
    "vote_code",
    "vote_name",
    "sub_subprogramme_code",
    "sub_subprogramme_name",
    "service_area_code",
    "service_area_name",
    "programme_code",
    "programme_name",
    "subprogramme_code",
    "subprogramme_name",
    "budget_output_code",
    "budget_output_description",
    "project_code",
    "item_code",
    "item_description",
    "fundingsourcecode",
    "fundingsource",
    "amount"
  ];

  const updates = fields.map(f => `${f} = ?`).join(",");
  const values = fields.map(f => budget[f]);

  try {
    const sql = `UPDATE s1_main SET ${updates} WHERE prikey = ?`;
    await pool.query(sql, [...values, id]);

    const [updatedRow] = await pool.query("SELECT * FROM s1_main WHERE prikey = ?", [id]);
    res.json(updatedRow[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE budget by id
app.delete("/api/budgets/:id",verifyToken, async (req, res) => {

  const { id } = req.params;
  try {
    const [rows] = await pool.query("DELETE FROM s1_main WHERE prikey = ?", [id]);

    res.json({ message: "Budget deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }

});

app.post("/api/budgets/bulk-upload",verifyToken, async (req, res) => {

  try {
    const rows = req.body;

    const columns = [
      "sphere",
      "financialyear",
      "typeofinfo",
      "fundtype",
      "vote_code",
      "vote_name",
      "sub_subprogramme_code",
      "sub_subprogramme_name",
      "service_area_code",
      "service_area_name",
      "programme_code",
      "programme_name",
      "subprogramme_code",
      "subprogramme_name",
      "budget_output_code",
      "budget_output_description",
      "project_code",
      "item_code",
      "item_description",
      "fundingsourcecode",
      "fundingsource",
      "amount",
    ];

    const values = rows.map(r => [
      r.Sphere,
      r.FinancialYear,
      r.TypeOfInfo,
      r.FundType,
      r.Vote_Code,
      r.Vote_Name,
      r.Sub_SubProgramme_Code,
      r.Sub_SubProgramme_Name,
      r.Service_Area_Code,
      r.Service_Area_Name,
      r.Programme_Code,
      r.Programme_Name,
      r.SubProgramme_Code,
      r.SubProgramme_Name,
      r.Budget_Output_Code,
      r.Budget_Output_Description,
      r.Project_Code,
      r.Item_Code,
      r.Item_Description,
      r.FundingSourceCode,
      r.FundingSource,
      Number(r.Amount),
    ]);

    const placeholders = values.map(() => "(" + columns.map(() => "?").join(",") + ")").join(",");

    const sql = `
      INSERT INTO s1_main (${columns.join(",")})
      VALUES ${placeholders}
    `;

    await pool.query(sql, values.flat());

    res.json({ success: true, count: rows.length });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Bulk upload failed" });
  }

});




// -------------------------
// Middleware to verify JWT
// -------------------------
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

app.listen(4000, () => console.log("Server running on http://localhost:4000"));
