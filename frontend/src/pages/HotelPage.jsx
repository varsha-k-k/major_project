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
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");

  // Track booking details during conversation
  const [bookingDetails, setBookingDetails] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [roomsCount, setRoomsCount] = useState(1);
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);

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
          // available: room.available_rooms,
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
    // basic validation
    if (!guestName || !guestPhone || !checkInDate || !checkOutDate) {
      alert("Please enter name, phone, check-in and check-out dates.");
      return;
    }

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    if (outDate <= inDate) {
      alert("Check-out date must be after check-in date.");
      return;
    }

    try {
      await axios.post(
        "http://localhost:3000/api/bookings",
        {
          hotel_id: hotel.hotel_id,
          room_id,
          guest_name: guestName,
          guest_phone: guestPhone,
          check_in: checkInDate,
          check_out: checkOutDate,
          number_of_rooms: roomsCount,
          adults: adultsCount,
          children: childrenCount
        }
      );

      alert("Booking confirmed!");
      // reset selection
      setSelectedRoomType("");
      setCheckInDate("");
      setCheckOutDate("");
      setRoomsCount(1);
      setAdultsCount(1);
      setChildrenCount(0);

      // refresh availability from server to reconcile any differences
      fetchHotel();

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

        </div>
      ))}
    <h3>Your Details</h3>

      <input
        placeholder="Your Name"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
      />

      <input
        placeholder="Phone Number"
        value={guestPhone}
        onChange={(e) => setGuestPhone(e.target.value)}
        style={{ marginLeft: "10px" }}
      />

      <div style={{ marginTop: "10px" }}>
        <label style={{ marginRight: 8 }}>Check-in:</label>
        <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
        <label style={{ marginLeft: 12, marginRight: 8 }}>Check-out:</label>
        <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 24, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "#666" }}>Rooms</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
            <button onClick={() => setRoomsCount(c => Math.max(1, c - 1))}>-</button>
            <div style={{ width: 32, textAlign: "center" }}>{roomsCount}</div>
            <button onClick={() => setRoomsCount(c => c + 1)}>+</button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#666" }}>Adults</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
            <button onClick={() => setAdultsCount(c => Math.max(1, c - 1))}>-</button>
            <div style={{ width: 32, textAlign: "center" }}>{adultsCount}</div>
            <button onClick={() => setAdultsCount(c => c + 1)}>+</button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#666" }}>Children</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
            <button onClick={() => setChildrenCount(c => Math.max(0, c - 1))}>-</button>
            <div style={{ width: 32, textAlign: "center" }}>{childrenCount}</div>
            <button onClick={() => setChildrenCount(c => c + 1)}>+</button>
          </div>
        </div>
      </div>

      <hr />

      <select value={selectedRoomType} onChange={(e) => setSelectedRoomType(e.target.value)} style={{ marginTop: "10px" }}>
        <option value="">Select Room Type</option>
        {rooms.map(room => (
          <option key={room.room_id} value={room.room_type}>{room.room_type} - ₹{room.price_per_night}</option>
        ))}
      </select>

      <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
        <div style={{ marginRight: 12 }}>
          <strong>Guests:</strong> {roomsCount} Room(s), {adultsCount} Adult(s), {childrenCount} Child(ren)
        </div>
        <button onClick={() => {
          if (!selectedRoomType) {
            alert("Please select a room type");
            return;
          }
          const room = rooms.find(r => r.room_type === selectedRoomType);
          if (!room) return;
          if (roomsCount > room.available_rooms) {
            alert(`Only ${room.available_rooms} room(s) available for the selected type.`);
            return;
          }
          handleBooking(room.room_id);
        }} style={{ marginLeft: "10px" }}>
          Book Now
        </button>
      </div>

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
