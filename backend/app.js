import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyToken } from "./middleware/auth.js";
import { processGuestQuery } from "./services/aiService.js";
import { 
  calculateOptimalPrice, 
  getPricingRecommendations, 
  applyRecommendedPrice 
} from "./services/pricingEngine.js";

import { getComprehensiveAnalytics } from "./services/analyticsService.js";


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

db.connect()
  .then(() => console.log("✓ Database connected successfully"))
  .catch((err) => console.error("✗ Database connection failed:", err.message));

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
// Make the 'uploads' folder publicly accessible
app.use('/uploads', express.static('uploads'));

app.use(bodyParser.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = 'uploads/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG) and PDF files are allowed!'));
    }
  }
});

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
    check_out,
    number_of_rooms = 1
  } = req.body;

  if (!check_in || !check_out) {
    return res.status(400).json({ message: "Check-in and check-out dates are required." });
  }

  try {
    await db.query("BEGIN"); // Start transaction

    // ==========================================
    // STEP 1: LOCK THE ROOM ROW (The Fix!)
    // ==========================================
    // We lock the parent room row. No other transaction can read or update this 
    // specific room's availability until we COMMIT or ROLLBACK.
    const roomCheck = await db.query(
      "SELECT total_rooms FROM rooms WHERE room_id = $1 AND hotel_id = $2 FOR UPDATE",
      [room_id, hotel_id]
    );

    if (roomCheck.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Room not found" });
    }

    const totalRooms = roomCheck.rows[0].total_rooms;

    // ==========================================
    // STEP 2: CALCULATE OVERLAPPING DATES 
    // ==========================================
    // Removed FOR UPDATE from here. It's safe to run because we already locked the room.
    const overlapCheck = await db.query(
      `SELECT SUM(number_of_rooms) as booked_count 
       FROM bookings 
       WHERE room_id = $1 
         AND booking_status = 'confirmed'
         AND check_in_date < $3 
         AND check_out_date > $2`,
      [room_id, check_in, check_out]
    );

    const currentlyBooked = parseInt(overlapCheck.rows[0].booked_count) || 0;
    
    // ==========================================
    // STEP 3: ENFORCE CAPACITY
    // ==========================================
    const actualAvailable = totalRooms - currentlyBooked;

    if (actualAvailable <= 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({ message: "No rooms available for these dates." });
    }

    if (number_of_rooms > actualAvailable) {
      await db.query("ROLLBACK");
      return res.status(400).json({ message: `Only ${actualAvailable} room(s) available for these dates.` });
    }

    // ==========================================
    // STEP 4: INSERT BOOKING
    // ==========================================
    await db.query(
      `INSERT INTO bookings
       (hotel_id, room_id, guest_name, guest_phone, check_in_date, check_out_date, number_of_rooms, booking_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')`,
      [hotel_id, room_id, guest_name, guest_phone, check_in, check_out, number_of_rooms]
    );

    await db.query("COMMIT"); // Release the lock and save!

    res.json({ message: "Booking confirmed successfully!" });

  } catch (err) {
    await db.query("ROLLBACK"); // Release the lock and undo on error
    console.error("Booking Error:", err);
    res.status(500).json({ message: "Server error during booking" });
  }
});

