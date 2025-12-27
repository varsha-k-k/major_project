import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import pg from "pg";

const app = express();
const port = 3000;

dotenv.config();

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Welcome to the Smart Hospitality System API");
});
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
