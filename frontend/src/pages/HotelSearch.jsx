import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function HotelSearch() {
  const [query, setQuery] = useState("");
  const [hotels, setHotels] = useState([]);

  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      const res = await axios.get(
        `http://localhost:3000/api/hotels/search?q=${query}`
      );

      setHotels(res.data.results);

    } catch (err) {
      console.error(err);
      alert("Error fetching hotels");
    }
  };

  return (
    
    <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h1>Smart Hospitality Platform</h1>
          <h3>Find Hotels Near You</h3>
        </div>
        <button
          onClick={() => navigate("/register-hotel")}
          style={{ 
            padding: "12px 20px", 
            margin:"150px",
            backgroundColor: "#4CAF50", 
            color: "white", 
            border: "none", 
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold"
          }}
        >
          Register Hotel
        </button>
      </div>

      {/* Search box */}
      <input
        placeholder="Enter city or hotel name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: "10px", width: "250px" }}
      />

      <button
        onClick={handleSearch}
        style={{ marginLeft: "10px", padding: "10px" }}
      >
        Search
      </button>

      {/* Results */}
      <div style={{ marginTop: "30px" }}>
        {hotels.map((hotel) => (
          <div
            key={hotel.hotel_id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              marginBottom: "10px",
              cursor: "pointer"
            }}
            onClick={() => navigate(`/hotel/${hotel.slug}`)}
          >
            <h3>{hotel.hotel_name}</h3>
            <p>{hotel.location}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HotelSearch;
