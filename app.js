import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import pg from "pg";
import bcrypt from "bcrypt";

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



app.post("/api/hotels/register", async (req, res) => {
  const {
    hotel_name,
    location,
    address,
    contact_phone,
    contact_email,
    description,
    languages_supported,
    staff_name,
    staff_email,
    staff_password
  } = req.body;

  if (!hotel_name || !location || !contact_phone || !contact_email ||
      !staff_name || !staff_email || !staff_password) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  const slug = `${hotel_name}-${location}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  try {
    // Check duplicate hotel
    const existingHotel = await db.query(
      "SELECT hotel_id FROM hotels WHERE slug = $1",
      [slug]
    );

    if (existingHotel.rows.length > 0) {
      return res.status(409).json({ message: "Hotel already registered" });
    }

    // Hash staff password
    const hashedPassword = await bcrypt.hash(staff_password, 10);

    // Start transaction
    await db.query("BEGIN");

    // Insert hotel
    const hotelResult = await db.query(
      `INSERT INTO hotels
       (hotel_name, location, address, contact_phone, contact_email, description, languages_supported, slug)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING hotel_id`,
      [
        hotel_name,
        location,
        address,
        contact_phone,
        contact_email,
        description,
        languages_supported,
        slug
      ]
    );

    const hotel_id = hotelResult.rows[0].hotel_id;

    // Insert staff user (hotel owner)
    await db.query(
      `INSERT INTO staff_users
       (hotel_id, name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,'admin')`,
      [hotel_id, staff_name, staff_email, hashedPassword]
    );

    // Commit transaction
    await db.query("COMMIT");

    res.status(201).json({
      message: "Hotel and staff account created successfully",
      hotel_id,
      staff_login: "/staff-login",
      hotel_page: `/hotel/${slug}`
    });

  } catch (err) {
    await db.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



app.get("/api/hotels/search", async (req, res) => {
  const searchQuery = req.query.q;

  if (!searchQuery) {
    return res.status(400).json({
      message: "Search query is required"
    });
  }

  try {
    const result = await db.query(
      `SELECT hotel_id, hotel_name, location, slug
       FROM hotels
       WHERE hotel_name ILIKE $1
          OR location ILIKE $1`,
      [`%${searchQuery}%`]
    );

    res.json({
      results: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});



app.get("/api/hotels/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    // Fetch hotel details
    const hotelResult = await db.query(
      `SELECT hotel_id, hotel_name, location, address, description, languages_supported
       FROM hotels
       WHERE slug = $1`,
      [slug]
    );

    if (hotelResult.rows.length === 0) {
      return res.status(404).json({
        message: "Hotel not found"
      });
    }

    const hotel = hotelResult.rows[0];

    // Fetch room details for this hotel
    const roomsResult = await db.query(
      `SELECT room_id, room_type, price_per_night, available_rooms
       FROM rooms
       WHERE hotel_id = $1`,
      [hotel.hotel_id]
    );

    res.json({
      hotel: hotel,
      rooms: roomsResult.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});



app.post("/api/staff/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required"
    });
  }

  try {
    const result = await db.query(
      `SELECT staff_id, hotel_id, name, password_hash, role
       FROM staff_users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const staff = result.rows[0];

    const isMatch = await bcrypt.compare(password, staff.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // Successful login
    res.json({
      message: "Login successful",
      staff_id: staff.staff_id,
      hotel_id: staff.hotel_id,
      staff_name: staff.name,
      role: staff.role
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});



app.get("/api/rooms", async (req, res) => {
  const { hotel_id } = req.query;

  if (!hotel_id) {
    return res.status(400).json({ message: "hotel_id is required" });
  }

  try {
    const result = await db.query(
      `SELECT room_id, room_type, price_per_night, available_rooms
       FROM rooms
       WHERE hotel_id = $1`,
      [hotel_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


app.post("/api/rooms", async (req, res) => {
  const {
    hotel_id,
    room_type,
    price_per_night,
    total_rooms,
    available_rooms
  } = req.body;

  if (
    !hotel_id ||
    !room_type ||
    price_per_night == null ||
    total_rooms == null ||
    available_rooms == null
  ) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  try {
    const result = await db.query(
      `INSERT INTO rooms
       (hotel_id, room_type, price_per_night, total_rooms, available_rooms)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING room_id`,
      [
        hotel_id,
        room_type,
        price_per_night,
        total_rooms,
        available_rooms
      ]
    );

    res.status(201).json({
      message: "Room added successfully",
      room_id: result.rows[0].room_id
    });

  } catch (err) {
    console.error("ROOM INSERT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});



app.patch("/api/rooms/:room_id", async (req, res) => {
  const { room_id } = req.params;
  const { price_per_night,  available_rooms } = req.body;

  if (price_per_night == null&& available_rooms == null) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  try {
    // Fetch total_rooms first
    const roomResult = await db.query(
      "SELECT total_rooms FROM rooms WHERE room_id = $1",
      [room_id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    const total_rooms = roomResult.rows[0].total_rooms;

    // Validate availability
    if (available_rooms != null) {
      if (available_rooms < 0 || available_rooms > total_rooms) {
        return res.status(400).json({
          message: `available_rooms must be between 0 and ${total_rooms}`
        });
      }
    }

    await db.query(
      `UPDATE rooms
       SET
         price_per_night = COALESCE($1, price_per_night),
         available_rooms = COALESCE($2, available_rooms)
       WHERE room_id = $3`,
      [price_per_night, available_rooms, room_id]
    );

    res.json({ message: "Room updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
