// import dotenv from "dotenv";

// dotenv.config();

// // ========== HELPER FUNCTIONS ==========

// /**
//  * Check if a date is an Indian holiday
//  */
// function isIndianHoliday(date) {
//   const fixedHolidays = [
//     "01-26", // Republic Day
//     "03-08", // Maha Shivaratri (approx)
//     "03-25", // Holi (approx)
//     "04-11", // Eid (approx)
//     "04-17", // Ram Navami
//     "04-21", // Mahavir Jayanti
//     "05-23", // Buddha Purnima
//     "08-15", // Independence Day
//     "08-26", // Janmashtami (approx)
//     "09-16", // Milad un-Nabi (approx)
//     "10-02", // Gandhi Jayanti
//     "10-12", // Dussehra (approx)
//     "10-24", // Diwali (approx)
//     "10-25", // Govardhan Puja (approx)
//     "11-01", // Diwali day 2
//     "12-25", // Christmas
//   ];

//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const day = String(date.getDate()).padStart(2, "0");
//   const dateStr = `${month}-${day}`;

//   return fixedHolidays.includes(dateStr);
// }

// /**
//  * Check if date is a weekend (Friday or Saturday)
//  */
// function isWeekend(date) {
//   const dayOfWeek = date.getDay();
//   return dayOfWeek === 5 || dayOfWeek === 6; // Friday=5, Saturday=6
// }

// /**
//  * Get season multiplier
//  */
// function getSeasonalFactor(date) {
//   const month = date.getMonth(); // 0-11

//   // Dec, Jan, Feb = Peak season
//   if ([11, 0, 1].includes(month)) {
//     return 1.15; // +15%
//   }

//   // May, Jun = Low season
//   if ([4, 5].includes(month)) {
//     return 0.85; // -15%
//   }

//   // Other months = normal
//   return 1.0;
// }

// /**
//  * Get days until booking date
//  */
// function getDaysUntil(bookingDate) {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   const checkInDate = new Date(bookingDate);
//   checkInDate.setHours(0, 0, 0, 0);

//   const timeDiff = checkInDate - today;
//   const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

//   return daysUntil;
// }

// /**
//  * Get current occupancy rate for hotel
//  */
// async function getOccupancyRate(db, hotelId) {
//   try {
//     const result = await db.query(
//       `SELECT 
//         COUNT(*) as total_rooms,
//         SUM(CASE WHEN available_rooms < total_rooms THEN 1 ELSE 0 END) as occupied_rooms
//        FROM rooms
//        WHERE hotel_id = $1`,
//       [hotelId]
//     );

//     if (result.rows.length === 0) return 0.5;

//     const { total_rooms, occupied_rooms } = result.rows[0];
//     const occupancy = (occupied_rooms / total_rooms) * 100;

//     return occupancy || 50; // Default 50% if no data
//   } catch (err) {
//     console.error("Error calculating occupancy:", err);
//     return 50; // Default fallback
//   }
// }

// /**
//  * Get base price for a room type
//  */
// async function getBasePrice(db, hotelId, roomId) {
//   try {
//     const result = await db.query(
//       `SELECT price_per_night FROM rooms WHERE room_id = $1 AND hotel_id = $2`,
//       [roomId, hotelId]
//     );

//     if (result.rows.length === 0) return 5000; // Default fallback

//     return result.rows[0].price_per_night;
//   } catch (err) {
//     console.error("Error getting base price:", err);
//     return 5000;
//   }
// }

// // ========== MAIN PRICING FUNCTION ==========

// /**
//  * Calculate optimal price for a room on a specific date
//  * 
//  * @param {number} hotelId - Hotel ID
//  * @param {number} roomId - Room ID
//  * @param {Date} bookingDate - Check-in date
//  * @param {object} db - Database connection
//  * @returns {object} - Pricing recommendation with details
//  */
// export async function calculateOptimalPrice(db, hotelId, roomId, bookingDate) {
//   try {
//     console.log(
//       `\n📊 Calculating price for Room ${roomId}, Date ${bookingDate.toISOString().split('T')[0]}`
//     );

//     // ========== STEP 1: Get base price ==========
//     const basePrice = await getBasePrice(db, hotelId, roomId);
//     console.log(`   Base Price: ₹${basePrice}`);

