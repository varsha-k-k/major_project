
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

function StaffDashboard() {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("analytics"); // 'analytics' or 'pricing'
  const [loading, setLoading] = useState(true);
  
  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState("30");
  
  // Pricing State
  const [recommendations, setRecommendations] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics();
    } else if (activeTab === "pricing") {
      fetchPricingRecommendations();
    }
  }, [activeTab, period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`http://localhost:3000/api/staff/analytics?period=${period}`, config);
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) navigate("/staff-login");
    } finally {
      setLoading(false);
    }
  };

  const fetchPricingRecommendations = async () => {
    setPricingLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:3000/api/pricing/recommendations?days=7`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    } finally {
      setPricingLoading(false);
    }
  };

  const handleApplyPrice = async (roomId, newPrice, targetDate) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:3000/api/pricing/apply", {
        room_id: roomId,
        new_price: newPrice,
        target_date: targetDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("✅ New price successfully applied to the database!");
      fetchPricingRecommendations(); // Refresh list
    } catch (err) {
      alert("❌ Error applying price: " + err.message);
    }
  };

  // --- CHART DATA PREP ---
  const revenueTrendData = useMemo(() => {
    if (!analytics?.revenue_trend) return [];
    const revenueMap = {};
    analytics.revenue_trend.forEach(item => {
      const cleanDate = item.date.trim().replace(/\s+/g, ' '); 
      revenueMap[cleanDate] = Number(item.daily_revenue);
    });
    const filledData = [];
    const days = parseInt(period) > 30 ? 30 : parseInt(period) || 30; 
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const month = d.toLocaleString('en-US', { month: 'short' });
      const day = d.getDate().toString().padStart(2, '0');
      const dateStr = `${month} ${day}`;
      filledData.push({ date: dateStr, daily_revenue: revenueMap[dateStr] || 0 });
    }
    return filledData;
  }, [analytics?.revenue_trend, period]);

  if (loading && activeTab === "analytics") return <div style={{ padding: "40px" }}>Loading Dashboard...</div>;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      
      {/* --- TOP NAVIGATION BAR --- */}
      <header style={{ backgroundColor: "#1f2937", color: "white", padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          🏨 Hotel Command Center
        </h2>
        
        <div style={{ display: "flex", gap: "16px" }}>
          <button 
            onClick={() => setActiveTab("analytics")} 
            style={activeTab === "analytics" ? activeNavStyle : defaultNavStyle}
          >
            📊 Analytics
          </button>
          
          <button 
            onClick={() => setActiveTab("pricing")} 
            style={activeTab === "pricing" ? activeNavStyle : defaultNavStyle}
          >
            ⚡ AI Pricing
          </button>
          
          {/* THIS LINKS BACK TO YOUR ROOM MANAGEMENT PAGE */}
          <button 
            onClick={() => navigate("/rooms")} 
            style={{...defaultNavStyle, backgroundColor: "#059669", color: "white", borderColor: "#059669"}}
          >
            🛏️ Manage Rooms
          </button>

          <button 
            onClick={() => { localStorage.removeItem("token"); navigate("/staff-login"); }} 
            style={{...defaultNavStyle, color: "#fca5a5", borderColor: "#fca5a5"}}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* ==========================================
            TAB 1: ANALYTICS DASHBOARD
            ========================================== */}
        {activeTab === "analytics" && analytics && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>

            {/* KEY METRICS SECTION */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "30px" }}>
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>💰 Total Revenue</div>
                <div style={metricValueStyle}>₹{(analytics.summary.total_revenue || 0).toLocaleString()}</div>
                <div style={metricChangeStyle(analytics.comparison.revenue_change_percent)}>
                  {analytics.comparison.revenue_change_percent > 0 ? '↑' : analytics.comparison.revenue_change_percent < 0 ? '↓' : '−'} {analytics.comparison.revenue_change_percent}% vs last period
                </div>
              </div>

              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>🛏️ Occupancy Rate</div>
                <div style={metricValueStyle}>{analytics.key_metrics.occupancy_rate}%</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>{analytics.summary.confirmed_bookings} confirmed bookings</div>
              </div>

              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>📊 RevPAR</div>
                <div style={metricValueStyle}>₹{Number(analytics.key_metrics.revpar).toLocaleString()}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>Revenue per available room</div>
              </div>

              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>💵 ADR</div>
                <div style={metricValueStyle}>₹{Number(analytics.key_metrics.adr).toLocaleString()}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>Average daily rate</div>
              </div>

              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>📅 ALOS</div>
                <div style={metricValueStyle}>{analytics.key_metrics.alos}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>Avg Length of Stay (Nights)</div>
              </div>
            </div>

            {/* CHARTS SECTION */}
            <div style={{ ...cardStyle, height: "400px", marginBottom: "20px" }}>
              <h3 style={{ marginTop: 0, color: "#111827" }}>Revenue Trend ({period} Days)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} />
                  <YAxis tickFormatter={(val) => `₹${val}`} tick={{fontSize: 12}} />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Line type="monotone" dataKey="daily_revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ALERTS & RECOMMENDATIONS */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#111827" }}>💡 AI Insights & Recommendations</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {parseFloat(analytics.key_metrics.occupancy_rate) < 70 && (
                  <div style={alertStyle("warning")}> 
                    <strong>⚠️ Low Occupancy</strong>
                    <p>Your occupancy is {analytics.key_metrics.occupancy_rate}%. Consider running a discount campaign to fill empty rooms.</p>
                  </div>
                )}

                {parseFloat(analytics.key_metrics.cancellation_rate) > 20 && (
                  <div style={alertStyle("warning")}> 
                    <strong>⚠️ High Cancellations</strong>
                    <p>Cancellation rate is {analytics.key_metrics.cancellation_rate}%. Review your cancellation and refund policy.</p>
                  </div>
                )}

                {parseFloat(analytics.key_metrics.repeat_guest_rate) > 20 && (
                  <div style={alertStyle("success")}> 
                    <strong>✅ Great Guest Loyalty</strong>
                    <p>{analytics.key_metrics.repeat_guest_rate}% of your bookings are repeat customers. Excellent work!</p>
                  </div>
                )}

                {parseFloat(analytics.comparison.revenue_change_percent) > 5 && (
                  <div style={alertStyle("success")}> 
                    <strong>✅ Revenue is Growing</strong>
                    <p>Revenue is up {analytics.comparison.revenue_change_percent}% compared to the previous period!</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
              <div style={{ ...cardStyle, height: "350px", display: "flex", flexDirection: "column" }}>
                <h3 style={{ marginTop: 0, color: "#111827" }}>Revenue by Room Type</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.revenue_by_room_type || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="room_type" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ ...cardStyle, height: "350px", display: "flex", flexDirection: "column" }}>
                <h3 style={{ marginTop: 0, color: "#111827" }}>Bookings by Day of Week</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.peak_days || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day_of_week" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="bookings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}


        {/* ==========================================
            TAB 2: AI PRICING OPTIMIZER
            ========================================== */}
        {activeTab === "pricing" && (
          <div>
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                ⚡ AI Yield Management
              </h2>
              <p style={{ color: "#4b5563", marginTop: "5px" }}>
                The AI automatically analyzes occupancy, seasonality, and booking velocity to suggest optimal daily rates.
              </p>
            </div>

            {pricingLoading ? (
              <p>Calculating real-time market recommendations...</p>
            ) : recommendations.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: "60px 20px" }}>
                <h3 style={{ margin: 0, color: "#4b5563" }}>All prices are perfectly optimized.</h3>
                <p style={{ color: "#9ca3af" }}>Check back later for new demand fluctuations.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                {recommendations.map((rec, index) => (
                  <div key={index} style={{...cardStyle, borderTop: "4px solid #2563eb"}}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                      <span style={{ fontWeight: "bold", fontSize: "18px" }}>{rec.room_type || `Room ID: ${rec.room_id}`}</span>
                      <span style={{ backgroundColor: "#e0e7ff", color: "#1d4ed8", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                        {new Date(rec.target_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px", backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
                      <div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>Base Price</div>
                        <div style={{ fontSize: "18px", color: "#9ca3af", textDecoration: "line-through" }}>₹{rec.current_price || rec.base_price}</div>
                      </div>
                      <div style={{ fontSize: "24px" }}>➡️</div>
                      <div>
                        <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: "bold" }}>AI Recommended</div>
                        <div style={{ fontSize: "24px", color: "#111827", fontWeight: "bold" }}>₹{rec.recommended_price}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: "14px", color: "#4b5563", marginBottom: "20px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      <span>💡</span>
                      <span>{rec.reason || "Algorithm detected sudden demand spike for these dates."}</span>
                    </div>

                    <button 
                      onClick={() => handleApplyPrice(rec.room_id, rec.recommended_price, rec.target_date)}
                      style={{ width: "100%", padding: "12px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", transition: "background-color 0.2s" }}
                      onMouseOver={(e) => e.target.style.backgroundColor = "#1d4ed8"}
                      onMouseOut={(e) => e.target.style.backgroundColor = "#2563eb"}
                    >
                      Accept & Surge Price
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


           
        

      </main>

      
    </div>
  );
}

// --- STYLES ---
const defaultNavStyle = {
  background: "transparent",
  color: "#9ca3af",
  border: "1px solid #4b5563",
  padding: "8px 16px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "14px",
  transition: "all 0.2s"
};

const activeNavStyle = {
  ...defaultNavStyle,
  background: "#3b82f6",
  color: "white",
  borderColor: "#3b82f6"
};

const cardStyle = { backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" };
const metricCardStyle = { backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" };
const metricLabelStyle = { fontSize: "13px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" };
const metricValueStyle = { fontSize: "32px", fontWeight: "800", color: "#111827" };

const metricChangeStyle = (value) => ({
  fontSize: "12px",
  color: value > 0 ? "#059669" : value < 0 ? "#dc2626" : "#6b7280",
  fontWeight: "600",
  marginTop: "8px",
});

const alertStyle = (type) => ({
  backgroundColor: type === "warning" ? "#fef3c7" : "#d1fae5",
  border: `1px solid ${type === "warning" ? "#facc15" : "#10b981"}`,
  padding: "16px",
  borderRadius: "8px",
  color: type === "warning" ? "#92400e" : "#064e3b",
});

export default StaffDashboard;