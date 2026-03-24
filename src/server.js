const express = require("express");
const mysql = require("mysql2/promise");
const app = express();
const PORT = 3000;

app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'secret',
  database: process.env.DB_NAME || 'docker_lab',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: "ok",
      container: require("os").hostname(),
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({
      status: "error",
      message: e.message,
      container: require("os").hostname()
    });
  }
});

app.get("/api/items", async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM items');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/items", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      return res.status(400).json({ error: "name and description are required" });
    }
    const [result] = await pool.query(
      'INSERT INTO items (name, description) VALUES (?, ?)',
      [name, description]
    );
    res.status(201).json({
      id: result.insertId,
      name,
      description
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
  console.log(`Container hostname: ${require("os").hostname()}`);
});
