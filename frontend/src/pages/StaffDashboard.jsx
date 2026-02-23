import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PricingOptimizer from "./PricingOptimizer";


function StaffDashboard() {

  const [analytics, setAnalytics] = useState({});
  const [bookings, setBookings] = useState([]);
  const [showPricing, setShowPricing] = useState(false);

    const navigate = useNavigate();
  useEffect(() => {

    fetchAnalytics();
    fetchBookings();

  }, []);

  const fetchAnalytics = async () => {

    try {

      const token = localStorage.getItem("token");

      const res = await axios.get(
        "http://localhost:3000/api/staff/analytics",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setAnalytics(res.data);

    } catch (err) {

      console.error(err);

    }

  };

  const fetchBookings = async () => {

    try {

      const token = localStorage.getItem("token");

      const res = await axios.get(
        "http://localhost:3000/api/staff/bookings",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setBookings(res.data);

    } catch (err) {

      console.error(err);

    }

  };

  return (
    <div style={{ padding: "40px" }}>
      {showPricing ? (
        <>
          <button onClick={() => setShowPricing(false)} style={{ marginBottom: "16px" }}>
            Back to Dashboard
          </button>
          <PricingOptimizer />
        </>
      ) : (
        <>
          <button onClick={() => navigate("/rooms")} style={{ marginBottom: "16px" }}>
            Manage Rooms
          </button>

          <button onClick={() => setShowPricing(true)} style={{ marginBottom: "16px" }}>
            Pricing Optimizer
          </button>
    
          <h1>Staff Dashboard</h1>

          {/* Analytics */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>

            {/* <div style={cardStyle}>
              <h3>Total Bookings</h3>
              <p>{analytics.total_bookings || 0}</p>
            </div> */}

            <div style={cardStyle}>
              <h3>Total Revenue</h3>
              <p>₹{analytics.total_revenue || 0}</p>
            </div>

            <div style={cardStyle}>
              <h3>Popular Room</h3>
              <p>
                {analytics.most_popular_room
                  ? analytics.most_popular_room.room_type
                  : "N/A"}
              </p>
            </div>

          </div>

          {/* Bookings */}
          <h2>Bookings</h2>

          <table border="1" cellPadding="10">

            <thead>

              <tr>
                <th>Guest</th>
                <th>Phone</th>
                <th>Room</th>
                {/* <th>Status</th> */}
              </tr>

            </thead>

            <tbody>

              {bookings.map((b) => (
                <tr key={b.booking_id}>
                  <td>{b.guest_name}</td>
                  <td>{b.guest_phone}</td>
                  <td>{b.room_type}</td>
                  {/* <td>{b.status}</td> */}
                </tr>
              ))}

            </tbody>

          </table>
        </>
      )}
    </div>
  );

}

const cardStyle = {
  border: "1px solid #ccc",
  padding: "20px",
  width: "200px"
};

export default StaffDashboard;
