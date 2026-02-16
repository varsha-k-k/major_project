import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:3000/api/staff/login",
        { email, password }
      );

      // Store JWT token
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("email", email);

      alert("Login successful!");
      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Login failed");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div style={{ 
      padding: "40px", 
      maxWidth: "400px", 
      margin: "50px auto",
      border: "1px solid #ddd",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <h2 style={{ textAlign: "center" }}>Staff Login</h2>

      {error && (
        <div style={{ 
          color: "red", 
          marginBottom: "15px",
          padding: "10px",
          backgroundColor: "#ffe6e6",
          borderRadius: "4px"
        }}>
          {error}
        </div>
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyPress={handleKeyPress}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "15px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          boxSizing: "border-box"
        }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyPress={handleKeyPress}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "15px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          boxSizing: "border-box"
        }}
      />

      <button
        onClick={handleLogin}
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold"
        }}
      >
        Login
      </button>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <p>Don't have an account? 
          <a 
            href="/register-hotel" 
            style={{ color: "#2196F3", marginLeft: "5px", textDecoration: "none" }}
          >
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}

export default StaffLogin;