//     // ========== STEP 2: Calculate factors ==========
//     const occupancyRate = await getOccupancyRate(db, hotelId);
//     const daysUntil = getDaysUntil(bookingDate);
//     const isHoliday = isIndianHoliday(bookingDate);
//     const weekend = isWeekend(bookingDate);
//     const seasonalFactor = getSeasonalFactor(bookingDate);

//     console.log(`   Occupancy: ${occupancyRate.toFixed(1)}%`);
//     console.log(`   Days Until: ${daysUntil}`);
//     console.log(`   Weekend: ${weekend}`);
//     console.log(`   Holiday: ${isHoliday}`);
//     console.log(`   Season Factor: ${seasonalFactor}`);

//     // ========== STEP 3: Calculate multipliers ==========
//     let multiplier = 1.0;
//     let reasons = [];

//     // OCCUPANCY-BASED MULTIPLIER
//     if (occupancyRate >= 90) {
//       multiplier *= 1.4;
//       reasons.push("Very high occupancy (90%+) → +40%");
//     } else if (occupancyRate >= 80) {
//       multiplier *= 1.25;
//       reasons.push("High occupancy (80-90%) → +25%");
//     } else if (occupancyRate >= 70) {
//       multiplier *= 1.1;
//       reasons.push("Good occupancy (70-80%) → +10%");
//     } else if (occupancyRate < 30) {
//       multiplier *= 0.8;
//       reasons.push("Low occupancy (<30%) → -20%");
//     } else if (occupancyRate < 15) {
//       multiplier *= 0.7;
//       reasons.push("Very low occupancy (<15%) → -30%");
//     }

//     // TIMING-BASED MULTIPLIER
//     if (daysUntil <= 2) {
//       multiplier *= 1.5;
//       reasons.push("Last-minute booking (1-2 days) → +50%");
//     } else if (daysUntil <= 5) {
//       multiplier *= 1.25;
//       reasons.push("Short notice (3-5 days) → +25%");
//     } else if (daysUntil <= 10) {
//       multiplier *= 1.1;
//       reasons.push("Advance booking (6-10 days) → +10%");
//     } else if (daysUntil > 30) {
//       multiplier *= 0.8;
//       reasons.push("Early booking (30+ days) → -20%");
//     }

//     // WEEKEND MULTIPLIER
//     if (weekend) {
//       multiplier *= 1.2;
//       reasons.push("Weekend premium → +20%");
//     }

//     // HOLIDAY MULTIPLIER
//     if (isHoliday) {
//       multiplier *= 1.3;
//       reasons.push("Holiday surcharge → +30%");
//     }

//     // SEASONAL MULTIPLIER
//     if (seasonalFactor !== 1.0) {
//       multiplier *= seasonalFactor;
//       reasons.push(
//         seasonalFactor > 1
//           ? "Peak season → +15%"
//           : "Off-season → -15%"
//       );
//     }

//     // ========== STEP 4: Calculate final price ==========
//     let calculatedPrice = basePrice * multiplier;

//     // Apply bounds: never below 70% or above 150% of base price
//     const minPrice = basePrice * 0.7;
//     const maxPrice = basePrice * 1.5;

//     if (calculatedPrice < minPrice) {
//       calculatedPrice = minPrice;
//       reasons.push("Capped at minimum (70% of base)");
//     } else if (calculatedPrice > maxPrice) {
//       calculatedPrice = maxPrice;
//       reasons.push("Capped at maximum (150% of base)");
//     }

//     console.log(`   Final Multiplier: ${multiplier.toFixed(2)}`);
//     console.log(`   Calculated Price: ₹${calculatedPrice.toFixed(2)}`);

//     // ========== STEP 5: Store in history ==========
//     await db.query(
//       `INSERT INTO pricing_history 
//        (hotel_id, room_id, date_for_booking, base_price, calculated_price, 
//         occupancy_rate, days_until, is_weekend, is_holiday, season, multiplier, reason)
//        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
//       [
//         hotelId,
//         roomId,
//         bookingDate.toISOString().split("T")[0],
//         basePrice,
//         calculatedPrice,
//         occupancyRate,
//         daysUntil,
//         weekend,
//         isHoliday,
//         seasonalFactor > 1 ? "peak" : seasonalFactor < 1 ? "low" : "normal",
//         multiplier,
//         reasons.join(" | "),
//       ]
//     );

