import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

function HotelPage() {
  const { slug } = useParams();

  const [messages, setMessages] = useState([]);
const [input, setInput] = useState("");

  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  
  // Track booking details during conversation
  const [bookingDetails, setBookingDetails] = useState(null);

  useEffect(() => {
    fetchHotel();
  }, [slug]);

  const fetchHotel = async () => {
    try {
      const res = await axios.get(
        `http://localhost:3000/api/hotels/${slug}`
      );

      setHotel(res.data.hotel);
      setRooms(res.data.rooms);
      setError(null);
      // Clear previous chat when loading a new hotel
      setMessages([]);
      setInput("");
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 404) {
        setError("Hotel not found");
      } else {
        setError("Error loading hotel");
      }
    }
  };


  const sendMessage = async () => {
  if (!input.trim()) return;
  if (!hotel) {
    alert("Hotel data not loaded yet.");
    return;
  }

  const userMessage = {
    sender: "guest",
    text: input
  };

  setMessages([...messages, userMessage]);

  try {
    const requestBody = {
      hotel_id: hotel.hotel_id,
      query_text: input,
      // Send hotel context with room details so backend can create bookings
      hotelContext: {
        hotel_name: hotel.hotel_name,
        hotel_id: hotel.hotel_id,
        location: hotel.location,
        rooms: rooms.map(room => ({
          room_id: room.room_id,
          type: room.room_type,
          price: room.price_per_night,
          available: room.available_rooms,
          total: room.total_rooms
        }))
      }
    };
    
    // Include booking details if we have them
    if (bookingDetails) {
      requestBody.bookingDetails = bookingDetails;
    }
    
    const res = await axios.post(
      "http://localhost:3000/api/guest/query",
      requestBody
    );

    // The response has: intent, response, bookingDetails?, guestDetails?, booking_created?
    const aiResponse = res.data;
    
    const aiMessage = {
      sender: "ai",
      text: aiResponse.response || aiResponse.reply || "I couldn't generate a response.",
      intent: aiResponse.intent,
      bookingDetails: aiResponse.bookingDetails,
      guestDetails: aiResponse.guestDetails,
      booking_created: aiResponse.booking_created
    };

    setMessages(prev => [...prev, aiMessage]);

    // If we got booking details, save them for next message
    if (aiResponse.bookingDetails) {
      setBookingDetails(aiResponse.bookingDetails);
    }
    
    // If booking was just created, show confirmation and reset
    if (aiResponse.booking_created) {
      alert("✅ Booking confirmed! Thank you for choosing our hotel.");
      setBookingDetails(null);
      setMessages([]); // Clear chat
      setInput("");
      fetchHotel(); // Refresh room availability
    }

  } catch (err) {
    console.error(err);
    setMessages(prev => [...prev, {
      sender: "ai",
      text: "Sorry, I encountered an error. Please try again."
    }]);
  }

  setInput("");
};

  const handleBooking = async (room_id) => {
    try {
      await axios.post(
        "http://localhost:3000/api/bookings",
        {
          hotel_id: hotel.hotel_id,
          room_id,
          guest_name: guestName,
          guest_phone: guestPhone,
          check_in: "2026-03-20",
          check_out: "2026-03-21"
        }
      );

      alert("Booking confirmed!");

      fetchHotel(); // refresh availability

    } catch (err) {
      console.error(err);
      alert("Booking failed");
    }
  };

  if (!hotel) return <div>{error ? error : "Loading..."}</div>;

  return (
    <>
    <div style={{ padding: "40px" }}>

      {/* Hotel info */}
      <h1>{hotel.hotel_name}</h1>

      <p>{hotel.location}</p>

      <p>{hotel.description}</p>

      <hr />

      {/* Guest input */}
      <h3>Your Details</h3>

      <input
        placeholder="Your Name"
        onChange={(e) => setGuestName(e.target.value)}
      />

      <input
        placeholder="Phone Number"
        onChange={(e) => setGuestPhone(e.target.value)}
        style={{ marginLeft: "10px" }}
      />

      <hr />

      {/* Rooms */}
      <h2>Available Rooms</h2>

      {rooms.map((room) => (
        <div
          key={room.room_id}
          style={{
            border: "1px solid #ccc",
            padding: "15px",
            marginBottom: "10px"
          }}
        >

          <h3>{room.room_type}</h3>

          <p>Price: ₹{room.price_per_night}</p>

          <p>Available: {room.available_rooms}</p>

          <button
            disabled={room.available_rooms === 0}
            onClick={() => handleBooking(room.room_id)}
          >
            Book Now
          </button>

        </div>
      ))}

    </div>

 
    <hr />

<h2>AI Assistant</h2>

<div
  style={{
    border: "1px solid #ccc",
    height: "300px",
    padding: "10px",
    overflowY: "scroll",
    marginBottom: "10px"
  }}
>

  {messages.map((msg, index) => (
    <div key={index}>
      <b>{msg.sender === "guest" ? "You" : "AI"}:</b> {msg.text}
    </div>
  ))}

</div>

<input
  value={input}
  onChange={(e) => setInput(e.target.value)}
  placeholder="Ask something..."
  style={{ width: "300px", padding: "10px" }}
/>

<button
  onClick={sendMessage}
  style={{ marginLeft: "10px", padding: "10px" }}
>
  Send
</button>
</>
  );
}

export default HotelPage;
