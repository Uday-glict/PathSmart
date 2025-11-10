const mysql = require("mysql2/promise");
require("dotenv").config();
const fs = require("fs");


console.log(process.env.HOST,"process.env.HOST");
console.log(process.env.USERNAME,"process.env.USERNAME");
console.log(process.env.PASSWORD,"process.env.PASSWORD");
console.log(process.env.DATABASE,"process.env.DATABASE");
console.log(process.env.USERNAME,"process.env.USERNAME");
const pool = mysql.createPool({
  host: process.env.HOST,
  user: "freedb_freedb_pathaiuser",
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  queueLimit: 0
});

async function connectDB() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Successfully connected to the database.");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
}

module.exports = { pool, connectDB };
