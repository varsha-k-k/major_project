import { Routes, Route } from "react-router-dom";

import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import HotelSearch from "./pages/HotelSearch";
import HotelPage from "./pages/HotelPage";
import HotelRegister from "./pages/HotelRegister";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HotelSearch />} />
      <Route path="/hotel/:slug" element={<HotelPage />} />
      <Route path="/register-hotel" element = {<HotelRegister />} />
      <Route path="/staff-login" element={<StaffLogin />} />
      <Route path="/dashboard" element={<StaffDashboard />} />
    </Routes>
  );
}

export default App;
