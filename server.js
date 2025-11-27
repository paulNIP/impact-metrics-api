const express = require("express");
const cors = require("cors");
const pkg = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = pkg;

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
const pool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  user: "postgres",
  password: "@Opolo851990",
  database: "results",
});


// -------------------------
// Register user
// -------------------------
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
      [username, email, hashedPassword]
    );

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email
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
    const result = await pool.query("SELECT * FROM users WHERE username=$1", [
      username,
    ]);

    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      accessToken: token,
      tokenType: "Bearer",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});



// GET all budgets
app.get("/api/budgets", verifyToken,async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM s1_main ORDER BY prikey DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// GET budget by id
app.get("/api/budgets/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM s1_main WHERE prikey=$1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Budget not found" });
    res.json(result.rows[0]);
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
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(",");

  try {
    const result = await pool.query(
      `INSERT INTO s1_main (${fields.join(",")}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create budget" });
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

  const updates = fields.map((f, i) => `${f}=$${i+1}`).join(",");
  const values = fields.map(f => budget[f]);

  try {
    const result = await pool.query(
      `UPDATE s1_main SET ${updates} WHERE prikey=$${fields.length+1} RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Budget not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update budget" });
  }
});

// DELETE budget by id
app.delete("/api/budgets/:id",verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM s1_main WHERE prikey=$1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Budget not found" });
    res.json({ message: "Budget deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

app.post("/api/budgets/bulk-upload",verifyToken, async (req, res) => {

  try {
    const rows = req.body; // array of objects

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
    // Convert array → bulk values
    const values = rows
      .map((r) => `(
        '${r.Sphere}',
        '${r.FinancialYear}',
        '${r.TypeOfInfo}',
        '${r.FundType}',
        '${r.Vote_Code}',
        '${r.Vote_Name}',
        '${r.Sub_SubProgramme_Code}',
        '${r.Sub_SubProgramme_Name}',
        '${r.Service_Area_Code}',
        '${r.Service_Area_Name}',
        '${r.Programme_Code}',
        '${r.Programme_Name.replace(/'/g, "''")}',
        '${r.SubProgramme_Code}',
        '${r.SubProgramme_Name.replace(/'/g, "''")}',
        '${r.Budget_Output_Code}',
        '${r.Budget_Output_Description.replace(/'/g, "''")}',
        '${r.Project_Code}',
        '${r.Item_Code}',
        '${r.Item_Description.replace(/'/g, "''")}',
        '${r.FundingSourceCode}',
        '${r.FundingSource.replace(/'/g, "''")}',
        ${Number(r.Amount)}
      )`)
      .join(",");

    const query = `
      INSERT INTO s1_main (${columns.join(",")})
      VALUES ${values}
    `;

    await pool.query(query);

    // End of Insert
    
    res.json({ success: true, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to save CSV data" });
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
