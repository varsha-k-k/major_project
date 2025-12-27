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
app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Welcome to the Smart Hospitality System API");
});

app.post("/api/bookings", async (req, res) => {
  const {
    hotel_id,
    room_id,
    guest_name,
    guest_phone,
    check_in,
    check_out
  } = req.body;

  try {
    const roomCheck = await db.query(
      "SELECT available_rooms FROM rooms WHERE room_id = $1 AND hotel_id = $2",
      [room_id, hotel_id]
    );

    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (roomCheck.rows[0].available_rooms <= 0) {
      return res.status(400).json({ message: "No rooms available" });
    }

    await db.query(
      `INSERT INTO bookings
       (hotel_id, room_id, guest_name, guest_phone, check_in_date, check_out_date)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [hotel_id, room_id, guest_name, guest_phone, check_in, check_out]
    );

    await db.query(
      "UPDATE rooms SET available_rooms = available_rooms - 1 WHERE room_id = $1",
      [room_id]
    );

    res.json({ message: "Booking confirmed" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