//     // ========== STEP 6: Return result ==========
//     return {
//       base_price: basePrice,
//       calculated_price: Math.round(calculatedPrice),
//       multiplier: multiplier.toFixed(2),
//       factors: {
//         occupancy_rate: occupancyRate.toFixed(1),
//         days_until: daysUntil,
//         is_weekend: weekend,
//         is_holiday: isHoliday,
//         season: seasonalFactor > 1 ? "peak" : seasonalFactor < 1 ? "low" : "normal",
//       },
//       reasons: reasons,
//       price_increase: Math.round(calculatedPrice - basePrice),
//       price_increase_percent: ((multiplier - 1) * 100).toFixed(1),
//     };
//   } catch (err) {
//     console.error("Error in calculateOptimalPrice:", err);
//     throw err;
//   }
// }

// /**
//  * Get pricing recommendations for all rooms of a hotel
//  */
// export async function getPricingRecommendations(db, hotelId, daysAhead = 7) {
//   try {
//     const recommendations = [];

//     // Get all rooms for this hotel
//     const roomsResult = await db.query(
//       `SELECT room_id, room_type, price_per_night FROM rooms WHERE hotel_id = $1`,
//       [hotelId]
//     );

//     // For each room, calculate pricing for next N days
//     for (const room of roomsResult.rows) {
//       const today = new Date();

//       for (let i = 0; i < daysAhead; i++) {
//         const futureDate = new Date(today);
//         futureDate.setDate(futureDate.getDate() + i);

//         const pricing = await calculateOptimalPrice(
//           db,
//           hotelId,
//           room.room_id,
//           futureDate
//         );

//         recommendations.push({
//           room_id: room.room_id,
//           room_type: room.room_type,
//           date: futureDate.toISOString().split("T")[0],
//           ...pricing,
//         });
//       }
//     }

//     return recommendations;
//   } catch (err) {
//     console.error("Error in getPricingRecommendations:", err);
//     throw err;
//   }
// }

// /**
//  * Apply a recommended price (hotel owner accepts the recommendation)
//  */
// export async function applyRecommendedPrice(db, hotelId, roomId, newPrice) {
//   try {
//     // Update room's base price
//     const result = await db.query(
//       `UPDATE rooms 
//        SET price_per_night = $1 
//        WHERE room_id = $2 AND hotel_id = $3
//        RETURNING room_id, room_type, price_per_night`,
//       [newPrice, roomId, hotelId]
//     );

//     if (result.rows.length === 0) {
//       throw new Error("Room not found");
//     }

//     console.log(
//       `✅ Price updated for room ${result.rows[0].room_type}: ₹${newPrice}`
//     );

//     return result.rows[0];
//   } catch (err) {
//     console.error("Error applying price:", err);
//     throw err;
//   }
// }

import dotenv from "dotenv";

dotenv.config();

// ========== HELPER FUNCTIONS ==========

function isIndianHoliday(date) {
  const fixedHolidays = [
    "01-26", "03-08", "03-25", "04-11", "04-17", "04-21",
    "05-23", "08-15", "08-26", "09-16", "10-02", "10-12",
    "10-24", "10-25", "11-01", "12-25",
  ];
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return fixedHolidays.includes(`${month}-${day}`);
}

function isWeekend(date) {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 5 || dayOfWeek === 6; // Friday=5, Saturday=6
}

function getSeasonalFactor(date) {
  const month = date.getMonth(); 
  if ([11, 0, 1].includes(month)) return 1.15; // Peak
  if ([4, 5].includes(month)) return 0.85; // Low
  return 1.0; 
}

function getDaysUntil(bookingDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkInDate = new Date(bookingDate);
  checkInDate.setHours(0, 0, 0, 0);
  return Math.ceil((checkInDate - today) / (1000 * 60 * 60 * 24));
}

/**
 * FIXED: Now calculates occupancy for the SPECIFIC DATE by checking the bookings table
 */
