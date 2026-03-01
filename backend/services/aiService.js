import dotenv from "dotenv";

dotenv.config();

// HuggingFace Inference API Configuration
const HF_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
const HF_MODEL = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.1";
const HF_API_URL = `https://router.huggingface.co/api/${HF_MODEL}`;

// --- CACHE UTILITIES ---
const cache = new Map();

function setCache(key, value, ttlMs = 1000 * 60 * 5) {
  const expires = Date.now() + ttlMs;
  cache.set(key, { value, expires });
}

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// --- RULE-BASED RESPONSES (no API needed) ---
// function getRuleBasedResponse(query, hotelContext) {
//   const normalized = query.trim().toLowerCase();

//   // ✅ BOOKING WITH DETAILS (highest priority)
//   // Pattern: "DELUXE 17-02-2026 2 NIGHTS" or "book deluxe room for 17-02-2026 2 nights"
//   if (hotelContext && hotelContext.rooms) {
//     // Try to extract booking details
//     const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/;
//     const nightsPattern = /(\d+)\s*nights?/i;
//     const dateMatch = query.match(datePattern);
//     const nightsMatch = query.match(nightsPattern);

//     // Find room type mentioned
//     let roomType = null;
//     for (const room of hotelContext.rooms) {
//       if (normalized.includes(room.type.toLowerCase())) {
//         roomType = room.type;
//         break;
//       }
//     }

//     // If we found room type AND (date OR nights), it's a booking request
//     if (roomType && (dateMatch || nightsMatch)) {
//       const checkInDate = dateMatch ? dateMatch[1] : "TBD";
//       const nights = nightsMatch ? nightsMatch[1] : "TBD";
//       return {
//         intent: "booking_details_received",
//         response: `Great! I have these booking details:\n• Room Type: ${roomType}\n• Check-in: ${checkInDate}\n• Nights: ${nights}\n\nPlease confirm your full name and phone number to complete the booking.`,
//         bookingDetails: {
//           room_type: roomType,
//           check_in_date: checkInDate,
//           nights: nights
//         }
//       };
//     }

//     // ✅ NAME AND PHONE CONFIRMATION (high priority)
//     // Pattern: "NAME PHONENUMBER" like "RAMAN 9876543210" or "John Doe, 9876543210"
//     const phonePattern = /(\d{10}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/;
//     const phoneMatch = query.match(phonePattern);
//     if (phoneMatch) {
//       // Extract name (everything before phone or comma)
//       const nameMatch = query.match(/^([a-zA-Z\s]+)/);
//       const guestName = nameMatch ? nameMatch[1].trim() : null;
      
//       if (guestName && guestName.length > 2) {
//         return {
//           intent: "booking_confirmation_ready",
//           response: `Perfect! I have your contact details:\n• Name: ${guestName}\n• Phone: ${phoneMatch[0]}\n\nYour booking will be confirmed shortly. Thank you!`,
//           guestDetails: {
//             name: guestName,
//             phone: phoneMatch[0]
//           }
//         };
//       }
//     }

//     // Price queries with specific room type
//     const priceKeywords = ["price", "cost", "rate", "how much", "charge"];
//     for (const room of hotelContext.rooms) {
//       const roomName = (room.type || "").toLowerCase();
//       if (roomName && normalized.includes(roomName) && priceKeywords.some(k => normalized.includes(k))) {
//         return {
//           intent: "pricing",
//           response: `The ${room.type} room costs ₹${room.price} per night. We have ${room.available} rooms available. Would you like to book?`
//         };
//       }
//     }

//     // General availability check
//     if (normalized.includes("available") || (normalized.includes("room") && normalized.includes("have"))) {
//       const availableCount = hotelContext.rooms.reduce((sum, r) => sum + r.available, 0);
//       return {
//         intent: "availability",
//         response: `We have ${availableCount} rooms available across our ${hotelContext.rooms.length} room types. Our rates range from ₹${Math.min(...hotelContext.rooms.map(r => r.price))} to ₹${Math.max(...hotelContext.rooms.map(r => r.price))} per night.`
//       };
//     }
//   }

//   // Booking intent (generic, no details yet)
//   if (normalized.includes("book") || normalized.includes("reserve")) {
//     return {
//       intent: "booking",
//       response: "I'd be happy to help you book a room! Please tell me: 1) Your preferred room type, 2) Check-in date (DD-MM-YYYY), and 3) How many nights."
//     };
//   }

//   // Welcome
//   if (normalized.includes("hello") || normalized.includes("hi") || normalized.includes("help")) {
//     return {
//       intent: "greeting",
//       response: "Hello! I'm your hotel assistant. I can help you with room availability, pricing, bookings, and other inquiries. How can I assist you?"
//     };
//   }

//   return null; // No rule matched
// }

