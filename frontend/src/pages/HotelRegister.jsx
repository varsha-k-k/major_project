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
    staff_name: "",
    staff_email: "",
    staff_password: "",
    license_file: null
  });

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setForm({
      ...form,
      [name]: type === 'file' ? files[0] : value
    });
  };
  const handleSubmit = async () => {

    try {
      const formData = new FormData();
      
      // Add all form fields to FormData
      Object.keys(form).forEach(key => {
        if (form[key] !== null && form[key] !== '') {
          formData.append(key, form[key]);
        }
      });

      await axios.post(
        "http://localhost:3000/api/hotels/register",
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
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
    <div style={{ 
      padding: "40px", 
      maxWidth: "400px", 
      margin: "50px auto",
      border: "1px solid #ddd",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>

      <h2 style={{ textAlign: "center" }}>Register Your Hotel</h2>

      <input 
        name="hotel_name" 
        placeholder="Hotel Name" 
        onChange={handleChange}
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
        name="location" 
        placeholder="Location" 
        onChange={handleChange}
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
        name="address" 
        placeholder="Address" 
        onChange={handleChange}
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
        name="contact_phone" 
        placeholder="Phone" 
        onChange={handleChange}
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
        name="contact_email" 
        placeholder="Email" 
        onChange={handleChange}
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
        name="description" 
        placeholder="Description" 
        onChange={handleChange}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "15px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          boxSizing: "border-box"
        }}
      />


      <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Hotel License Document:</label>
      <input 
        type="file" 
        name="license_file" 
        accept=".pdf,.jpg,.jpeg,.png" 
        onChange={handleChange}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "15px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          boxSizing: "border-box"
        }}
      />

      <h3 style={{ textAlign: "center", marginBottom: "15px" }}>Account Details</h3>

      <input 
        name="staff_name" 
        placeholder="Name" 
        onChange={handleChange}
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
        name="staff_email" 
        placeholder="Email" 
        onChange={handleChange}
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
        name="staff_password" 
        type="password" 
        placeholder="Password" 
        onChange={handleChange}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "15px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          boxSizing: "border-box"
        }}
      />

      <button onClick={handleSubmit}
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