async function getDateSpecificOccupancy(db, roomId, dateString) {
  try {
    // 1. Get total rooms for this room type
    const roomRes = await db.query(
      `SELECT total_rooms FROM rooms WHERE room_id = $1`, 
      [roomId]
    );
    if (roomRes.rows.length === 0 || roomRes.rows[0].total_rooms === 0) return 0;
    const totalRooms = roomRes.rows[0].total_rooms;

    // 2. Count overlapping confirmed bookings for this specific date
    const bookingsRes = await db.query(
      `SELECT COUNT(*) as booked_count FROM bookings 
       WHERE room_id = $1 
         AND check_in_date <= $2 
         AND check_out_date > $2 
         AND booking_status = 'confirmed'`,
      [roomId, dateString]
    );
    
    const bookedRooms = parseInt(bookingsRes.rows[0].booked_count);
    return (bookedRooms / totalRooms) * 100;
  } catch (err) {
    console.error("Error calculating exact occupancy:", err);
    return 0; 
  }
}

/**
 * NEW: Surge Pricing / Velocity Check (How many bookings in the last 24h?)
 */
async function getBookingVelocity(db, roomId) {
  try {
    const velocityRes = await db.query(
      `SELECT COUNT(*) as recent_bookings FROM bookings 
       WHERE room_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [roomId]
    );
    return parseInt(velocityRes.rows[0].recent_bookings);
  } catch (err) {
    console.error("Error calculating velocity:", err);
    return 0;
  }
}

async function getBasePrice(db, hotelId, roomId) {
  try {
    const result = await db.query(
      `SELECT price_per_night FROM rooms WHERE room_id = $1 AND hotel_id = $2`,
      [roomId, hotelId]
    );
    return result.rows.length > 0 ? Number(result.rows[0].price_per_night) : 5000;
  } catch (err) {
    console.error("Error getting base price:", err);
    return 5000;
  }
}

// ========== MAIN PRICING FUNCTION ==========

export async function calculateOptimalPrice(db, hotelId, roomId, bookingDate) {
  try {
    const dateString = bookingDate.toISOString().split('T')[0];
    
    // ========== STEP 1: Gather Intel ==========
    const basePrice = await getBasePrice(db, hotelId, roomId);
    const occupancyRate = await getDateSpecificOccupancy(db, roomId, dateString);
    const recentBookings = await getBookingVelocity(db, roomId);
    const daysUntil = getDaysUntil(bookingDate);
    const isHoliday = isIndianHoliday(bookingDate);
    const weekend = isWeekend(bookingDate);
    const seasonalFactor = getSeasonalFactor(bookingDate);

    // ========== STEP 2: Yield Management Multipliers ==========
    let m_occ = 1.0;
    let m_time = 1.0;
    let m_vel = 1.0;
    let m_seas = 1.0; // Combines weekends, holidays, and seasons
    let reasons = [];

    // A. OCCUPANCY
    if (occupancyRate >= 90) { m_occ = 1.40; reasons.push("Critical capacity (90%+)"); }
    else if (occupancyRate >= 70) { m_occ = 1.20; reasons.push("High demand (70%+)"); }
    else if (occupancyRate < 30) { m_occ = 0.85; reasons.push("Low occupancy (<30%)"); }

    // B. TIMING
    if (daysUntil > 60) {
      m_time = 0.90; reasons.push("Early bird discount");
    } else if (daysUntil <= 3 && occupancyRate > 70) {
      m_time = 1.25; reasons.push("Last-minute premium");
    } else if (daysUntil <= 3 && occupancyRate < 40) {
      m_time = 0.80; reasons.push("Fire sale to fill empty room");
    }

    // C. VELOCITY (SURGE)
    if (recentBookings >= 3) {
      m_vel = 1.20; reasons.push("🔥 SURGE: High booking velocity");
    }

    // D. SEASONALITY & EVENTS
    if (isHoliday) {
      m_seas *= 1.30; reasons.push("Holiday surcharge");
    } else if (weekend) {
      m_seas *= 1.15; reasons.push("Weekend premium");
    }
    if (seasonalFactor !== 1.0) {
      m_seas *= seasonalFactor;
      reasons.push(seasonalFactor > 1 ? "Peak season" : "Off-season");
    }

    // ========== STEP 3: Calculate & Clamp Price ==========
    let finalMultiplier = m_occ * m_time * m_vel * m_seas;
    let calculatedPrice = basePrice * finalMultiplier;

    // Hard clamps: Never go below 70% or above 200% of base price
    if (calculatedPrice < basePrice * 0.7) {
      calculatedPrice = basePrice * 0.7;
      reasons.push("Hit minimum price floor");
    } else if (calculatedPrice > basePrice * 2.0) {
      calculatedPrice = basePrice * 2.0;
      reasons.push("Hit maximum price ceiling");
    }

    // ========== STEP 4: Log to History ==========
    await db.query(
      `INSERT INTO pricing_history 
       (hotel_id, room_id, date_for_booking, base_price, calculated_price, 
        occupancy_rate, days_until, is_weekend, is_holiday, season, multiplier, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        hotelId, roomId, dateString, basePrice, calculatedPrice,
        occupancyRate, daysUntil, weekend, isHoliday, 
        seasonalFactor > 1 ? "peak" : seasonalFactor < 1 ? "low" : "normal",
        finalMultiplier, reasons.join(" | ")
      ]
    );

    // ========== STEP 5: Return Payload ==========
    return {
      base_price: basePrice,
      calculated_price: Math.round(calculatedPrice),
      multiplier: finalMultiplier.toFixed(2),
      factors: {
        occupancy_rate: occupancyRate.toFixed(1),
        days_until: daysUntil,
        is_weekend: weekend,
        is_holiday: isHoliday,
        velocity_surge: recentBookings >= 3
      },
      reasons: reasons.length > 0 ? reasons : ["Standard pricing"],
      price_increase: Math.round(calculatedPrice - basePrice),
      price_increase_percent: ((finalMultiplier - 1) * 100).toFixed(1)
    };
  } catch (err) {
    console.error("Error in calculateOptimalPrice:", err);
    throw err;
  }
}