function getRuleBasedResponse(query, hotelContext) {
  const normalized = query.trim().toLowerCase();

  if (!hotelContext || !hotelContext.rooms) return null;

  const datesInfo = `(Selected Dates: ${hotelContext.target_check_in} to ${hotelContext.target_check_out})`;

  // ✅ NAME AND PHONE CONFIRMATION (Completes the booking)
  const phonePattern = /(\d{10}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/;
  const phoneMatch = query.match(phonePattern);
  if (phoneMatch) {
    const nameMatch = query.match(/^([a-zA-Z\s]+)/);
    const guestName = nameMatch ? nameMatch[1].trim() : null;
    
    if (guestName && guestName.length > 2) {
      return {
        intent: "booking_confirmation_ready",
        response: `Perfect! Processing your reservation now...`,
        guestDetails: { name: guestName, phone: phoneMatch[0] }
      };
    }
  }

  // ✅ ROOM SELECTION (Starts the booking)
  let selectedRoom = null;
  for (const room of hotelContext.rooms) {
    if (normalized.includes(room.type.toLowerCase())) {
      selectedRoom = room;
      break;
    }
  }

  // If they mention a room AND "book", ask for details
  if (selectedRoom && (normalized.includes("book") || normalized.includes("reserve"))) {
    if (selectedRoom.available <= 0) {
      return {
        intent: "booking_failed",
        response: `I'm so sorry, but the ${selectedRoom.type} is fully booked for your selected dates ${datesInfo}. Please select a different date or room type.`
      };
    }

    return {
      intent: "booking_details_received",
      response: `Excellent choice! You've selected the ${selectedRoom.type} room ${datesInfo}. The dynamically adjusted price for these dates is ₹${selectedRoom.price} per night.\n\nPlease reply with your FULL NAME and PHONE NUMBER to secure this booking.`,
      bookingDetails: {
        room_type: selectedRoom.type,
        check_in_date: hotelContext.target_check_in,
        nights: "Selected via calendar"
      }
    };
  }

  // ✅ PRICING QUERIES
  const priceKeywords = ["price", "cost", "rate", "how much", "charge"];
  if (selectedRoom && priceKeywords.some(k => normalized.includes(k))) {
    return {
      intent: "pricing",
      response: `Based on your selected dates ${datesInfo}, the ${selectedRoom.type} room is currently ₹${selectedRoom.price} per night. We have ${selectedRoom.available} available. Would you like to book it?`
    };
  }

  // ✅ GENERAL AVAILABILITY
  if (normalized.includes("available") || (normalized.includes("room") && normalized.includes("have"))) {
    const availableRoomsText = hotelContext.rooms
      .map(r => `• ${r.type}: ${r.available > 0 ? `₹${r.price}/night` : 'Sold Out'}`)
      .join("\n");

    return {
      intent: "availability",
      response: `Here is our live availability for your selected dates ${datesInfo}:\n${availableRoomsText}\n\nWhich room would you like to book?`
    };
  }

  return null;
}
// --- MAIN FUNCTION ---
export async function processGuestQuery(query, hotelContext = null, db = null, history = []) {
  const normalized = query.trim().toLowerCase();

  // 1. Try rule-based responses first (fast, no API call)
  const ruleResponse = getRuleBasedResponse(query, hotelContext);
  if (ruleResponse) {
    setCache(`guestq:${normalized}:${hotelContext?.hotel_id || 'default'}`, ruleResponse);
    return ruleResponse;
  }

  // 2. Simple yes/no responses (for booking confirmations)
  if (normalized.includes("yes") || normalized.includes("confirm") || normalized.includes("proceed")) {
    return {
      intent: "confirmation",
      response: "Perfect! Please provide your full name and phone number to complete the booking."
    };
  }

  if (normalized.includes("no") || normalized.includes("cancel") || normalized.includes("decline")) {
    return {
      intent: "cancellation",
      response: "No problem! Is there anything else I can help you with?"
    };
  }

  // 3. CHECK CACHE
  const cacheKey = `guestq:${normalized}:${hotelContext?.hotel_id || 'default'}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  // 4. For complex queries, use HuggingFace (optional, fallback to generic response if fails)
  // Most hotel queries are handled by rule-based logic above, so we rarely reach here
  try {
    // Build context for the AI
    const hotelInfo = hotelContext ? `Hotel: ${hotelContext.hotel_name} (${hotelContext.location})` : "";
    const roomInfo = hotelContext?.rooms
      ? hotelContext.rooms.map(r => `${r.type}: ₹${r.price}/night (${r.available} available)`).join(", ")
      : "";

    const systemContext = `You are a friendly hotel assistant. ${hotelInfo}
Available rooms: ${roomInfo || "No room data available"}
Be concise and helpful.`;

    const prompt = `${systemContext}\n\nGuest: ${query}\nAssistant:`;

    console.log(`🤖 Calling HuggingFace (${HF_MODEL})...`);

    const response = await fetch(HF_API_URL, {
      headers: { Authorization: `Bearer ${HF_API_TOKEN}` },
      method: "POST",
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 150,
          temperature: 0.7,
          top_p: 0.95
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HuggingFace API Error (${response.status}):`, errorText);

      // Fallback: return generic response instead of error
      return {
        intent: "general",
        response: "I'm having trouble processing complex requests right now. Please try rephrasing or ask our staff for assistance."
      };
    }

    const data = await response.json();
    
    // Parse response
    let aiResponse = "";
    if (Array.isArray(data)) {
      aiResponse = data[0]?.generated_text || "";
      const assistantPart = aiResponse.split("Assistant:")?.pop()?.trim() || aiResponse;
      aiResponse = assistantPart;
    } else {
      aiResponse = data.generated_text || "I couldn't generate a response.";
    }

    // Simple intent detection
    let intent = "general";
    const responseText = aiResponse.toLowerCase();
    if (responseText.includes("book") || responseText.includes("reserve")) intent = "booking";
    if (responseText.includes("price") || responseText.includes("cost")) intent = "pricing";
    if (responseText.includes("available")) intent = "availability";

    const result = {
      intent,
      response: aiResponse || "I'm not sure how to respond to that. Could you clarify?"
    };

    setCache(cacheKey, result);
    return result;

  } catch (err) {
    console.error("HuggingFace API Error:", err.message);

    // Final fallback: friendly generic response
    return {
      intent: "general",
      response: "I'm having trouble with the AI service right now. Our staff is available 24/7 to assist you. How else can I help?"
    };
  }
}