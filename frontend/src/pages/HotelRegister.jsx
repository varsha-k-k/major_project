import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function HotelRegister() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    hotel_name: "",
    location: "",
    address: "",
    contact_phone: "",
    contact_email: "",
    description: "",
    languages_supported: "",
    staff_name: "",
    staff_email: "",
    staff_password: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {

    try {

      await axios.post(
        "http://localhost:3000/api/hotels/register",
        form
      );

      alert("Hotel registered successfully");

      navigate("/staff-login");

    } catch (err) {

      console.error(err);

      alert("Registration failed");

    }

  };
  const handleLogin = () => {
    navigate("/staff-login");
  };
  return (
    <div style={{ padding: "40px" }}>

      <h2>Register Your Hotel</h2>

      <input name="hotel_name" placeholder="Hotel Name" onChange={handleChange} /><br /><br />

      <input name="location" placeholder="Location" onChange={handleChange} /><br /><br />

      <input name="address" placeholder="Address" onChange={handleChange} /><br /><br />

      <input name="contact_phone" placeholder="Phone" onChange={handleChange} /><br /><br />

      <input name="contact_email" placeholder="Email" onChange={handleChange} /><br /><br />

      <input name="description" placeholder="Description" onChange={handleChange} /><br /><br />

      <input name="languages_supported" placeholder="Languages Supported (e.g., English, Spanish)" onChange={handleChange} /><br /><br />

      <h3>Staff Account</h3>

      <input name="staff_name" placeholder="Staff Name" onChange={handleChange} /><br /><br />

      <input name="staff_email" placeholder="Staff Email" onChange={handleChange} /><br /><br />

      <input name="staff_password" type="password" placeholder="Password" onChange={handleChange} /><br /><br />

      <button onClick={handleSubmit}
        style={{
          padding: "12px 20px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold"
        }}>
        Register Hotel
      </button>
      
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <p>Already registered? 
          <button 
            onClick={handleLogin}
            style={{
              background: "none",
              border: "none",
              color: "#2196F3",
              cursor: "pointer",
              textDecoration: "underline",
              marginLeft: "5px",
              fontSize: "16px"
            }}>
            Login here
          </button>
        </p>
      </div>
    </div>
  );

}

export default HotelRegister;
