// import { useEffect, useState } from "react";
// import axios from "axios";
// import { useParams } from "react-router-dom";

// function HotelPage() {
//   const { slug } = useParams();

//   const [messages, setMessages] = useState([]);
// const [input, setInput] = useState("");

//   const [hotel, setHotel] = useState(null);
//   const [rooms, setRooms] = useState([]);
//   const [error, setError] = useState(null);

//   const [guestName, setGuestName] = useState("");
//   const [guestPhone, setGuestPhone] = useState("");
//   const [checkInDate, setCheckInDate] = useState("");
//   const [checkOutDate, setCheckOutDate] = useState("");

//   // Track booking details during conversation
//   const [bookingDetails, setBookingDetails] = useState(null);
//   const [selectedRoomType, setSelectedRoomType] = useState("");
//   const [roomsCount, setRoomsCount] = useState(1);
//   const [adultsCount, setAdultsCount] = useState(1);
//   const [childrenCount, setChildrenCount] = useState(0);

//   useEffect(() => {
//     fetchHotel();
//   }, [slug]);

//   const fetchHotel = async () => {
//     try {
//       const res = await axios.get(
//         `http://localhost:3000/api/hotels/${slug}`
//       );

//       setHotel(res.data.hotel);
//       setRooms(res.data.rooms);
//       setError(null);
//       // Clear previous chat when loading a new hotel
//       setMessages([]);
//       setInput("");
//     } catch (err) {
//       console.error(err);
//       if (err.response && err.response.status === 404) {
//         setError("Hotel not found");
//       } else {
//         setError("Error loading hotel");
//       }
//     }
//   };


//   const sendMessage = async () => {
//   if (!input.trim()) return;
//   if (!hotel) {
//     alert("Hotel data not loaded yet.");
//     return;
//   }

//   const userMessage = {
//     sender: "guest",
//     text: input
//   };

//   setMessages([...messages, userMessage]);

//   try {
//     const requestBody = {
//       hotel_id: hotel.hotel_id,
//       query_text: input,
//       // Send hotel context with room details so backend can create bookings
//       hotelContext: {
//         hotel_name: hotel.hotel_name,
//         hotel_id: hotel.hotel_id,
//         location: hotel.location,
//         rooms: rooms.map(room => ({
//           room_id: room.room_id,
//           type: room.room_type,
//           price: room.price_per_night,
//           // available: room.available_rooms,
//           total: room.total_rooms
//         }))
//       }
//     };
    
//     // Include booking details if we have them
//     if (bookingDetails) {
//       requestBody.bookingDetails = bookingDetails;
//     }
    
//     const res = await axios.post(
//       "http://localhost:3000/api/guest/query",
//       requestBody
//     );

//     // The response has: intent, response, bookingDetails?, guestDetails?, booking_created?
//     const aiResponse = res.data;
    
//     const aiMessage = {
//       sender: "ai",
//       text: aiResponse.response || aiResponse.reply || "I couldn't generate a response.",
//       intent: aiResponse.intent,
//       bookingDetails: aiResponse.bookingDetails,
//       guestDetails: aiResponse.guestDetails,
//       booking_created: aiResponse.booking_created
//     };

//     setMessages(prev => [...prev, aiMessage]);

//     // If we got booking details, save them for next message
//     if (aiResponse.bookingDetails) {
//       setBookingDetails(aiResponse.bookingDetails);
//     }
    
//     // If booking was just created, show confirmation and reset
//     if (aiResponse.booking_created) {
//       alert("✅ Booking confirmed! Thank you for choosing our hotel.");
//       setBookingDetails(null);
//       setMessages([]); // Clear chat
//       setInput("");
//       fetchHotel(); // Refresh room availability
//     }

//   } catch (err) {
//     console.error(err);
//     setMessages(prev => [...prev, {
//       sender: "ai",
//       text: "Sorry, I encountered an error. Please try again."
//     }]);
//   }

//   setInput("");
// };

