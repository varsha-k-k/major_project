
import { useState, useEffect } from "react";
import axios from "axios";

function RoomManagement() {
  const [rooms, setRooms] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    room_type: "",
    description: "",
    capacity: 2,
    price_per_night: 0,
    total_rooms: 1,
    amenities: [],
  });

  // State to hold selected image files
  const [pictures, setPictures] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  const amenityOptions = [
    "WiFi", "Air Conditioning", "TV", "Private Bathroom",
    "Bathtub", "Shower", "Minibar", "Room Service",
    "Safe", "Work Desk",
  ];

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3000/api/rooms",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRooms(response.data || []);
    } catch (err) {
      console.error("Error fetching rooms:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle file selection
  const handlePictureChange = (e) => {
    setPictures(e.target.files);
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();

    if (!formData.room_type || !formData.description || !formData.price_per_night) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      // Use FormData to send files and text data together
      const data = new FormData();
      data.append("room_type", formData.room_type);
      data.append("description", formData.description);
      data.append("capacity", formData.capacity);
      data.append("price_per_night", formData.price_per_night);
      data.append("total_rooms", formData.total_rooms);
      
      // Append each selected amenity
      selectedAmenities.forEach(amenity => {
        data.append("amenities", amenity);
      });

      // Append each selected picture file
      for (let i = 0; i < pictures.length; i++) {
        data.append("room_images", pictures[i]);
      }

      if (editingRoom) {
        // For editing, we'll use the same endpoint but a PUT request.
        // Note: Updating images on edit is more complex and might require a separate endpoint/logic.
        // For this example, we'll focus on adding new rooms with images.
        alert("Editing with image replacement is not implemented in this demo.");
        return;
      } else {
        // Create new room with images
        await axios.post("http://localhost:3000/api/rooms", data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data" // Important header for file uploads
          },
        });
        alert("✅ Room added with pictures!");
      }

      // Reset form and state
      setShowAddForm(false);
      setEditingRoom(null);
      setFormData({
        room_type: "", description: "", capacity: 2,
        price_per_night: 0, total_rooms: 1, amenities: [],
      });
      setSelectedAmenities([]);
      setPictures([]);

      // Refresh rooms list
      fetchRooms();
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setFormData({
      room_type: room.room_type,
      description: room.description || "",
      capacity: room.capacity || 2,
      price_per_night: room.price_per_night,
      total_rooms: room.total_rooms,
      amenities: room.amenities || [],
    });
    setSelectedAmenities(room.amenities || []);
    // Note: We don't set pictures here for editing in this simple version
    setShowAddForm(true);
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:3000/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ Room deleted!");
      fetchRooms();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return <div style={{ padding: "20px" }}>Loading rooms...</div>;

  return (
    <div style={{ padding: "40px" }}>
      <h1>🛏️ Room Management</h1>

      <button
        onClick={() => {
          setShowAddForm(!showAddForm);
          setEditingRoom(null);
          setFormData({
            room_type: "", description: "", capacity: 2,
            price_per_night: 0, total_rooms: 1, amenities: [],
          });
          setSelectedAmenities([]);
          setPictures([]);
        }}
        style={{
          padding: "12px 24px", backgroundColor: "#28a745", color: "white",
          border: "none", borderRadius: "5px", cursor: "pointer",
          marginBottom: "20px", fontSize: "16px",
        }}
      >
        {showAddForm ? "Cancel" : "+ Add New Room"}
      </button>

      {/* ADD/EDIT FORM */}
      {showAddForm && (
        <div style={{
          border: "2px solid #007bff", padding: "30px", marginBottom: "30px",
          borderRadius: "8px", backgroundColor: "#f9f9f9",
        }}>
          <h2>{editingRoom ? "Edit Room" : "Add New Room"}</h2>
          <form onSubmit={handleAddRoom}>
            {/* ... (Existing input fields for room_type, description, capacity, price, total_rooms) ... */}
            {/* I'm omitting them for brevity, but keep them in your code! */}
            <div style={{ marginBottom: "15px" }}>
              <label><strong>Room Name/Type *</strong></label>
              <input type="text" value={formData.room_type} onChange={(e) => setFormData({ ...formData, room_type: e.target.value })} style={inputStyle} required />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label><strong>Description *</strong></label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{...inputStyle, minHeight: "100px", fontFamily: "Arial"}} required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
              <div>
                <label><strong>Guest Capacity *</strong></label>
                <input type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })} style={inputStyle} />
              </div>
              <div>
                <label><strong>Price Per Night (₹) *</strong></label>
                <input type="number" min="0" value={formData.price_per_night} onChange={(e) => setFormData({ ...formData, price_per_night: parseInt(e.target.value) })} style={inputStyle} required />
              </div>
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label><strong>Total Rooms Available *</strong></label>
              <input type="number" min="1" value={formData.total_rooms} onChange={(e) => setFormData({ ...formData, total_rooms: parseInt(e.target.value) })} style={inputStyle} required />
            </div>

            {/* --- NEW: PICTURE UPLOAD FIELD --- */}
            <div style={{ marginBottom: "15px" }}>
              <label><strong>Room Pictures (Max 5)</strong></label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePictureChange}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label><strong>Amenities</strong></label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "10px" }}>
                {amenityOptions.map((amenity) => (
                  <label key={amenity}>
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAmenities([...selectedAmenities, amenity]);
                        } else {
                          setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
                        }
                      }}
                    />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" style={{
              padding: "12px 24px", backgroundColor: "#007bff", color: "white",
              border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px",
            }}>
              {editingRoom ? "Update Room" : "Create Room"}
            </button>
          </form>
        </div>
      )}

      {/* ROOMS LIST (Displays uploaded pictures) */}
      <h2>Your Rooms ({rooms.length})</h2>
      {rooms.length === 0 ? (
        <p style={{ color: "#666" }}>No rooms added yet. Click "Add New Room" to get started.</p>
      ) : (
        <div>
          {rooms.map((room) => (
            <div key={room.room_id} style={{
              border: "1px solid #ddd", padding: "20px", marginBottom: "20px",
              borderRadius: "8px", backgroundColor: "#fafafa",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
                <div>
                  <h3>{room.room_type}</h3>
                  <p>{room.description}</p>
                  {/* ... other room details ... */}
                  {room.amenities && room.amenities.length > 0 && (
                    <p><strong>Amenities:</strong> {Array.isArray(room.amenities) ? room.amenities.join(", ") : room.amenities}</p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <button onClick={() => handleEditRoom(room)} style={{...actionButtonStyle, backgroundColor: "#ffc107", color: "black"}}>Edit</button>
                  <button onClick={() => handleDeleteRoom(room.room_id)} style={{...actionButtonStyle, backgroundColor: "#dc3545", color: "white"}}>Delete</button>
                </div>
              </div>

              {/* Display Uploaded Pictures */}
              <div style={{ marginTop: "15px", borderTop: "1px solid #ddd", paddingTop: "15px" }}>
                <h4>Room Pictures</h4>
                {room.pictures && room.pictures.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                    {room.pictures.map((pic) => (
                      <img
                        key={pic.picture_id}
                        src={pic.picture_url} // This URL is now a full localhost URL from the backend
                        alt="Room"
                        style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "5px" }}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{color: "#777"}}>No pictures added for this room.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px", marginTop: "5px",
  boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "4px"
};
const actionButtonStyle = {
  padding: "8px 16px", border: "none", borderRadius: "5px",
  cursor: "pointer", marginBottom: "10px", width: "100%"
};

export default RoomManagement;