export async function getPricingRecommendations(db, hotelId, daysAhead = 7) {
  try {
    const recommendations = [];
    const roomsResult = await db.query(
      `SELECT room_id, room_type FROM rooms WHERE hotel_id = $1`,
      [hotelId]
    );

    for (const room of roomsResult.rows) {
      const today = new Date();
      for (let i = 0; i < daysAhead; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + i);

        const pricing = await calculateOptimalPrice(db, hotelId, room.room_id, futureDate);

        // Only push if there is actually a reason to change the price!
        if (pricing.calculated_price !== pricing.base_price) {
            recommendations.push({
            room_id: room.room_id,
            room_type: room.room_type,
            date: futureDate.toISOString().split("T")[0],
            ...pricing,
            });
        }
      }
    }
    return recommendations;
  } catch (err) {
    console.error("Error in getPricingRecommendations:", err);
    throw err;
  }
}

// export async function applyRecommendedPrice(db, hotelId, roomId, newPrice) {
//   try {
//     const result = await db.query(
//       `UPDATE rooms 
//        SET price_per_night = $1 
//        WHERE room_id = $2 AND hotel_id = $3
//        RETURNING room_id, room_type, price_per_night`,
//       [newPrice, roomId, hotelId]
//     );

//     if (result.rows.length === 0) throw new Error("Room not found");
//     return result.rows[0];
//   } catch (err) {
//     console.error("Error applying price:", err);
//     throw err;
//   }
// }
/**
 * Apply a recommended price safely using the override table
 */
export async function applyRecommendedPrice(db, hotelId, roomId, targetDate, newPrice) {
  try {
    // We use an UPSERT. If a price override already exists for this room/date, update it.
    const result = await db.query(
      `INSERT INTO room_price_overrides (hotel_id, room_id, target_date, custom_price)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (room_id, target_date) 
       DO UPDATE SET custom_price = EXCLUDED.custom_price, created_at = CURRENT_TIMESTAMP
       RETURNING override_id, room_id, target_date, custom_price`,
      [hotelId, roomId, targetDate, newPrice]
    );

    console.log(
      `✅ AI Price Override saved for Room ${roomId} on ${targetDate}: ₹${newPrice}`
    );

    return result.rows[0];
  } catch (err) {
    console.error("Error applying price override:", err);
    throw err;
  }
}