//   const handleBooking = async (room_id) => {
//     // basic validation
//     if (!guestName || !guestPhone || !checkInDate || !checkOutDate) {
//       alert("Please enter name, phone, check-in and check-out dates.");
//       return;
//     }

//     const inDate = new Date(checkInDate);
//     const outDate = new Date(checkOutDate);
//     if (outDate <= inDate) {
//       alert("Check-out date must be after check-in date.");
//       return;
//     }

//     try {
//       await axios.post(
//         "http://localhost:3000/api/bookings",
//         {
//           hotel_id: hotel.hotel_id,
//           room_id,
//           guest_name: guestName,
//           guest_phone: guestPhone,
//           check_in: checkInDate,
//           check_out: checkOutDate,
//           number_of_rooms: roomsCount,
//           adults: adultsCount,
//           children: childrenCount
//         }
//       );

//       alert("Booking confirmed!");
//       // reset selection
//       setSelectedRoomType("");
//       setCheckInDate("");
//       setCheckOutDate("");
//       setRoomsCount(1);
//       setAdultsCount(1);
//       setChildrenCount(0);

//       // refresh availability from server to reconcile any differences
//       fetchHotel();

//     } catch (err) {
//       console.error(err);
//       alert("Booking failed");
//     }
//   };

//   if (!hotel) return <div>{error ? error : "Loading..."}</div>;

//   return (
//     <>
//     <div style={{ padding: "40px" }}>

//       {/* Hotel info */}
//       <h1>{hotel.hotel_name}</h1>

//       <p>{hotel.location}</p>

//       <p>{hotel.description}</p>

//       <hr />

      

    
//       <h2>Available Rooms</h2>

//       {rooms.map((room) => (
//         <div
//           key={room.room_id}
//           style={{
//             border: "1px solid #ccc",
//             padding: "15px",
//             marginBottom: "10px"
//           }}
//         >

//           <h3>{room.room_type}</h3>

//           <p>Price: ₹{room.price_per_night}</p>

//           <p>Available: {room.available_rooms}</p>

//         </div>
//       ))}
//     <h3>Your Details</h3>

//       <input
//         placeholder="Your Name"
//         value={guestName}
//         onChange={(e) => setGuestName(e.target.value)}
//       />

//       <input
//         placeholder="Phone Number"
//         value={guestPhone}
//         onChange={(e) => setGuestPhone(e.target.value)}
//         style={{ marginLeft: "10px" }}
//       />

//       <div style={{ marginTop: "10px" }}>
//         <label style={{ marginRight: 8 }}>Check-in:</label>
//         <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
//         <label style={{ marginLeft: 12, marginRight: 8 }}>Check-out:</label>
//         <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
//       </div>

//       <div style={{ marginTop: 12, display: "flex", gap: 24, alignItems: "center" }}>
//         <div>
//           <div style={{ fontSize: 12, color: "#666" }}>Rooms</div>
//           <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
//             <button onClick={() => setRoomsCount(c => Math.max(1, c - 1))}>-</button>
//             <div style={{ width: 32, textAlign: "center" }}>{roomsCount}</div>
//             <button onClick={() => setRoomsCount(c => c + 1)}>+</button>
//           </div>
//         </div>

//         <div>
//           <div style={{ fontSize: 12, color: "#666" }}>Adults</div>
//           <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
//             <button onClick={() => setAdultsCount(c => Math.max(1, c - 1))}>-</button>
//             <div style={{ width: 32, textAlign: "center" }}>{adultsCount}</div>
//             <button onClick={() => setAdultsCount(c => c + 1)}>+</button>
//           </div>
//         </div>

//         <div>
//           <div style={{ fontSize: 12, color: "#666" }}>Children</div>
//           <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
//             <button onClick={() => setChildrenCount(c => Math.max(0, c - 1))}>-</button>
//             <div style={{ width: 32, textAlign: "center" }}>{childrenCount}</div>
//             <button onClick={() => setChildrenCount(c => c + 1)}>+</button>
//           </div>
//         </div>
//       </div>

//       <hr />

