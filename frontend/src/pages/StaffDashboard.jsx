
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PricingOptimizer from "./PricingOptimizer";

function StaffDashboard() {
  const [analytics, setAnalytics] = useState({});
  const [bookings, setBookings] = useState([]);
  const [showPricing, setShowPricing] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [analyticsRes, bookingsRes] = await Promise.all([
        axios.get("http://localhost:3000/api/staff/analytics", config),
        axios.get("http://localhost:3000/api/staff/bookings", config)
      ]);

      setAnalytics(analyticsRes.data);
      setBookings(bookingsRes.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) navigate("/staff-login");
    } finally {
      setLoading(false);
    }
  };

  // --- DATA PROCESSING FOR CHARTS ---
  // We use useMemo so this math only runs when 'bookings' actually changes
  const roomChartData = useMemo(() => {
    const counts = {};
    bookings.forEach(b => {
      // Only count confirmed bookings for accurate popularity
      // if (b.booking_status === 'confirmed') {
        counts[b.room_type] = (counts[b.room_type] || 0) + 1;
      // }
    });
    
    // Convert object { "Deluxe": 5, "Standard": 2 } into Recharts array format
    return Object.keys(counts).map(key => ({
      name: key,
      Bookings: counts[key]
    }));
  }, [bookings]);

// --- DATA PROCESSING FOR CHARTS ---
  
  // (Your existing roomChartData useMemo goes here...)

  // NEW: Pad the revenue timeline with zeros for missing days
  const revenueChartData = useMemo(() => {
    if (!analytics.revenue_trend) return [];

    // 1. Convert backend data into a dictionary for instant lookup
    // E.g., { "Feb 22": 5000, "Feb 23": 10000 }
    const revenueMap = {};
    analytics.revenue_trend.forEach(item => {
      // Postgres TO_CHAR sometimes adds extra spaces, so we trim them safely
      const cleanDate = item.date.trim().replace(/\s+/g, ' '); 
      revenueMap[cleanDate] = Number(item.daily_revenue);
    });

    // 2. Generate a perfect continuous array of the last 30 days
    const filledData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      
      const month = d.toLocaleString('en-US', { month: 'short' }); // "Feb"
      const day = d.getDate().toString().padStart(2, '0'); // "23" or "05"
      const dateStr = `${month} ${day}`;

      // 3. Push the real revenue if it exists, otherwise push 0
      filledData.push({
        date: dateStr,
        daily_revenue: revenueMap[dateStr] || 0 
      });
    }

    return filledData;
  }, [analytics.revenue_trend]);

  if (loading) return <div style={{ padding: "40px" }}>Loading Dashboard...</div>;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f3f4f6", minHeight: "100vh", padding: "40px" }}>
      
      {/* Top Navigation Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ margin: 0, color: "#111827" }}>Owner Dashboard</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={() => navigate("/rooms")} 
            style={actionButtonStyle}
          >
            Manage Rooms
          </button>
          <button 
            onClick={() => setShowPricing(!showPricing)} 
            style={{ ...actionButtonStyle, backgroundColor: "#2563eb", color: "white" }}
          >
            {showPricing ? "View Analytics" : "⚡ AI Pricing Optimizer"}
          </button>
        </div>
      </div>

      {showPricing ? (
        <PricingOptimizer />
      ) : (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          
          {/* KPI CARDS SECTION */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "40px" }}>
            
            <div style={cardStyle}>
              <h3 style={kpiLabelStyle}>Total Revenue</h3>
              <p style={kpiValueStyle}>₹{analytics.total_revenue?.toLocaleString() || 0}</p>
              <span style={{ color: "#059669", fontSize: "14px", fontWeight: "bold" }}>+ Direct Bookings</span>
            </div>

            <div style={cardStyle}>
              <h3 style={kpiLabelStyle}>Confirmed Bookings</h3>
              <p style={kpiValueStyle}>{analytics.confirmed_bookings || 0}</p>
            </div>

            <div style={cardStyle}>
              <h3 style={kpiLabelStyle}>Most Popular Room</h3>
              <p style={{ ...kpiValueStyle, fontSize: "24px" }}>
                {analytics.most_popular_room ? analytics.most_popular_room.room_type : "N/A"}
              </p>
            </div>
            
          </div>

        

          {/* CHARTS SECTION */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "40px" }}>
            
            {/* Chart 1: Revenue Over Time (Line Graph) */}
            <div style={{ ...cardStyle, height: "350px", display: "flex", flexDirection: "column" }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#374151" }}>Revenue (Last 30 Days)</h3>
              <div style={{ flexGrow: 1, minHeight: 0 }}>
                {revenueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [`₹${value}`, 'Revenue']}
                      />
                      <Line type="monotone" dataKey="daily_revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", height: "100%", justifyContent: "center", alignItems: "center", color: "#9ca3af" }}>
                    Not enough data for trend line.
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Room Popularity (Bar Chart) */}
            <div style={{ ...cardStyle, height: "350px", display: "flex", flexDirection: "column" }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#374151" }}>Room Popularity</h3>
              <div style={{ flexGrow: 1, minHeight: 0 }}>
                {roomChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roomChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip 
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="Bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", height: "100%", justifyContent: "center", alignItems: "center", color: "#9ca3af" }}>
                    No booking data available yet.
                  </div>
                )}
              </div>
            </div>
            
          </div>

          {/* RECENT BOOKINGS TABLE */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#374151" }}>Recent Bookings</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#6b7280" }}>
                    <th style={{ padding: "12px" }}>Guest Name</th>
                    <th style={{ padding: "12px" }}>Phone</th>
                    <th style={{ padding: "12px" }}>Room Type</th>
                    <th style={{ padding: "12px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.booking_id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "12px", fontWeight: "500", color: "#111827" }}>{b.guest_name}</td>
                      <td style={{ padding: "12px", color: "#4b5563" }}>{b.guest_phone}</td>
                      <td style={{ padding: "12px", color: "#4b5563" }}>{b.room_type}</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ 
                          padding: "4px 8px", 
                          borderRadius: "12px", 
                          fontSize: "12px", 
                          fontWeight: "bold",
                          backgroundColor: b.booking_status === 'confirmed' ? '#d1fae5' : '#fee2e2',
                          color: b.booking_status === 'confirmed' ? '#065f46' : '#991b1b'
                        }}>
                          {b.booking_status || 'Confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>
                        No bookings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// --- REUSABLE STYLES ---
const cardStyle = {
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
};

const kpiLabelStyle = {
  margin: "0 0 8px 0",
  fontSize: "14px",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em"
};

const kpiValueStyle = {
  margin: "0 0 8px 0",
  fontSize: "36px",
  fontWeight: "800",
  color: "#111827"
};

const actionButtonStyle = {
  padding: "10px 20px",
  backgroundColor: "white",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.2s"
};

export default StaffDashboard;