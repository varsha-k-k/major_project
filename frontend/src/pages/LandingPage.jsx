import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  const handleGuest = () => {
    navigate("/search");
  };

  const handleHotelOwner = () => {
    navigate("/staff-login");
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      backgroundColor: "#f5f5f5"
    }}>
      <h1>Welcome to the all in one Hotel System</h1>
      <p>Please select your role:</p>
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={handleGuest}
          style={{
            padding: "10px 20px",
            margin: "10px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Guest
        </button>
        <button
          onClick={handleHotelOwner}
          style={{
            padding: "10px 20px",
            margin: "10px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Hotel Owner
        </button>
      </div>
    </div>
  );
}

export default LandingPage;