//       <select value={selectedRoomType} onChange={(e) => setSelectedRoomType(e.target.value)} style={{ marginTop: "10px" }}>
//         <option value="">Select Room Type</option>
//         {rooms.map(room => (
//           <option key={room.room_id} value={room.room_type}>{room.room_type} - ₹{room.price_per_night}</option>
//         ))}
//       </select>

//       <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
//         <div style={{ marginRight: 12 }}>
//           <strong>Guests:</strong> {roomsCount} Room(s), {adultsCount} Adult(s), {childrenCount} Child(ren)
//         </div>
//         <button onClick={() => {
//           if (!selectedRoomType) {
//             alert("Please select a room type");
//             return;
//           }
//           const room = rooms.find(r => r.room_type === selectedRoomType);
//           if (!room) return;
//           if (roomsCount > room.available_rooms) {
//             alert(`Only ${room.available_rooms} room(s) available for the selected type.`);
//             return;
//           }
//           handleBooking(room.room_id);
//         }} style={{ marginLeft: "10px" }}>
//           Book Now
//         </button>
//       </div>

//     </div>

 
//     <hr />

// <h2>AI Assistant</h2>

// <div
//   style={{
//     border: "1px solid #ccc",
//     height: "300px",
//     padding: "10px",
//     overflowY: "scroll",
//     marginBottom: "10px"
//   }}
// >

//   {messages.map((msg, index) => (
//     <div key={index}>
//       <b>{msg.sender === "guest" ? "You" : "AI"}:</b> {msg.text}
//     </div>
//   ))}

// </div>

// <input
//   value={input}
//   onChange={(e) => setInput(e.target.value)}
//   placeholder="Ask something..."
//   style={{ width: "300px", padding: "10px" }}
// />

// <button
//   onClick={sendMessage}
//   style={{ marginLeft: "10px", padding: "10px" }}
// >
//   Send
// </button>
// </>
//   );
// }

// export default HotelPage;


// import { useState, useEffect } from "react";
// import { useParams } from "react-router-dom";
// import axios from "axios";

// function HotelPage() {
//   const { slug } = useParams();
//   const [hotel, setHotel] = useState(null);
//   const [rooms, setRooms] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // Date selection is now MANDATORY for dynamic pricing and availability
//   const [checkIn, setCheckIn] = useState(new Date().toISOString().split("T")[0]);
//   const [checkOut, setCheckOut] = useState("");

//   // AI Chatbot State
//   const [isChatOpen, setIsChatOpen] = useState(false);
//   const [chatInput, setChatInput] = useState("");
//   const [chatHistory, setChatHistory] = useState([
//     { sender: "ai", text: "Hi! I'm the AI Receptionist. How can I help you with your booking?" }
//   ]);

//   // Fetch data whenever the slug or the check-in date changes
//   useEffect(() => {
//     fetchHotelData();
//   }, [slug, checkIn]);

//   const fetchHotelData = async () => {
//     try {
//       setLoading(true);
//       // We pass the checkIn date to trigger the COALESCE SQL query on the backend
//       const res = await axios.get(`http://localhost:3000/api/hotels/${slug}?date=${checkIn}`);
//       setHotel(res.data.hotel);
//       setRooms(res.data.rooms);
//     } catch (err) {
//       console.error(err);
//       alert("Failed to load hotel details.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleBookRoom = async (roomId) => {
//     if (!checkIn || !checkOut) {
//       alert("Please select both Check-In and Check-Out dates first.");
//       return;
//     }

//     const guestName = prompt("Enter your full name:");
//     const guestPhone = prompt("Enter your phone number:");

//     if (!guestName || !guestPhone) return;

//     try {
//       await axios.post("http://localhost:3000/api/bookings", {
//         hotel_id: hotel.hotel_id,
//         room_id: roomId,
//         guest_name: guestName,
//         guest_phone: guestPhone,
//         check_in: checkIn,
//         check_out: checkOut,
//         number_of_rooms: 1
//       });
//       alert("✅ Booking Confirmed!");
//       fetchHotelData(); // Refresh to update availability
//     } catch (err) {
//       alert("❌ Booking Failed: " + (err.response?.data?.message || err.message));
//     }
//   };