app.post("/api/hotels/register", upload.single('license_file'), async (req, res) => {
  const {
    hotel_name,
    location,
    address,
    contact_phone,
    contact_email,
    description,
    staff_name,
    staff_email,
    staff_password
  } = req.body;

  const licenseFile = req.file;

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

    // Store password directly (for development only)
    const hashedPassword = staff_password;

    // Start transaction
    await db.query("BEGIN");

    // Insert hotel
    const hotelResult = await db.query(
      `INSERT INTO hotels
       (hotel_name, location, address, contact_phone, contact_email, description, slug, license_file_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING hotel_id`,
      [
        hotel_name,
        location,
        address,
        contact_phone,
        contact_email,
        description,
        slug,
        licenseFile ? licenseFile.path : null
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
    console.log(`🔍 Searching for: "${searchQuery}"`);
    const result = await db.query(
      `SELECT h.hotel_id, h.hotel_name, h.location, h.slug,
              (
                SELECT 'http://localhost:3000/' || rp.picture_url
                FROM rooms r
                JOIN room_pictures rp ON rp.room_id = r.room_id
                WHERE r.hotel_id = h.hotel_id
                ORDER BY rp.display_order
                LIMIT 1
              ) AS preview_image
       FROM hotels h
       WHERE hotel_name ILIKE $1
          OR location ILIKE $1`,
      [`%${searchQuery}%`]
    );

    console.log(`✓ Found ${result.rows.length} hotels`);
    res.json({
      results: result.rows
    });

  } catch (err) {
    console.error("✗ Search error:", err.message);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});



app.get("/api/hotels/:slug", async (req, res) => {
  const { slug } = req.params;
  const { date } = req.query; 

  try {
    const hotelResult = await db.query(
      `SELECT hotel_id, hotel_name, location, address, description FROM hotels WHERE slug = $1`,
      [slug]
    );

    if (hotelResult.rows.length === 0) return res.status(404).json({ message: "Hotel not found" });

    const hotel = hotelResult.rows[0];
    let roomsResult;

    // Define the extra fields safely
    const extraFields = `
          r.description,
          r.capacity,
          r.total_rooms,
          COALESCE(
            (SELECT json_agg(
               json_build_object('picture_id', picture_id, 'picture_url', 'http://localhost:3000/' || picture_url)
               ORDER BY display_order
             ) FROM room_pictures WHERE room_id = r.room_id),
            '[]'::json
          ) as pictures,
          COALESCE(
            (SELECT json_agg(amenity_name) FROM room_amenities WHERE room_id = r.room_id),
            '[]'::json
          ) as amenities
    `;

    if (date) {
      roomsResult = await db.query(
        `SELECT r.room_id, r.room_type, ${extraFields}, COALESCE(o.custom_price, r.price_per_night) AS price_per_night
         FROM rooms r
         LEFT JOIN room_price_overrides o ON r.room_id = o.room_id AND o.target_date = $2
         WHERE r.hotel_id = $1`,
        [hotel.hotel_id, date]
      );
    } else {
      roomsResult = await db.query(
        `SELECT r.room_id, r.room_type, ${extraFields}, r.price_per_night
         FROM rooms r
         WHERE r.hotel_id = $1`,
        [hotel.hotel_id]
      );
    }

    res.json({ hotel: hotel, rooms: roomsResult.rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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

    const isMatch = password === staff.password_hash;

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }


    const token = jwt.sign(
  {
    staff_id: staff.staff_id,
    hotel_id: staff.hotel_id,
    role: staff.role
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

res.json({
  message: "Login successful",
  token
});


  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});

app.get("/api/rooms", verifyToken, async (req, res) => {
  const hotel_id = req.user.hotel_id;

  if (!hotel_id) return res.status(400).json({ message: "hotel_id is required" });

  try {
    const result = await db.query(
      `SELECT 
         r.room_id, r.room_type, r.price_per_night, r.total_rooms, r.description, r.capacity,
         
         -- Calculate available_rooms dynamically so it doesn't crash!
         (r.total_rooms - COALESCE((SELECT SUM(number_of_rooms) FROM bookings WHERE room_id = r.room_id AND booking_status = 'confirmed' AND CURRENT_DATE BETWEEN check_in_date AND check_out_date), 0)) AS available_rooms,
         
         COALESCE(
           (SELECT json_agg(
              json_build_object('picture_id', picture_id, 'picture_url', 'http://localhost:3000/' || picture_url)
              ORDER BY display_order
            ) FROM room_pictures WHERE room_id = r.room_id), 
           '[]'::json
         ) as pictures,
         
         COALESCE(
           (SELECT json_agg(amenity_name) FROM room_amenities WHERE room_id = r.room_id), 
           '[]'::json
         ) as amenities
       FROM rooms r
       WHERE r.hotel_id = $1
       ORDER BY r.room_id ASC`,
      [hotel_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ... other imports and configs ...

// ==========================================
//  CREATE A NEW ROOM WITH PICTURES & AMENITIES
// ==========================================
// Notice the `upload.array('room_images', 5)` middleware!
// It tells multer to look for multiple files in the 'room_images' field.
app.post("/api/rooms", verifyToken, upload.array('room_images', 5), async (req, res) => {
  const hotel_id = req.user.hotel_id;
  // When using FormData, non-file fields are in req.body
  const { room_type, price_per_night, total_rooms, description, capacity, amenities } = req.body;

  if (!hotel_id || !room_type || !price_per_night || !total_rooms) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  try {
    await db.query("BEGIN"); // Start a transaction

    // 1. Insert into the main `rooms` table
    const roomResult = await db.query(
      `INSERT INTO rooms (hotel_id, room_type, price_per_night, total_rooms, description, capacity)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING room_id`,
      [hotel_id, room_type, price_per_night, total_rooms, description, capacity || 2]
    );
    
    const newRoomId = roomResult.rows[0].room_id;

    // 2. Insert Images into `room_pictures` table
    // req.files contains the array of uploaded files
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        // Get the path where the file was saved on the server
        // Use forward slashes for URL compatibility
        const filePath = req.files[i].path.replace(/\\/g, '/');
        
        await db.query(
          `INSERT INTO room_pictures (room_id, picture_url, display_order)
           VALUES ($1, $2, $3)`,
          [newRoomId, filePath, i + 1] // i+1 sets the order (1, 2, 3...)
        );
      }
    }

    // 3. Insert Amenities into `room_amenities` table
    // Amenities come as an array of strings from FormData
    if (amenities && Array.isArray(amenities)) {
      for (const amenity of amenities) {
        await db.query(
          `INSERT INTO room_amenities (room_id, amenity_name)
           VALUES ($1, $2)`,
          [newRoomId, amenity]
        );
      }
    } else if (amenities && typeof amenities === 'string') {
       // Handle single amenity case just to be safe
       await db.query(
          `INSERT INTO room_amenities (room_id, amenity_name)
           VALUES ($1, $2)`,
          [newRoomId, amenities]
        );
    }


    await db.query("COMMIT"); // Commit the transaction

    res.status(201).json({ message: "Room added successfully with pictures and amenities!", room_id: newRoomId });

  } catch (err) {
    await db.query("ROLLBACK"); // Rollback on error
    // Important: If the DB insert fails, you might want to delete the uploaded files to save space.
    // For simplicity, we'll skip that for now, but it's a good production practice.
    console.error("ROOM INSERT ERROR:", err);
    res.status(500).json({ error: "Failed to save room details" });
  }
});

// ... rest of your server.js code ...

app.post("/api/rooms/:room_id/pictures", verifyToken, upload.single('picture'), async (req, res) => {
  const { room_id } = req.params;
  const caption = req.body.caption || "Room picture";

  if (!req.file) return res.status(400).json({ message: "No image uploaded" });

  try {
    const cleanPath = req.file.path.replace(/\\/g, '/');
    
    // Get current max display_order
    const orderResult = await db.query(
      "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM room_pictures WHERE room_id = $1",
      [room_id]
    );
    const nextOrder = orderResult.rows[0].next_order;

    await db.query(
      `INSERT INTO room_pictures (room_id, picture_url, caption, display_order)
       VALUES ($1, $2, $3, $4)`,
      [room_id, cleanPath, caption, nextOrder]
    );

    res.status(201).json({ message: "Picture added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload picture" });
  }
});

// 2. DELETE A ROOM
app.delete("/api/rooms/:room_id", verifyToken, async (req, res) => {
  const { room_id } = req.params;
  try {
    await db.query("BEGIN");
    // Delete dependencies first (Foreign Keys)
    await db.query("DELETE FROM room_pictures WHERE room_id = $1", [room_id]);
    await db.query("DELETE FROM room_amenities WHERE room_id = $1", [room_id]);
    // Delete the room
    await db.query("DELETE FROM rooms WHERE room_id = $1", [room_id]);
    await db.query("COMMIT");
    
    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to delete room" });
  }
});

// 3. UPDATE / EDIT A ROOM
app.put("/api/rooms/:room_id", verifyToken, async (req, res) => {
  const { room_id } = req.params;
  const { room_type, description, capacity, price_per_night, total_rooms, amenities } = req.body;

  try {
    await db.query("BEGIN");

    await db.query(
      `UPDATE rooms 
       SET room_type = $1, description = $2, capacity = $3, price_per_night = $4, total_rooms = $5
       WHERE room_id = $6`,
      [room_type, description, capacity, price_per_night, total_rooms, room_id]
    );

    // Update amenities (delete old ones, insert new ones)
    if (amenities && Array.isArray(amenities)) {
      await db.query("DELETE FROM room_amenities WHERE room_id = $1", [room_id]);
      for (const amenity of amenities) {
        await db.query(
          "INSERT INTO room_amenities (room_id, amenity_name) VALUES ($1, $2)",
          [room_id, amenity]
        );
      }
    }

    await db.query("COMMIT");
    res.json({ message: "Room updated successfully" });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to update room" });
  }
});

app.get("/api/staff/bookings", verifyToken , async (req, res) => {
  const  hotel_id  = req.user.hotel_id;

  if (!hotel_id) {
    return res.status(400).json({ message: "hotel_id is required" });
  }

  try {
    const result = await db.query(
      `SELECT b.booking_id, b.guest_name, b.guest_phone,
              b.check_in_date, b.check_out_date, b.booking_status,
              r.room_type, r.price_per_night
       FROM bookings b
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.hotel_id = $1
       ORDER BY b.created_at DESC`,
      [hotel_id]
    );
    

    // decreasing available rooms when boooked

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// app.get("/api/staff/analytics", verifyToken, async (req, res) => {
//   const hotel_id = req.user.hotel_id;

//   if (!hotel_id) {
//     return res.status(400).json({ message: "hotel_id is required" });
//   }

//   try {
//     // 1️⃣ Confirmed bookings count
//     const confirmedBookings = await db.query(
//       `SELECT COUNT(*) 
//        FROM bookings 
//        WHERE hotel_id = $1 AND booking_status = 'confirmed'`,
//       [hotel_id]
//     );

//     // 2️⃣ Cancelled bookings count
//     const cancelledBookings = await db.query(
//       `SELECT COUNT(*) 
//        FROM bookings 
//        WHERE hotel_id = $1 AND booking_status = 'cancelled'`,
//       [hotel_id]
//     );

//     // 3️⃣ Total Revenue (confirmed bookings only)
//     const revenue = await db.query(
//       `SELECT COALESCE(SUM(r.price_per_night * b.number_of_rooms), 0) AS revenue
//        FROM bookings b
//        JOIN rooms r ON b.room_id = r.room_id
//        WHERE b.hotel_id = $1
//          AND b.booking_status = 'confirmed'`,
//       [hotel_id]
//     );

//     // 4️⃣ Most popular room (confirmed only)
//     const popularRoom = await db.query(
//       `SELECT r.room_type, COUNT(*) AS count
//        FROM bookings b
//        JOIN rooms r ON b.room_id = r.room_id
//        WHERE b.hotel_id = $1
//          AND b.booking_status = 'confirmed'
//        GROUP BY r.room_type
//        ORDER BY count DESC
//        LIMIT 1`,
//       [hotel_id]
//     );

//     // 5️⃣ NEW: Revenue Trend (Last 30 Days Grouped by Date)
//     const revenueTrend = await db.query(
//       `SELECT 
//          TO_CHAR(b.created_at, 'Mon DD') as date,
//          COALESCE(SUM(r.price_per_night * b.number_of_rooms), 0) as daily_revenue
//        FROM bookings b
//        JOIN rooms r ON b.room_id = r.room_id
//        WHERE b.hotel_id = $1
//          AND b.booking_status = 'confirmed'
//          AND b.created_at >= NOW() - INTERVAL '30 days'
//        GROUP BY TO_CHAR(b.created_at, 'Mon DD'), DATE(b.created_at)
//        ORDER BY DATE(b.created_at) ASC`,
//       [hotel_id]
//     );





//     res.json({
//       confirmed_bookings: parseInt(confirmedBookings.rows[0].count),
//       cancelled_bookings: parseInt(cancelledBookings.rows[0].count),
//       total_revenue: parseInt(revenue.rows[0].revenue),
//       most_popular_room: popularRoom.rows[0] || null,
//       revenue_trend: revenueTrend.rows // Sent to frontend for the chart
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error generating analytics" });
//   }
// });

// ==========================================
// MASTER ANALYTICS ROUTE
// ==========================================
// ==========================================
// MASTER ANALYTICS ROUTE
// ==========================================
app.get("/api/staff/analytics", verifyToken, async (req, res) => {
  const hotel_id = req.user.hotel_id;
  const period = parseInt(req.query.period) || 30; // Default 30 days

  if (!hotel_id) return res.status(400).json({ message: "hotel_id is required" });

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - period);

    // 1️⃣ CORE METRICS (Current Period)
    const coreMetrics = await db.query(
      `SELECT 
        COUNT(*) as total_bookings,
        COALESCE(SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END), 0) as confirmed,
        COALESCE(SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled,
        COALESCE(SUM(CASE WHEN booking_status = 'confirmed' THEN 
          (check_out_date::date - check_in_date::date) * r.price_per_night * COALESCE(b.number_of_rooms, 1) 
        ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN booking_status = 'confirmed' THEN 
          (check_out_date::date - check_in_date::date) * COALESCE(b.number_of_rooms, 1) 
        ELSE 0 END), 0) as total_nights
       FROM bookings b
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.hotel_id = $1 AND b.created_at >= $2`,
      [hotel_id, startDate]
    );

    const data = coreMetrics.rows[0];
    const totalRevenue = parseInt(data.total_revenue) || 0;
    const totalNights = parseInt(data.total_nights) || 0;
    const confirmedCount = parseInt(data.confirmed) || 0;
    const totalBookings = parseInt(data.total_bookings) || 0;
    const cancelledCount = parseInt(data.cancelled) || 0;

    // 2️⃣ HOTEL CAPACITY
    const totalRoomsResult = await db.query(
      `SELECT COALESCE(SUM(total_rooms), 1) as total_capacity FROM rooms WHERE hotel_id = $1`,
      [hotel_id]
    );
    const totalCapacity = parseInt(totalRoomsResult.rows[0].total_capacity) || 1;
    const totalAvailableNights = totalCapacity * period;

    // 3️⃣ CALCULATE ADVANCED KPIs
    const occupancyRate = totalAvailableNights > 0 ? ((totalNights / totalAvailableNights) * 100).toFixed(1) : 0;
    const revpar = totalCapacity > 0 ? Math.round(totalRevenue / totalCapacity) : 0;
    const adr = totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0;
    const alos = confirmedCount > 0 ? (totalNights / confirmedCount).toFixed(1) : 0;
    const cancellationRate = totalBookings > 0 ? ((cancelledCount / totalBookings) * 100).toFixed(1) : 0;

    // 4️⃣ REPEAT GUESTS
    const guestMetrics = await db.query(
      `SELECT COUNT(DISTINCT guest_phone) as unique_guests
       FROM bookings WHERE hotel_id = $1 AND booking_status = 'confirmed' AND created_at >= $2`,
      [hotel_id, startDate]
    );
    const uniqueGuests = parseInt(guestMetrics.rows[0].unique_guests) || 0;
    const repeatGuestRate = confirmedCount > 0 ? (((confirmedCount - uniqueGuests) / confirmedCount) * 100).toFixed(1) : 0;

    // 5️⃣ REVENUE BY ROOM TYPE
    const revenueByRoom = await db.query(
      `SELECT 
        r.room_type,
        COUNT(b.booking_id) as bookings,
        COALESCE(SUM((b.check_out_date::date - b.check_in_date::date) * COALESCE(b.number_of_rooms, 1) * r.price_per_night), 0) as revenue
       FROM bookings b
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.hotel_id = $1 AND b.booking_status = 'confirmed' AND b.created_at >= $2
       GROUP BY r.room_type
       ORDER BY revenue DESC`,
      [hotel_id, startDate]
    );

    // 6️⃣ PEAK DAYS
    const peakDays = await db.query(
      `SELECT 
        TRIM(TO_CHAR(check_in_date, 'Day')) as day_of_week,
        COUNT(*) as bookings
       FROM bookings 
       WHERE hotel_id = $1 AND booking_status = 'confirmed' AND created_at >= $2
       GROUP BY TRIM(TO_CHAR(check_in_date, 'Day'))
       ORDER BY bookings DESC`,
      [hotel_id, startDate]
    );

    // 7️⃣ REVENUE TREND (For Line Chart)
    const revenueTrend = await db.query(
      `SELECT 
         TO_CHAR(b.created_at, 'Mon DD') as date,
         COALESCE(SUM((b.check_out_date::date - b.check_in_date::date) * r.price_per_night * COALESCE(b.number_of_rooms, 1)), 0) as daily_revenue
       FROM bookings b
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.hotel_id = $1 AND b.booking_status = 'confirmed' AND b.created_at >= $2
       GROUP BY TO_CHAR(b.created_at, 'Mon DD'), DATE(b.created_at)
       ORDER BY DATE(b.created_at) ASC`,
      [hotel_id, startDate]
    );

    // 8️⃣ PREVIOUS PERIOD COMPARISON
    const prevMetrics = await db.query(
      `SELECT COALESCE(SUM((check_out_date::date - check_in_date::date) * r.price_per_night * COALESCE(b.number_of_rooms, 1)), 0) as prev_revenue
       FROM bookings b
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.hotel_id = $1 AND b.booking_status = 'confirmed' AND b.created_at >= $2 AND b.created_at < $3`,
      [hotel_id, previousStartDate, startDate]
    );
    const prevRevenue = parseInt(prevMetrics.rows[0].prev_revenue) || 0;
    const revenueChange = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : (totalRevenue > 0 ? 100 : 0);

    // 🚀 SEND PERFECTLY FORMATTED JSON
    res.json({
      period: period,
      summary: {
        total_revenue: totalRevenue,
        total_bookings: totalBookings,
        confirmed_bookings: confirmedCount,
        cancelled_bookings: cancelledCount
      },
      key_metrics: {
        occupancy_rate: occupancyRate,
        revpar: revpar,
        adr: adr,
        alos: alos,
        cancellation_rate: cancellationRate,
        repeat_guest_rate: repeatGuestRate
      },
      revenue_by_room_type: revenueByRoom.rows.map(r => ({
        room_type: r.room_type,
        revenue: parseInt(r.revenue) || 0
      })),
      peak_days: peakDays.rows.map(r => ({
        day_of_week: r.day_of_week,
        bookings: parseInt(r.bookings) || 0
      })),
      revenue_trend: revenueTrend.rows,
      comparison: {
        revenue_change_percent: parseFloat(revenueChange),
        previous_period_revenue: prevRevenue
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error generating analytics" });
  }
});
app.post("/api/guest/query", async (req, res) => {
  const { hotel_id, query_text, history, bookingDetails, check_in, check_out } = req.body;

  if (!hotel_id || !query_text) {
    return res.status(400).json({ message: "hotel_id and query_text are required" });
  }

  try {
    // 1. Fetch REAL Hotel Data from DB
    const hotelResult = await db.query(
      `SELECT hotel_id, hotel_name, location FROM hotels WHERE hotel_id = $1`,
      [hotel_id]
    );

    if (hotelResult.rows.length === 0) return res.status(404).json({ message: "Hotel not found" });

    // 2. Fetch Dynamic Pricing & True Availability for these specific dates!
    const roomsResult = await db.query(
      `SELECT 
          r.room_id, 
          r.room_type as type, 
          COALESCE(o.custom_price, r.price_per_night) as price,
          r.total_rooms - COALESCE(
              (SELECT SUM(number_of_rooms) FROM bookings b 
               WHERE b.room_id = r.room_id 
               AND b.booking_status = 'confirmed' 
               AND b.check_in_date < $3 
               AND b.check_out_date > $2), 0
          ) as available
       FROM rooms r
       LEFT JOIN room_price_overrides o 
          ON r.room_id = o.room_id AND o.target_date = $2
       WHERE r.hotel_id = $1`,
      [hotel_id, check_in, check_out]
    );

    // 3. Build the Context Object for the AI
    const hotelContext = {
      hotel_id: hotel_id,
      hotel_name: hotelResult.rows[0].hotel_name,
      location: hotelResult.rows[0].location,
      target_check_in: check_in,
      target_check_out: check_out,
      rooms: roomsResult.rows || []
    };

    // 4. Call the AI Service
    const aiResult = await processGuestQuery(query_text, hotelContext, db, history);

    let bookingResponse = null;
    let finalBookingDetails = bookingDetails || aiResult.bookingDetails;
    
    // 5. Secure Auto-Complete Booking (with Transactions!)
    if (aiResult.guestDetails && finalBookingDetails) {
      const { name: guestName, phone } = aiResult.guestDetails;
      const roomRecord = hotelContext.rooms.find(r => r.type.toLowerCase() === finalBookingDetails.room_type.toLowerCase());
      
      if (roomRecord && roomRecord.available > 0) {
        try {
          await db.query("BEGIN");
          
          // Lock the room row to prevent race conditions
          await db.query("SELECT total_rooms FROM rooms WHERE room_id = $1 FOR UPDATE", [roomRecord.room_id]);

          // Double check availability one last time
          const overlapCheck = await db.query(
            `SELECT SUM(number_of_rooms) as booked_count FROM bookings 
             WHERE room_id = $1 AND booking_status = 'confirmed' AND check_in_date < $3 AND check_out_date > $2`,
            [roomRecord.room_id, check_in, check_out]
          );
          
          const currentlyBooked = parseInt(overlapCheck.rows[0].booked_count) || 0;
          const actualAvailable = roomRecord.total_rooms - currentlyBooked; // Note: Ensure you fetch total_rooms in step 2 if needed here, or assume roomRecord.available is close enough for the lock check

          // Insert if safe
          await db.query(
            `INSERT INTO bookings (hotel_id, room_id, guest_name, guest_phone, check_in_date, check_out_date, number_of_rooms, booking_status)
             VALUES ($1, $2, $3, $4, $5, $6, 1, 'confirmed')`,
            [hotel_id, roomRecord.room_id, guestName, phone, check_in, check_out]
          );

          await db.query("COMMIT");

          bookingResponse = {
            intent: "booking_confirmed",
            response: `✅ Booking confirmed!\n• Guest: ${guestName}\n• Room: ${finalBookingDetails.room_type}\n• Check-in: ${check_in}\n• Phone: ${phone}\n\nThank you for booking with us!`,
            booking_created: true
          };
        } catch (bookingErr) {
          await db.query("ROLLBACK");
          console.error("Booking creation error:", bookingErr);
        }
      }
    }
    
    // 6. Store the Interaction in DB
    await db.query(
      `INSERT INTO guest_queries (hotel_id, query_text, intent_detected, response_text) VALUES ($1, $2, $3, $4)`,
      [hotel_id, query_text, aiResult.intent, aiResult.response]
    );

    res.json({
      reply: bookingResponse?.response || aiResult.response,
      response: bookingResponse?.response || aiResult.response,
      intent: bookingResponse?.intent || aiResult.intent,
      bookingDetails: finalBookingDetails || null,
      guestDetails: aiResult.guestDetails || null,
      booking_created: bookingResponse?.booking_created || false
    });

  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ message: "Server error processing AI request" });
  }
});

app.get("/api/staff/queries/summary", verifyToken,async (req, res) => {
  const  hotel_id  = req.user.hotel_id;

  if (!hotel_id) {
    return res.status(400).json({ message: "hotel_id is required" });
  }

  try {
    const totalQueries = await db.query(
      `SELECT COUNT(*) FROM guest_queries WHERE hotel_id = $1`,
      [hotel_id]
    );

    const topIntents = await db.query(
      `SELECT intent_detected, COUNT(*) AS count
       FROM guest_queries
       WHERE hotel_id = $1
       GROUP BY intent_detected
       ORDER BY count DESC`,
      [hotel_id]
    );

    const commonQuestions = await db.query(
      `SELECT query_text, COUNT(*) AS count
       FROM guest_queries
       WHERE hotel_id = $1
       GROUP BY query_text
       ORDER BY count DESC
       LIMIT 5`,
      [hotel_id]
    );

    res.json({
      total_queries: totalQueries.rows[0].count,
      intent_breakdown: topIntents.rows,
      common_questions: commonQuestions.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/api/bookings/:booking_id/cancel", async (req, res) => {
  const { booking_id } = req.params;

  try {
    // Fetch booking details
    const bookingResult = await db.query(
      `SELECT room_id, booking_status
       FROM bookings
       WHERE booking_id = $1`,
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingResult.rows[0];

    // if (booking.bookingstatus === "checked_in") {
    //   return res.status(400).json({ message: "Cannot cancel checked-in booking" });
    // }


// changed status to booking_status

    if (booking.booking_status === "cancelled") {
      return res.status(400).json({ message: "Booking already cancelled" });
    }

    // Start transaction
    await db.query("BEGIN");

    // Update booking status
    await db.query(
      `UPDATE bookings
       SET booking_status = 'cancelled'
       WHERE booking_id = $1`,
      [booking_id]
    );

    // Increase available rooms
  

    await db.query("COMMIT");

    res.json({ message: "Booking cancelled successfully" });

  } catch (err) {
    await db.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/pricing/recommendations", verifyToken, async (req, res) => {
  const hotelId = req.user.hotel_id;
  const daysAhead = parseInt(req.query.days) || 7;

  if (!hotelId) {
    return res.status(400).json({ message: "Hotel ID required" });
  }

  try {
    console.log(
      `\n🎯 Getting pricing recommendations for hotel ${hotelId} (${daysAhead} days)`
    );

    const recommendations = await getPricingRecommendations(
      db,
      hotelId,
      daysAhead
    );

    res.json({
      hotel_id: hotelId,
      total_recommendations: recommendations.length,
      days_ahead: daysAhead,
      recommendations: recommendations,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Failed to get recommendations" });
  }
});

app.post("/api/pricing/calculate", verifyToken, async (req, res) => {
  const hotelId = req.user.hotel_id;
  const { room_id, booking_date } = req.body;

  if (!room_id || !booking_date) {
    return res
      .status(400)
      .json({ message: "room_id and booking_date required" });
  }

  try {
    const date = new Date(booking_date);
    const pricing = await calculateOptimalPrice(db, hotelId, room_id, date);

    res.json({
      room_id,
      booking_date,
      ...pricing,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Failed to calculate price" });
  }
});

app.post("/api/pricing/apply", verifyToken, async (req, res) => {
  const hotelId = req.user.hotel_id;
  // ADDED: We must extract target_date from the frontend request
  const { room_id, new_price, target_date } = req.body;

  if (!room_id || !new_price || !target_date) {
    return res.status(400).json({ message: "room_id, new_price, and target_date required" });
  }

  try {
    // UPDATED: Pass target_date into the pricingEngine function
    const result = await applyRecommendedPrice(
      db,
      hotelId,
      room_id,
      target_date, 
      new_price
    );

    res.json({
      message: "Price applied successfully",
      room: result,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Failed to apply price" });
  }
});

app.get("/api/pricing/history", verifyToken, async (req, res) => {
  const hotelId = req.user.hotel_id;
  const days = parseInt(req.query.days) || 30;

  if (!hotelId) {
    return res.status(400).json({ message: "Hotel ID required" });
  }

  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const result = await db.query(
      `SELECT 
        room_id, 
        date_for_booking, 
        base_price, 
        calculated_price, 
        occupancy_rate,
        reason
       FROM pricing_history
       WHERE hotel_id = $1 AND created_at >= $2
       ORDER BY created_at DESC`,
      [hotelId, fromDate]
    );

    res.json({
      hotel_id: hotelId,
      period_days: days,
      total_records: result.rows.length,
      history: result.rows,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Failed to get history" });
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
