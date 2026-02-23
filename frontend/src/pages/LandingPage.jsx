// import { useNavigate } from "react-router-dom";

// function LandingPage() {
//   const navigate = useNavigate();

//   const handleGuest = () => {
//     navigate("/search");
//   };

//   const handleHotelOwner = () => {
//     navigate("/staff-login");
//   };

//   return (
//     <div style={{
//       display: "flex",
//       flexDirection: "column",
//       alignItems: "center",
//       justifyContent: "center",
//       height: "100vh",
//       backgroundColor: "#f5f5f5"
//     }}>
//       <h1>Welcome to the all in one Hotel System</h1>
//       <p>Please select your role:</p>
//       <div style={{ marginTop: "20px" }}>
//         <button
//           onClick={handleGuest}
//           style={{
//             padding: "10px 20px",
//             margin: "10px",
//             fontSize: "16px",
//             cursor: "pointer",
//             backgroundColor: "#007bff",
//             color: "white",
//             border: "none",
//             borderRadius: "5px"
//           }}
//         >
//           Guest
//         </button>
//         <button
//           onClick={handleHotelOwner}
//           style={{
//             padding: "10px 20px",
//             margin: "10px",
//             fontSize: "16px",
//             cursor: "pointer",
//             backgroundColor: "#28a745",
//             color: "white",
//             border: "none",
//             borderRadius: "5px"
//           }}
//         >
//           Hotel Owner
//         </button>
//       </div>
//     </div>
//   );
// }

// export default LandingPage;

import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#2d3748", margin: 0, padding: 0 }}>
      
      {/* --- NAVIGATION BAR --- */}
      <nav style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "20px 50px", 
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e2e8f0"
      }}>
        <div style={{ fontSize: "24px", fontWeight: "800", color: "#1a365d", letterSpacing: "-0.5px" }}>
          StayOS <span style={{ color: "#3182ce" }}>.</span>
        </div>
        <div>
          {/* Subtle link for the "guests" to find the directory */}
          <button 
            onClick={() => navigate("/search")} 
            style={navButtonStyle}
          >
            Explore Partner Hotels
          </button>
          
          <button 
            onClick={() => navigate("/staff-login")} 
            style={{...navButtonStyle, border: "1px solid #cbd5e0", padding: "8px 16px", borderRadius: "6px"}}
          >
            Owner Login
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header style={{ 
        textAlign: "center", 
        padding: "100px 20px", 
        backgroundColor: "#f7fafc",
        backgroundImage: "linear-gradient(180deg, #f7fafc 0%, #edf2f7 100%)"
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "56px", fontWeight: "800", color: "#1a202c", margin: "0 0 24px 0", lineHeight: "1.1" }}>
            Stop Paying 25% OTA Commissions.
          </h1>
          <p style={{ fontSize: "20px", color: "#4a5568", marginBottom: "40px", lineHeight: "1.6" }}>
            The all-in-one operating system for independent boutique hotels. Get your own white-labeled direct booking engine, powered by AI yield management.
          </p>
          
          <button 
            onClick={() => navigate("/register-hotel")} 
            style={{
              padding: "16px 32px", 
              fontSize: "18px", 
              fontWeight: "bold",
              backgroundColor: "#2b6cb0", 
              color: "#ffffff", 
              border: "none", 
              borderRadius: "8px", 
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(43, 108, 176, 0.2)",
              transition: "transform 0.2s"
            }}
          >
            Launch Your Booking Engine
          </button>
        </div>
      </header>

      {/* --- VALUE PROP / FEATURES SECTION --- */}
      <section style={{ padding: "80px 50px", backgroundColor: "#ffffff" }}>
        <h2 style={{ textAlign: "center", fontSize: "32px", marginBottom: "60px", color: "#1a202c" }}>
          Enterprise-Grade Tech. Built for Independents.
        </h2>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
          gap: "40px",
          maxWidth: "1200px",
          margin: "0 auto"
        }}>
          
          {/* Feature 1 */}
          <div style={featureCardStyle}>
            <div style={iconStyle}>📈</div>
            <h3 style={featureTitleStyle}>AI Yield Management</h3>
            <p style={featureTextStyle}>
              Our dynamic pricing algorithm analyzes booking velocity and capacity to automatically surge prices during peak demand, maximizing your revenue.
            </p>
          </div>

          {/* Feature 2 */}
          <div style={featureCardStyle}>
            <div style={iconStyle}>🤖</div>
            <h3 style={featureTitleStyle}>AI Receptionist</h3>
            <p style={featureTextStyle}>
              Stop losing bookings while you sleep. Our embedded AI chatbot answers guest queries, checks PostgreSQL inventory, and secures bookings 24/7.
            </p>
          </div>

          {/* Feature 3 */}
          <div style={featureCardStyle}>
            <div style={iconStyle}>💰</div>
            <h3 style={featureTitleStyle}>Zero-Commission Direct</h3>
            <p style={featureTextStyle}>
              Generate a custom, white-labeled booking link for your Instagram bio and Google Maps. You keep 100% of the revenue you generate.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}

// --- REUSABLE STYLES ---
const navButtonStyle = {
  background: "none",
  border: "none",
  color: "#4a5568",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
  marginRight: "20px"
};

const featureCardStyle = {
  padding: "30px",
  backgroundColor: "#f7fafc",
  borderRadius: "12px",
  border: "1px solid #e2e8f0"
};

const iconStyle = {
  fontSize: "40px",
  marginBottom: "20px"
};

const featureTitleStyle = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#2d3748",
  marginBottom: "12px",
  marginTop: "0"
};

const featureTextStyle = {
  fontSize: "16px",
  color: "#718096",
  lineHeight: "1.6"
};

export default LandingPage;