//   const handleSendMessage = async () => {
//     if (!chatInput.trim()) return;
    
//     const newHistory = [...chatHistory, { sender: "user", text: chatInput }];
//     setChatHistory(newHistory);
//     setChatInput("");

//     try {
//       const res = await axios.post("http://localhost:3000/api/guest/query", {
//         hotel_id: hotel.hotel_id,
//         query_text: chatInput,
//         history: newHistory
//       });

//       setChatHistory([...newHistory, { sender: "ai", text: res.data.reply }]);
//     } catch (err) {
//       setChatHistory([...newHistory, { sender: "ai", text: "Sorry, I am having trouble connecting to the front desk right now." }]);
//     }
//   };

//   if (loading || !hotel) return <div style={{ padding: "50px", textAlign: "center" }}>Loading property details...</div>;

//   return (
//     <div style={{ fontFamily: "system-ui, sans-serif", color: "#333", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      
//       {/* 1. WHITE-LABEL HERO SECTION */}
//       <header style={{ backgroundColor: "#1f2937", color: "white", padding: "60px 20px", textAlign: "center" }}>
//         <h1 style={{ fontSize: "48px", margin: "0 0 10px 0" }}>{hotel.hotel_name}</h1>
//         <p style={{ fontSize: "18px", color: "#9ca3af", margin: "0" }}>📍 {hotel.location} | {hotel.address}</p>
//       </header>

//       <main style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px" }}>
        
//         {/* 2. DATE PICKER (Drives the dynamic pricing) */}
//         <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", marginBottom: "30px", display: "flex", gap: "20px", alignItems: "center" }}>
//           <div>
//             <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Check-In Date</label>
//             <input 
//               type="date" 
//               value={checkIn} 
//               onChange={(e) => setCheckIn(e.target.value)}
//               min={new Date().toISOString().split("T")[0]}
//               style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
//             />
//           </div>
//           <div>
//             <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Check-Out Date</label>
//             <input 
//               type="date" 
//               value={checkOut} 
//               onChange={(e) => setCheckOut(e.target.value)}
//               min={checkIn}
//               style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
//             />
//           </div>
//           <div style={{ alignSelf: "flex-end", paddingBottom: "10px", color: "#6b7280", fontSize: "14px" }}>
//             *Prices adjust dynamically based on your selected check-in date.
//           </div>
//         </div>

//         {/* 3. ROOMS LIST */}
//         <h2>Available Rooms</h2>
//         <div style={{ display: "grid", gap: "20px" }}>
//           {rooms.map((room) => (
//             <div key={room.room_id} style={{ backgroundColor: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//               <div>
//                 <h3 style={{ margin: "0 0 8px 0", fontSize: "24px" }}>{room.room_type}</h3>
//                 <p style={{ margin: 0, color: "#4b5563" }}>
//                   {/* Notice how we use price_per_night which now contains the COALESCE logic */}
//                   <span style={{ fontSize: "24px", fontWeight: "bold", color: "#111827" }}>₹{room.price_per_night}</span> / night
//                 </p>
//               </div>
//               <button 
//                 onClick={() => handleBookRoom(room.room_id)}
//                 style={{ padding: "12px 24px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}
//               >
//                 Book Now
//               </button>
//             </div>
//           ))}
//         </div>
//       </main>

//       {/* 4. FLOATING AI CHATBOT WIDGET */}
//       <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 1000 }}>
//         {isChatOpen ? (
//           <div style={{ width: "350px", height: "500px", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
//             <div style={{ backgroundColor: "#1f2937", color: "white", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//               <span style={{ fontWeight: "bold" }}>AI Receptionist</span>
//               <button onClick={() => setIsChatOpen(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "20px" }}>×</button>
//             </div>
            
