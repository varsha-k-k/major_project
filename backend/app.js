import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verifyToken } from "./middleware/auth.js";
import { processGuestQuery } from "./services/aiService.js";

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

    // Parse languages_supported from comma-separated string to array
    const langArray = languages_supported
      ? languages_supported.split(",").map(lang => lang.trim()).filter(lang => lang)
      : [];

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
        langArray,
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
    console.log(`🔍 Searching for: "${searchQuery}"`);
    const result = await db.query(
      `SELECT hotel_id, hotel_name, location, slug
       FROM hotels
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
    // res.json({
    //   message: "Login successful",
    //   staff_id: staff.staff_id,
    //   hotel_id: staff.hotel_id,
    //   staff_name: staff.name,
    //   role: staff.role
    // });

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

  if (!hotel_id) {
    return res.status(400).json({ message: "hotel_id is required" });
  }

  try {
    const result = await db.query(
      `SELECT room_id, room_type, price_per_night, available_rooms, total_rooms
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


app.post("/api/rooms", verifyToken, async (req, res) => {
  const hotel_id = req.user.hotel_id;
  const {
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




app.get("/api/staff/analytics", verifyToken,async (req, res) => {
  const  hotel_id  = req.user.hotel_id;

  if (!hotel_id) {
    return res.status(400).json({ message: "hotel_id is required" });
  }

  try {
    // 1️⃣ Confirmed bookings count
    const confirmedBookings = await db.query(
      `SELECT COUNT(*) 
       FROM bookings 
       WHERE hotel_id = $1 AND booking_status = 'confirmed'`,
      [hotel_id]
    );

    // 2️⃣ Cancelled bookings count
    const cancelledBookings = await db.query(
      `SELECT COUNT(*) 
       FROM bookings 
       WHERE hotel_id = $1 AND booking_status = 'cancelled'`,
      [hotel_id]
    );

    // 3️⃣ Revenue (confirmed bookings only)
    const revenue = await db.query(
      `SELECT COALESCE(SUM(r.price_per_night), 0) AS revenue
       FROM bookings b
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.hotel_id = $1
         AND b.booking_status = 'confirmed'`,
      [hotel_id]
    );

    // 4️⃣ Most popular room (confirmed only)
    const popularRoom = await db.query(
      `SELECT r.room_type, COUNT(*) AS count
       FROM bookings b
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.hotel_id = $1
         AND b.booking_status = 'confirmed'
       GROUP BY r.room_type
       ORDER BY count DESC
       LIMIT 1`,
      [hotel_id]
    );

    res.json({
      confirmed_bookings: parseInt(confirmedBookings.rows[0].count),
      cancelled_bookings: parseInt(cancelledBookings.rows[0].count),
      total_revenue: revenue.rows[0].revenue,
      most_popular_room: popularRoom.rows[0] || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// app.post("/api/guest/query", async (req, res) => {
//   const { hotel_id, query_text } = req.body;

//   if (!hotel_id || !query_text) {
//     return res.status(400).json({
//       message: "hotel_id and query_text are required"
//     });
//   }

//   try {
//     // 1️⃣ Simple intent detection (rule-based for now)
//     let intent = "general";
//     let response = "Thank you for your query. Our staff will assist you shortly.";

//     const lowerQuery = query_text.toLowerCase();

//     if (lowerQuery.includes("room") || lowerQuery.includes("available")) {
//       intent = "availability";
//       response = "Yes, we have rooms available. Would you like to book one?";
//     } else if (lowerQuery.includes("price") || lowerQuery.includes("cost")) {
//       intent = "pricing";
//       response = "Room prices depend on the room type. Please let me know which room you prefer.";
//     } else if (lowerQuery.includes("book")) {
//       intent = "booking";
//       response = "Sure! Please tell me the room type and date.";
//     }

//     // 2️⃣ Store query & response
//     await db.query(
//       `INSERT INTO guest_queries
//        (hotel_id, query_text, intent_detected, response_text)
//        VALUES ($1, $2, $3, $4)`,
//       [hotel_id, query_text, intent, response]
//     );

//     // 3️⃣ Send response to guest
//     res.json({
//       reply: response
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: "Server error"
//     });
//   }
// });
app.post("/api/guest/query", async (req, res) => {
  // 1. Get inputs (including 'history' for conversation context)
  const { hotel_id, query_text, history, bookingDetails } = req.body;

  if (!hotel_id || !query_text) {
    return res.status(400).json({
      message: "hotel_id and query_text are required"
    });
  }

  try {
    // 2. Fetch REAL Hotel Data from DB
    // We need to give the AI the current prices and availability
    const hotelResult = await db.query(
      `SELECT hotel_id, hotel_name, location FROM hotels WHERE hotel_id = $1`,
      [hotel_id]
    );

    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    const roomsResult = await db.query(
      `SELECT room_id, room_type as type, price_per_night as price, available_rooms as available 
       FROM rooms 
       WHERE hotel_id = $1`,
      [hotel_id]
    );

    // 3. Build the Context Object
    const hotelContext = {
      hotel_id: hotel_id,
      hotel_name: hotelResult.rows[0].hotel_name,
      location: hotelResult.rows[0].location,
      rooms: roomsResult.rows || []
    };

    // 4. Call the AI Service
    // We pass 'db' so the AI can run bookings if needed
    const aiResult = await processGuestQuery(query_text, hotelContext, db, history);

    // 5. Try to auto-complete booking if we have all details
    let bookingResponse = null;
    
    // Check if AI result has booking details (from initial room/date selection)
    let finalBookingDetails = bookingDetails || aiResult.bookingDetails;
    
    // Also check if AI result has guest details (from name/phone confirmation)
    if (aiResult.guestDetails && finalBookingDetails) {
      const { name: guestName, phone } = aiResult.guestDetails;
      const roomRecord = hotelContext.rooms.find(r => r.type.toLowerCase() === finalBookingDetails.room_type.toLowerCase());
      
      console.log("🔍 Booking Auto-Complete Check:");
      console.log(`  Guest: ${guestName}, Phone: ${phone}`);
      console.log(`  Booking Details:`, finalBookingDetails);
      console.log(`  Looking for room type: ${finalBookingDetails.room_type}`);
      console.log(`  Available rooms:`, hotelContext.rooms.map(r => ({ type: r.type, available: r.available })));
      console.log(`  Found room: ${roomRecord ? roomRecord.type : "NOT FOUND"}`);
      
      if (roomRecord && roomRecord.available > 0) {
        try {
          // Parse check-in date (handle DD-MM-YYYY format)
          let checkInStr = finalBookingDetails.check_in_date;
          if (checkInStr.includes('-') && checkInStr.split('-')[2].length === 4) {
            // Convert DD-MM-YYYY to YYYY-MM-DD
            const [day, month, year] = checkInStr.split('-');
            checkInStr = `${year}-${month}-${day}`;
          }
          const checkInDate = new Date(checkInStr);
          const nightsNum = parseInt(finalBookingDetails.nights) || 1;
          const checkOutDate = new Date(checkInDate.getTime() + nightsNum * 24 * 60 * 60 * 1000);
          const checkOutStr = checkOutDate.toISOString().split('T')[0];

          // Create the booking
          await db.query(
            `INSERT INTO bookings
             (hotel_id, room_id, guest_name, guest_phone, check_in_date, check_out_date, booking_status)
             VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')`,
            [
              hotel_id,
              roomRecord.room_id,
              guestName,
              phone,
              checkInStr,
              checkOutStr
            ]
          );

          // Decrease available rooms
          await db.query(
            "UPDATE rooms SET available_rooms = available_rooms - 1 WHERE room_id = $1",
            [roomRecord.room_id]
          );

          console.log(`✅ Booking created successfully for ${guestName} in room ${finalBookingDetails.room_type}`);

          bookingResponse = {
            intent: "booking_confirmed",
            response: `✅ Booking confirmed!\n• Guest: ${guestName}\n• Room: ${finalBookingDetails.room_type}\n• Check-in: ${finalBookingDetails.check_in_date}\n• Nights: ${finalBookingDetails.nights}\n• Phone: ${phone}\n\nThank you for booking with us!`,
            booking_created: true
          };
        } catch (bookingErr) {
          console.error("Booking creation error:", bookingErr);
          // Fall through to regular AI response
        }
      }
    }
    
    // Fallback: try to extract guest info from query for manual booking creation
    if (!bookingResponse && finalBookingDetails) {
      const phonePattern = /(\d{10}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/;
      const phoneMatch = query_text.match(phonePattern);
      
      // Try to extract name (anything before phone or comma)
      let guestName = null;
      const nameMatch = query_text.match(/^([^,\d]+)/);
      if (nameMatch) {
        guestName = nameMatch[1].trim();
      }

      // If we have name, phone, and room details, create the booking
      if (guestName && phoneMatch) {
        const phone = phoneMatch[0];
        const roomRecord = hotelContext.rooms.find(r => r.type.toLowerCase() === finalBookingDetails.room_type.toLowerCase());
        
        if (roomRecord && roomRecord.available > 0) {
          try {
            // Parse check-in date (handle DD-MM-YYYY format)
            let checkInStr = finalBookingDetails.check_in_date;
            if (checkInStr.includes('-') && checkInStr.split('-')[2].length === 4) {
              // Convert DD-MM-YYYY to YYYY-MM-DD
              const [day, month, year] = checkInStr.split('-');
              checkInStr = `${year}-${month}-${day}`;
            }
            const checkInDate = new Date(checkInStr);
            const nightsNum = parseInt(finalBookingDetails.nights) || 1;
            const checkOutDate = new Date(checkInDate.getTime() + nightsNum * 24 * 60 * 60 * 1000);
            const checkOutStr = checkOutDate.toISOString().split('T')[0];

            // Create the booking
            await db.query(
              `INSERT INTO bookings
               (hotel_id, room_id, guest_name, guest_phone, check_in_date, check_out_date, booking_status)
               VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')`,
              [
                hotel_id,
                roomRecord.room_id,
                guestName,
                phone,
                checkInStr,
                checkOutStr
              ]
            );

            // Decrease available rooms
            await db.query(
              "UPDATE rooms SET available_rooms = available_rooms - 1 WHERE room_id = $1",
              [roomRecord.room_id]
            );

            bookingResponse = {
              intent: "booking_confirmed",
              response: `✅ Booking confirmed!\n• Guest: ${guestName}\n• Room: ${finalBookingDetails.room_type}\n• Check-in: ${finalBookingDetails.check_in_date}\n• Nights: ${finalBookingDetails.nights}\n• Phone: ${phone}\n\nThank you for booking with us!`,
              booking_created: true
            };
          } catch (bookingErr) {
            console.error("Booking creation error:", bookingErr);
            // Fall through to regular AI response
          }
        }
      }
    }

    // 6. Store the Interaction in DB
    await db.query(
      `INSERT INTO guest_queries
       (hotel_id, query_text, intent_detected, response_text)
       VALUES ($1, $2, $3, $4)`,
      [hotel_id, query_text, aiResult.intent, aiResult.response]
    );

    // 7. Send Response to Frontend
    res.json({
      reply: bookingResponse?.response || aiResult.response,
      response: bookingResponse?.response || aiResult.response,
      intent: bookingResponse?.intent || aiResult.intent,
      bookingDetails: aiResult.bookingDetails || null,
      guestDetails: aiResult.guestDetails || null,
      booking_created: bookingResponse?.booking_created || false
    });

  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({
      message: "Server error processing AI request"
    });
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
    await db.query(
      `UPDATE rooms
       SET available_rooms = available_rooms + 1
       WHERE room_id = $1`,
      [booking.room_id]
    );

    await db.query("COMMIT");

    res.json({ message: "Booking cancelled successfully" });

  } catch (err) {
    await db.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