//             <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "#f3f4f6" }}>
//               {chatHistory.map((msg, i) => (
//                 <div key={i} style={{ alignSelf: msg.sender === "user" ? "flex-end" : "flex-start", backgroundColor: msg.sender === "user" ? "#2563eb" : "#e5e7eb", color: msg.sender === "user" ? "white" : "black", padding: "10px 14px", borderRadius: "8px", maxWidth: "80%" }}>
//                   {msg.text}
//                 </div>
//               ))}
//             </div>

//             <div style={{ padding: "12px", borderTop: "1px solid #e5e7eb", display: "flex", gap: "8px" }}>
//               <input 
//                 type="text" 
//                 value={chatInput} 
//                 onChange={(e) => setChatInput(e.target.value)} 
//                 onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
//                 placeholder="Ask about rooms or book..." 
//                 style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
//               />
//               <button onClick={handleSendMessage} style={{ padding: "10px 16px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
//                 Send
//               </button>
//             </div>
//           </div>
//         ) : (
//           <button 
//             onClick={() => setIsChatOpen(true)}
//             style={{ width: "60px", height: "60px", borderRadius: "30px", backgroundColor: "#2563eb", color: "white", border: "none", boxShadow: "0 4px 12px rgba(37,99,235,0.4)", cursor: "pointer", fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}
//           >
//             💬
//           </button>
//         )}
//       </div>

//     </div>
//   );
// }

// export default HotelPage;

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

function HotelPage() {
  const { slug } = useParams();
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Date Selection State
  const [checkIn, setCheckIn] = useState(new Date().toISOString().split("T")[0]);
  const [checkOut, setCheckOut] = useState("");

  // 2. Booking Form State (Replaces the prompt alerts)
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    guestName: "",
    guestPhone: "",
    numRooms: 1,
    adults: 2,
    children: 0
  });

  // lightbox state (room id + photo index)
  const [lightbox, setLightbox] = useState({ roomId: null, index: 0 });


  // 3. AI Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { sender: "ai", text: "Hi! I'm the AI Receptionist. How can I help you with your booking?" }
  ]);

  useEffect(() => {
    fetchHotelData();
  }, [slug, checkIn]);

  const fetchHotelData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:3000/api/hotels/${slug}?date=${checkIn}`);
      setHotel(res.data.hotel);
      setRooms(res.data.rooms);
    } catch (err) {
      console.error(err);
      alert("Failed to load hotel details.");
    } finally {
      setLoading(false);
    }
  };

  // Handles input changes for the booking form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails(prev => ({ ...prev, [name]: value }));
  };

  // Submits the actual booking
  const submitBooking = async () => {
    if (!checkIn || !checkOut) {
      alert("Please select both Check-In and Check-Out dates at the top of the page.");
      return;
    }
    if (!bookingDetails.guestName || !bookingDetails.guestPhone) {
      alert("Please enter your name and phone number.");
      return;
    }

    try {
      await axios.post("http://localhost:3000/api/bookings", {
        hotel_id: hotel.hotel_id,
        room_id: selectedRoomId,
        guest_name: bookingDetails.guestName,
        guest_phone: bookingDetails.guestPhone,
        check_in: checkIn,
        check_out: checkOut,
        number_of_rooms: bookingDetails.numRooms,
        // Note: You can pass adults/children here if you update your backend later
        // adults: bookingDetails.adults,
        // children: bookingDetails.children
      });
      
      alert("✅ Booking Confirmed!");
      setSelectedRoomId(null); // Close the form
      setBookingDetails({ guestName: "", guestPhone: "", numRooms: 1, adults: 2, children: 0 }); // Reset
      fetchHotelData(); // Refresh availability
    } catch (err) {
      alert("❌ Booking Failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const newHistory = [...chatHistory, { sender: "user", text: chatInput }];
    setChatHistory(newHistory);
    setChatInput("");

    try {
      const res = await axios.post("http://localhost:3000/api/guest/query", {
        hotel_id: hotel.hotel_id,
        query_text: chatInput,
        history: newHistory
      });

      setChatHistory([...newHistory, { sender: "ai", text: res.data.reply }]);
    } catch (err) {
      setChatHistory([...newHistory, { sender: "ai", text: "Sorry, I am having trouble connecting to the front desk right now." }]);
    }
  };

  if (loading || !hotel) return <div style={{ padding: "50px", textAlign: "center" }}>Loading property details...</div>;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#333", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      
      {/* WHITE-LABEL HERO SECTION */}
      <header style={{ backgroundColor: "#1f2937", color: "white", padding: "60px 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "48px", margin: "0 0 10px 0" }}>{hotel.hotel_name}</h1>
        <p style={{ fontSize: "18px", color: "#9ca3af", margin: "0" }}>📍 {hotel.location} | {hotel.address}</p>
      </header>

      <main style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px" }}>
        
        {/* DATE PICKER */}
        <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", marginBottom: "30px", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>Check-In Date</label>
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} min={new Date().toISOString().split("T")[0]} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Check-Out Date</label>
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn} style={inputStyle} />
          </div>
          <div style={{ alignSelf: "flex-end", paddingBottom: "10px", color: "#6b7280", fontSize: "14px" }}>
            *Prices adjust dynamically based on your selected dates.
          </div>
        </div>

        {/* ROOMS LIST */}
        <h2>Available Rooms</h2>
        <div style={{ display: "grid", gap: "20px" }}>
          {rooms.map((room) => (
            <div key={room.room_id} style={{ backgroundColor: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              
              {/* Room Header Info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "24px" }}>{room.room_type}</h3>
                  <p style={{ margin: 0, color: "#4b5563" }}>
                    <span style={{ fontSize: "24px", fontWeight: "bold", color: "#111827" }}>₹{room.price_per_night}</span> / night
                  </p>
                  {room.capacity && (
                    <p style={{ margin: "2px 0 0 0", fontSize: "14px", color: "#6b7280" }}>
                      Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'persons'}
                    </p>
                  )}
                </div>

                {selectedRoomId !== room.room_id && (
                  <button onClick={() => setSelectedRoomId(room.room_id)} style={primaryButtonStyle}>
                    Book Room
                  </button>
                )}
              </div>

              {/* description, amenities and pictures */}
              {room.description && (
                <p style={{ margin: "12px 0" }}>{room.description}</p>
              )}
              {room.amenities && room.amenities.length > 0 && (
                <div style={{ margin: "8px 0" }}>
                  {room.amenities.map((a, i) => (
                    <span
                      key={i}
                      style={{
                        display: "inline-block",
                        backgroundColor: "#e5e7eb",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        margin: "0 6px 6px 0",
                        fontSize: "13px",
                        color: "#374151"
                      }}
                    >{a}</span>
                  ))}
                </div>
              )}
              {room.pictures && room.pictures.length > 0 && (
                <div style={{ position: "relative", marginTop: "10px" }}>
                  <img
                    src={room.pictures[0].picture_url}
                    alt="Room"
                    onClick={() => setLightbox({ roomId: room.room_id, index: 0 })}
                    style={{
                      width: "180px",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "5px",
                      cursor: "pointer",
                      border: "2px solid transparent"
                    }}
                  />
                  {room.pictures.length > 1 && (
                    <span style={{
                      position: "absolute",
                      bottom: "4px",
                      right: "4px",
                      backgroundColor: "rgba(0,0,0,0.6)",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      zIndex: 1
                    }}>
                      +{room.pictures.length - 1}
                    </span>
                  )}
                </div>
              )}
              {selectedRoomId === room.room_id && (
                <div style={{ marginTop: "16px" }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <input type="text" name="guestName" value={bookingDetails.guestName} onChange={handleInputChange} placeholder="John Doe" style={{...inputStyle, width: "100%"}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone Number</label>
                      <input type="tel" name="guestPhone" value={bookingDetails.guestPhone} onChange={handleInputChange} placeholder="+91 9876543210" style={{...inputStyle, width: "100%"}} />
                    </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                    <div>
                      <label style={labelStyle}>Rooms</label>
                      <select name="numRooms" value={bookingDetails.numRooms} onChange={handleInputChange} style={{...inputStyle, width: "100%"}}>
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Adults</label>
                      <select name="adults" value={bookingDetails.adults} onChange={handleInputChange} style={{...inputStyle, width: "100%"}}>
                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Children</label>
                      <select name="children" value={bookingDetails.children} onChange={handleInputChange} style={{...inputStyle, width: "100%"}}>
                        {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    <button onClick={() => setSelectedRoomId(null)} style={secondaryButtonStyle}>Cancel</button>
                    <button onClick={submitBooking} style={{...primaryButtonStyle, padding: "12px 32px"}}>Confirm Booking</button>
                  </div>
                </div>
              )}            </div>
          ))}
        </div>
      </main>

      {/* lightbox overlay */}
      {lightbox.roomId !== null && (() => {
        const room = rooms.find(r => r.room_id === lightbox.roomId);
        if (!room) return null;
        const pics = room.pictures || [];
        const pic = pics[lightbox.index];
        return (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }} onClick={() => setLightbox({ roomId: null, index: 0 })}>
            <button onClick={e => {e.stopPropagation(); setLightbox(prev=>({roomId:prev.roomId,index:(prev.index-1+pics.length)%pics.length}))}} style={{position:"absolute",left:20,fontSize:30,color:"white",background:"none",border:"none",cursor:"pointer"}}>&larr;</button>
            <img src={pic.picture_url} alt="Large" style={{maxWidth:"90%",maxHeight:"90%",borderRadius:"6px"}} onClick={e=>e.stopPropagation()} />
            <button onClick={e => {e.stopPropagation(); setLightbox(prev=>({roomId:prev.roomId,index:(prev.index+1)%pics.length}))}} style={{position:"absolute",right:20,fontSize:30,color:"white",background:"none",border:"none",cursor:"pointer"}}>&rarr;</button>
          </div>
        );
      })()}

      {/* FLOATING AI CHATBOT WIDGET */}
      <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 1000 }} >
        {isChatOpen ? (
          <div style={{ width: "350px", height: "500px", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ backgroundColor: "#1f2937", color: "white", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "bold" }}>AI Receptionist</span>
              <button onClick={() => setIsChatOpen(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "20px" }}>×</button>
            </div>
            
            <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "#f3f4f6" }}>
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.sender === "user" ? "flex-end" : "flex-start", backgroundColor: msg.sender === "user" ? "#2563eb" : "#e5e7eb", color: msg.sender === "user" ? "white" : "black", padding: "10px 14px", borderRadius: "8px", maxWidth: "80%" }}>
                  {msg.text}
                </div>
              ))}
            </div>

            <div style={{ padding: "12px", borderTop: "1px solid #e5e7eb", display: "flex", gap: "8px" }}>
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about rooms or book..." 
                style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
              />
              <button onClick={handleSendMessage} style={{ padding: "10px 16px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                Send
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsChatOpen(true)}
            style={{ width: "60px", height: "60px", borderRadius: "30px", backgroundColor: "#2563eb", color: "white", border: "none", boxShadow: "0 4px 12px rgba(37,99,235,0.4)", cursor: "pointer", fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            💬
          </button>
        )}
      </div>
    </div>
  );
}

// --- REUSABLE STYLES ---
const labelStyle = {
  display: "block", 
  fontSize: "14px", 
  fontWeight: "bold", 
  marginBottom: "8px",
  color: "#374151"
};

const inputStyle = {
  padding: "10px", 
  borderRadius: "6px", 
  border: "1px solid #d1d5db",
  boxSizing: "border-box"
};

const primaryButtonStyle = {
  padding: "10px 20px", 
  backgroundColor: "#2563eb", 
  color: "white", 
  border: "none", 
  borderRadius: "6px", 
  fontSize: "16px", 
  fontWeight: "bold", 
  cursor: "pointer"
};

const secondaryButtonStyle = {
  padding: "10px 20px", 
  backgroundColor: "white", 
  color: "#4b5563", 
  border: "1px solid #d1d5db", 
  borderRadius: "6px", 
  fontSize: "16px", 
  fontWeight: "bold", 
  cursor: "pointer"
};

export default HotelPage;